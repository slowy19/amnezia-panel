import { z } from 'zod';

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { logsService } from '@/server/services/logs';
import type { LevelTypesFilter } from '@/server/enums';
import type { LogTypes } from 'prisma/generated/enums';

export const serverRouter = createTRPCRouter({
    
    
    getLogs: publicProcedure
        .input(
            z.object({
                search: z.string().optional(),
                page: z.number().min(1),
                limit: z.string().min(25),
                levelType: z.string() as z.ZodType<LevelTypesFilter>,
                logType: z.string() as z.ZodType<LogTypes>,
            })
        )
        .query(async ({ input }) => {
            return await logsService.getLogs(input);
        }),
});
