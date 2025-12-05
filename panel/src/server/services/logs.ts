import { TRPCError } from '@trpc/server';
import type { LevelTypes, LogTypes } from 'prisma/generated/enums';
import { db } from '../db';
import type { LevelTypesFilter, LogTypesFilter } from '../enums';
import type { Prisma } from 'prisma/generated/client';

interface IGetLogs {
    search?: string;
    page: number;
    limit: string;
    levelType: LevelTypesFilter;
    logType: LogTypesFilter;
}

class LogsService {
    async createLog(logType: LogTypes, levelType: LevelTypes, message: string) {
        try {
            await db.logs.create({
                data: {
                    logType,
                    levelType,
                    message,
                },
            });
        } catch (error) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Create Log Error: ${error}`,
            });
        }
    }

    async getLogs(query: IGetLogs): Promise<{
        logs: {
            createdAt: Date;
            logType: LogTypes;
            levelType: LevelTypes;
            message: string;
        }[];
        totalItems: number;
    }> {
        try {
            const { search, page, limit, levelType, logType } = query;

            const numberLimit = Number(limit);
            const offset = (page - 1) * numberLimit;

            const whereConditions: Prisma.LogsWhereInput = {
                message: search
                    ? {
                          contains: search,
                          mode: 'insensitive',
                      }
                    : undefined,
            };

            if (levelType && levelType !== 'All') {
                whereConditions.levelType = levelType;
            }

            if (logType && logType !== 'All') {
                whereConditions.logType = logType;
            }

            const [logs, totalItems] = await Promise.all([
                db.logs.findMany({
                    where: whereConditions,
                    select: {
                        createdAt: true,
                        logType: true,
                        levelType: true,
                        message: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: numberLimit,
                    skip: offset,
                }),

                db.logs.count({
                    where: whereConditions,
                }),
            ]);

            return {
                logs,
                totalItems,
            };
        } catch (error) {
            this.createLog('SERVER', 'ERROR', 'Error in GET Logs');

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Logs Service Error: ${error}`,
            });
        }
    }
}

export const logsService = new LogsService();
