import { createCallerFactory, createTRPCRouter } from '@/server/api/trpc';
import { clientsRouter } from './routers/clients';
import { configsRouter } from './routers/configs';
import { serverRouter } from './routers/server';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    clients: clientsRouter,
    configs: configsRouter,
    server: serverRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
