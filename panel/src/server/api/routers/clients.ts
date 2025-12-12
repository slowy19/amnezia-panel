import { z } from 'zod';

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import type { ProtocolsFilter } from '@/server/enums';
import type { Prisma } from 'prisma/generated/client';
import { createClientSchema, updateClientSchema } from '@/lib/schemas/clients';
import { amneziaApiService } from '@/server/services/amnezia-api';
import { apiProtocolsMapping, protocolsApiMapping, protocolsMapping } from '@/lib/data/mappings';
import { encryptionService } from '@/server/services/encryption';
import type { IDevice } from '@/server/interfaces/amnezia-api';
import { logsService } from '@/server/services/logs';
import { TRPCError } from '@trpc/server';
import { telegramService } from '@/server/services/telegram';
import { format } from 'date-fns';

export const clientsRouter = createTRPCRouter({
    getClients: publicProcedure.query(async ({ ctx }) => {
        return await ctx.db.clients.findMany({
            select: { id: true, name: true },
        });
    }),
    getClientsWithConfigs: publicProcedure
        .input(
            z.object({
                search: z.string().optional(),
                protocolFilter: z.string() as z.ZodType<ProtocolsFilter>,
            })
        )
        .query(async ({ ctx, input }) => {
            const { search, protocolFilter } = input;

            const whereConditions: Prisma.ConfigsWhereInput = {
                username: search
                    ? {
                          contains: search,
                          mode: 'insensitive',
                      }
                    : undefined,
            };

            if (protocolFilter && protocolFilter !== 'All') {
                whereConditions.protocol = protocolFilter;
            }

            const [configs, clients, apiConfigs] = await Promise.all([
                ctx.db.configs.findMany({
                    where: whereConditions,
                    select: {
                        id: true,
                        createdAt: true,
                        username: true,
                        expiresAt: true,
                        protocol: true,
                        clientId: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                }),

                ctx.db.clients.findMany({
                    select: {
                        id: true,
                        createdAt: true,
                        name: true,
                        telegramId: true,
                        _count: {
                            select: {
                                Configs: {
                                    where: whereConditions,
                                },
                            },
                        },
                    },
                    orderBy: {
                        name: 'asc',
                    },
                }),

                amneziaApiService.getConfigs(),
            ]);

            const apiDevicesMap = new Map<string, IDevice>();

            for (const user of apiConfigs.items) {
                for (const device of user.devices) {
                    apiDevicesMap.set(device.id, device);
                }
            }

            const mergedConfigs = configs.map((config) => {
                const apiDevice = apiDevicesMap.get(config.id);

                if (apiDevice) {
                    return {
                        ...config,
                        online: apiDevice.online,
                        lastHandshake: String(apiDevice.lastHandshake),
                        traffic: apiDevice.traffic,
                        allowedIps: apiDevice.allowedIps,
                        endpoint: apiDevice.endpoint,
                        expiresAt: String(apiDevice.expiresAt) || config.expiresAt,
                        protocol: apiProtocolsMapping[apiDevice.protocol],
                        username: config.username,
                        createdAt: config.createdAt,
                        clientId: config.clientId,
                    };
                }

                return {
                    ...config,
                    online: false,
                    lastHandshake: null,
                    traffic: { received: 0, sent: 0 },
                    allowedIps: [],
                    endpoint: null,
                };
            });

            const dbConfigIds = new Set(configs.map((c) => c.id));

            for (const user of apiConfigs.items) {
                for (const device of user.devices) {
                    if (!dbConfigIds.has(device.id)) {
                        mergedConfigs.push({
                            id: device.id,
                            createdAt: new Date(),
                            username: user.username,
                            expiresAt: device.expiresAt ? String(device.expiresAt) : null,
                            protocol: apiProtocolsMapping[device.protocol],
                            clientId: null,
                            online: device.online,
                            lastHandshake: String(device.lastHandshake),
                            traffic: device.traffic,
                            allowedIps: device.allowedIps,
                            endpoint: device.endpoint,
                        });
                    }
                }
            }

            const clientsWithConfigs = clients.map((client) => ({
                id: client.id,
                createdAt: client.createdAt,
                name: client.name,
                telegramId: client.telegramId,
                configs: mergedConfigs.filter((config) => config.clientId === client.id),
                configsCount: client._count.Configs,
            }));

            const orphanConfigs = mergedConfigs.filter((config) => !config.clientId);

            return {
                clients: clientsWithConfigs,
                orphanConfigs,
            };
        }),

    createClient: publicProcedure.input(createClientSchema).mutation(async ({ ctx, input }) => {
        const { name, telegramId, configs } = input;

        const createdClient = await ctx.db.clients.create({
            data: { name, telegramId },
        });

        for (const config of configs) {
            const createdConfig = await amneziaApiService.createConfig(
                config.username,
                protocolsApiMapping[config.protocol],
                Number(config.expiresAt)
            );

            const encryptedVpnKey = encryptionService.encrypt(createdConfig.client.config);

            await ctx.db.configs.create({
                data: {
                    id: createdConfig.client.id,
                    username: config.username,
                    vpnKey: encryptedVpnKey,
                    protocol: config.protocol,
                    expiresAt: config.expiresAt,
                    clientId: createdClient.id,
                },
            });

            await logsService.createLog('CLIENT', 'INFO', `Config ${config.username} created`);
        }

        await logsService.createLog('CLIENT', 'INFO', `Client ${createdClient.name} created`);
    }),

    updateClient: publicProcedure.input(updateClientSchema).mutation(async ({ ctx, input }) => {
        const { id, name, telegramId } = input;

        const updatedClient = await ctx.db.clients.update({
            where: { id },
            data: { name, telegramId },
            select: { name: true },
        });

        await logsService.createLog('CLIENT', 'INFO', `Client ${updatedClient.name} updated`);
    }),

    deleteClient: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const { id } = input;

            const foundConfigs = await ctx.db.configs.findMany({
                where: { clientId: id },
                select: { id: true, protocol: true },
            });

            for (const config of foundConfigs) {
                await amneziaApiService.deleteConfig(
                    config.id,
                    protocolsApiMapping[config.protocol]
                );
            }

            await ctx.db.configs.deleteMany({
                where: { clientId: id },
            });

            const deletedClient = await ctx.db.clients.delete({
                where: { id },
                select: { name: true },
            });

            await logsService.createLog(
                'CLIENT',
                'WARNING',
                `Client ${deletedClient.name} deleted`
            );
        }),

    sendKeysForClient: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const { id } = input;

            const foundClient = await ctx.db.clients.findUnique({
                where: { id },
                select: {
                    name: true,
                    telegramId: true,
                    Configs: {
                        select: {
                            vpnKey: true,
                            username: true,
                            protocol: true,
                            expiresAt: true,
                        },
                    },
                },
            });

            if (!foundClient || !foundClient.telegramId)
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });

            if (foundClient.Configs.length === 0) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'No VPN configurations found for this client',
                });
            }

            const messages = foundClient.Configs.map((config) => {
                const decryptedVpnKey = encryptionService.decryptField(config.vpnKey);
                const expiryDate = config.expiresAt
                    ? format(new Date(Number(config.expiresAt) * 1000), 'MM/dd/yyyy')
                    : 'Not set';

                return `
Configuration for <b>${config.username.startsWith(foundClient.name) ? config.username.split('-')[1] : config.username}</b>
Protocol: <b>${protocolsMapping[config.protocol] || 'Not specified'}</b>
Expiration date: <b>${expiryDate}</b>
<code>${decryptedVpnKey}</code>
─────────────────────`;
            });

            const header = `🔐 <b>VPN configurations from ${process.env.NEXT_PUBLIC_VPN_NAME}</b>\n\n`;
            const footer = `\n\n📦 Total configurations: ${foundClient.Configs.length}`;

            const fullMessage = header + messages.join('\n') + footer;

            if (fullMessage.length > 4096) {
                await telegramService.sendInParts(foundClient.telegramId, fullMessage, footer);
            } else {
                await telegramService.sendMessage({
                    chatId: foundClient.telegramId,
                    text: fullMessage,
                    parseMode: 'HTML',
                });
            }

            await logsService.createLog(
                'TELEGRAM',
                'INFO',
                `VPN keys sent for client ${foundClient.name}`
            );
        }),

    sendAllKeys: publicProcedure.mutation(async ({ ctx }) => {
        const foundClients = await ctx.db.clients.findMany({
            select: {
                name: true,
                telegramId: true,
                Configs: {
                    select: {
                        vpnKey: true,
                        username: true,
                        protocol: true,
                        expiresAt: true,
                    },
                },
            },
        });

        if (!foundClients) throw new TRPCError({ code: 'NOT_FOUND', message: 'Clients not found' });

        for (const foundClient of foundClients) {
            if (foundClient.Configs.length === 0 || !foundClient.telegramId) {
                await logsService.createLog(
                    'TELEGRAM',
                    'WARNING',
                    `VPN keys not sent for client ${foundClient.name}`
                );
                continue;
            }

            const messages = foundClient.Configs.map((config) => {
                const decryptedVpnKey = encryptionService.decryptField(config.vpnKey);
                const expiryDate = config.expiresAt
                    ? format(new Date(Number(config.expiresAt) * 1000), 'MM/dd/yyyy')
                    : 'Not set';

                return `
Configuration for <b>${config.username.startsWith(foundClient.name) ? config.username.split('-')[1] : config.username}</b>
Protocol: <b>${protocolsMapping[config.protocol] || 'Not specified'}</b>
Expiration date: <b>${expiryDate}</b>
<code>${decryptedVpnKey}</code>
─────────────────────`;
            });

            const header = `🔐 <b>VPN configurations from ${process.env.NEXT_PUBLIC_VPN_NAME}</b>\n\n`;
            const footer = `\n\n📦 Total configurations: ${foundClient.Configs.length}`;

            const fullMessage = header + messages.join('\n') + footer;

            if (fullMessage.length > 4096) {
                await telegramService.sendInParts(foundClient.telegramId, fullMessage, footer);
            } else {
                await telegramService.sendMessage({
                    chatId: foundClient.telegramId,
                    text: fullMessage,
                    parseMode: 'HTML',
                });
            }
        }

        await logsService.createLog('TELEGRAM', 'INFO', `VPN keys sent for clients`);
    }),

    sendDownloadLinks: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const { id } = input;

            const foundClient = await ctx.db.clients.findUnique({
                where: { id },
                select: { telegramId: true, name: true },
            });
            if (!foundClient?.telegramId)
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });

            const message = `For using <b>${process.env.NEXT_PUBLIC_VPN_NAME}</b> you need download the open-source AmneziaVPN app.

<b>💻 Computers & Laptops</b>
• <a href="https://github.com/amnezia-vpn/amnezia-client/releases/download/4.8.11.4/AmneziaVPN_4.8.11.4_x64.exe">Windows</a> 
• <a href="https://github.com/amnezia-vpn/amnezia-client/releases/download/4.8.11.4/AmneziaVPN_4.8.11.4_macos.zip">macOS</a> 
• <a href="https://github.com/amnezia-vpn/amnezia-client/releases/download/4.8.11.4/AmneziaVPN_4.8.11.4_linux_x64.tar.zip">Linux</a>
• <a href="https://docs.amnezia.org/documentation/installing-app-on-linux">Linux docs</a>

<b>📱 Smartphones & Tablets</b>
• <a href="https://play.google.com/store/apps/details?id=org.amnezia.vpn">Android</a>
• <a href="https://apps.apple.com/us/app/amneziavpn/id1600529900">iPhone / iPad</a>`;

            await telegramService.sendMessage({
                chatId: foundClient.telegramId,
                text: message,
                parseMode: 'HTML',
            });

            await logsService.createLog('TELEGRAM', 'INFO', `Links sent for client ${foundClient.name}`)
        }),
});
