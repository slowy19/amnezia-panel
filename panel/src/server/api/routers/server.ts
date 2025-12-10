import { z } from 'zod';

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { logsService } from '@/server/services/logs';
import type { LevelTypesFilter } from '@/server/enums';
import type { LogTypes } from 'prisma/generated/enums';
import { amneziaApiService } from '@/server/services/amnezia-api';
import { serverBackupSchema } from '@/server/interfaces/amnezia-api';
import { TRPCError } from '@trpc/server';

export const serverRouter = createTRPCRouter({
    getServer: publicProcedure.query(async () => {
        return await amneziaApiService.getServer();
    }),

    getLogs: publicProcedure
        .input(
            z.object({
                search: z.string().optional(),
                page: z.number().min(1),
                limit: z.string(),
                levelType: z.string() as z.ZodType<LevelTypesFilter>,
                logType: z.string() as z.ZodType<LogTypes>,
            })
        )
        .query(async ({ input }) => {
            return await logsService.getLogs(input);
        }),

    downloadBackup: publicProcedure.mutation(async () => {
        const backup = await amneziaApiService.getServerBackup();

        const jsonString = JSON.stringify(backup, null, 2);

        const buffer = Buffer.from(jsonString, 'utf-8');
        const base64Content = buffer.toString('base64');

        await logsService.createLog('SERVER', 'INFO', 'Server backup was downloaded successfully');

        return {
            filename: 'server-backup.json',
            content: base64Content,
            mimeType: 'application/json',
        };
    }),
    importBackup: publicProcedure
        .input(z.object({ fileContent: z.string() }))
        .mutation(async ({ input }) => {
            const { fileContent } = input;

            const backupFile = await (async () => {
                try {
                    const parsed = JSON.parse(fileContent);
                    return serverBackupSchema.parse(parsed);
                } catch {
                    await logsService.createLog('SERVER', 'ERROR', 'Server backup was not parsed');
                    
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Invalid Backup file',
                    });
                }
            })();

            await amneziaApiService.importServerBackup(backupFile);

            await logsService.createLog(
                'SERVER',
                'INFO',
                'Server backup was imported successfully'
            );
        }),

    rebootServer: publicProcedure.mutation(async () => {
        await logsService.createLog('SERVER', 'WARNING', 'Server was rebooted');

        await amneziaApiService.rebootServer();
    }),
});
