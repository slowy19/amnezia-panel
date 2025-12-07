import { z } from 'zod';

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import type { ProtocolsFilter } from '@/server/enums';
import type { Prisma } from 'prisma/generated/client';
import { createClientSchema, updateClientSchema } from '@/lib/schemas/clients';
import { amneziaApiService } from '@/server/services/amnezia-api';
import { apiProtocolsMapping, protocolsApiMapping } from '@/lib/data/mappings';
import { encryptionService } from '@/server/services/encryption';
import type { IDevice } from '@/server/interfaces/amnezia-api';
import { logsService } from '@/server/services/logs';

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
});
