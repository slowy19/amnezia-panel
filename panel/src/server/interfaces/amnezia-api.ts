import { z } from 'zod';

export type Protocol = 'amneziawg' | 'xray';

export interface IDevice {
    id: string;
    name: string;
    allowedIps: string[];
    lastHandshake: number;
    traffic: {
        received: number;
        sent: number;
    };
    endpoint: string;
    online: boolean;
    expiresAt: number;
    protocol: Protocol;
}

export interface IUser {
    username: string;
    devices: IDevice[];
}

export interface GetUsersResponse {
    total: number;
    items: IUser[];
}

export interface CreateUserResponse {
    message: string;
    client: {
        id: string;
        config: string;
        protocol: Protocol;
    };
}

export interface MessageResponse {
    message: string;
}

export interface GetServerResponse {
    id: string;
    region: string;
    weight: number;
    maxPeers: number;
    totalPeers: number;
    protocols: [Protocol, Protocol];
}

interface Clients {
    clientId: string;
    publicKey: string;
    userData: {
        clientName: string;
        creationDate: string;
        expiresAt: number;
    };
}

export interface ServerBackup {
    generatedAt: Date;
    serverId: string;
    protocols: [Protocol, Protocol];
    amnezia: {
        wgConfig: string;
        presharedKey: string;
        serverPublicKey: string;
        clients: Clients[];
    };
    xray: {
        serverConfig: string;
        uuid: string;
        publicKey: string;
        privateKey: string;
        shortId: string;
    };
}

const clientsSchema = z.object({
    clientId: z.string(),
    publicKey: z.string().optional(),
    userData: z.object({
        clientName: z.string(),
        creationDate: z.string(),
        expiresAt: z.number().optional(),
    }),
});

const amneziaSchema = z.object({
    wgConfig: z.string(),
    presharedKey: z.string(),
    serverPublicKey: z.string(),
    clients: z.array(clientsSchema),
});

const xraySchema = z.object({
    serverConfig: z.string(),
    uuid: z.string(),
    publicKey: z.string(),
    privateKey: z.string(),
    shortId: z.string(),
});

export const serverBackupSchema = z.object({
    generatedAt: z.string(),
    serverId: z.string(),
    protocols: z.array(z.string()),
    amnezia: amneziaSchema,
    xray: xraySchema,
});

export type ServerBackupZod = z.infer<typeof serverBackupSchema>;
