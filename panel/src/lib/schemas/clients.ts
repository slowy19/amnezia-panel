import z from 'zod';
import { createConfigSchema } from './configs';

export const createClientSchema = z.object({
    name: z.string().min(1).max(30),
    telegramId: z.string().optional(),
    configs: z.array(createConfigSchema),
});

export type createClientFormData = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
    id: z.number().min(1),
    name: z.string().min(1).max(30),
    telegramId: z.string().optional(),
});

export type updateClientFormData = z.infer<typeof updateClientSchema>;
