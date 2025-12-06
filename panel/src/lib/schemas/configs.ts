import { Protocols } from 'prisma/generated/enums';
import z from 'zod';

export const createConfigSchema = z.object({
    clientId: z.number().optional(),
    username: z.string().min(1).max(50),
    expiresAt: z.string().min(1),
    protocol: z.enum(Protocols),
});

export type createConfigFormData = z.infer<typeof createConfigSchema>;

export const updateClientConfigSchema = z.object({
    id: z.string(),
    clientId: z.number().min(1),
});

export type updateClientConfigFormData = z.infer<typeof updateClientConfigSchema>;
