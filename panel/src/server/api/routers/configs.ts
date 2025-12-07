import { z } from 'zod';

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { createConfigSchema, updateClientConfigSchema } from '@/lib/schemas/configs';
import { amneziaApiService } from '@/server/services/amnezia-api';
import { protocolsApiMapping } from '@/lib/data/mappings';
import { encryptionService } from '@/server/services/encryption';
import { TRPCError } from '@trpc/server';
import { logsService } from '@/server/services/logs';
import { Protocols } from 'prisma/generated/enums';

export const configsRouter = createTRPCRouter({
    createConfig: publicProcedure.input(createConfigSchema).mutation(async ({ ctx, input }) => {
        const { clientId, username, expiresAt, protocol } = input;

        const createdConfig = await amneziaApiService.createConfig(
            username,
            protocolsApiMapping[protocol],
            Number(expiresAt)
        );

        const encryptedVpnKey = encryptionService.encrypt(createdConfig.client.config);

        await ctx.db.configs.create({
            data: {
                id: createdConfig.client.id,
                clientId: Number(clientId) || null,
                username,
                expiresAt,
                protocol,
                vpnKey: encryptedVpnKey,
            },
        });

        await logsService.createLog('CLIENT', 'INFO', `Config ${username} created`);
    }),

    updateClientConfig: publicProcedure
        .input(updateClientConfigSchema)
        .mutation(async ({ ctx, input }) => {
            const { id, clientId } = input;

            const updatedConfig = await ctx.db.configs.update({
                where: { id },
                data: { clientId: Number(clientId) },
                select: { username: true },
            });

            await logsService.createLog(
                'CLIENT',
                'INFO',
                `Config ${updatedConfig.username} updated`
            );
        }),

    deleteConfig: publicProcedure
        .input(z.object({ id: z.string(), protocol: z.enum(Protocols) }))
        .mutation(async ({ ctx, input }) => {
            const { id, protocol } = input;

            const foundConfig = await ctx.db.configs.findUnique({
                where: { id },
                select: { protocol: true },
            });

            await amneziaApiService.deleteConfig(id, protocolsApiMapping[protocol]);

            let deletedConfig: {
                username: string;
            } | null = null;

            if (foundConfig) {
                deletedConfig = await ctx.db.configs.delete({
                    where: { id },
                    select: { username: true },
                });
            }

            await logsService.createLog(
                'CLIENT',
                'WARNING',
                `Config ${deletedConfig?.username || 'that does not exist in database'} deleted`
            );
        }),

    getVpnKey: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const { id } = input;

        const foundConfig = await ctx.db.configs.findUnique({
            where: { id },
            select: { vpnKey: true },
        });

        return await encryptionService.decryptField(foundConfig?.vpnKey);
    }),
});
