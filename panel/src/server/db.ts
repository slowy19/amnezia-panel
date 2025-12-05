import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@/env';
import { PrismaClient } from 'prisma/generated/client';

const createPrismaClient = () => {
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    });

    return new PrismaClient({
        adapter,
        log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
};

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
