import { z } from 'zod';

export type Protocol = 'amneziawg' | 'amneziawg3' | 'xray';

export interface IPeer {
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
    status: string;
}

export interface IClient {
    username: string;
    peers: IPeer[];
}

export interface GetClientsResponse {
    total: number;
    items: IClient[];
}

export interface CreateClientResponse {
    message: string;
    client: {
        id: string;
        config: string;
        protocol: Protocol;
    };
}

export interface IGenerateQrCodeResponse {
    total: number;
    items: string[];
}

export interface MessageResponse {
    message: string;
}

export interface GetServerInfoResponse {
    id: string;
    region: string;
    weight: number;
    maxPeers: number;
    totalPeers: number;
    protocols: Protocol[];
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
    protocols: Protocol[];
    amnezia?: {
        wgConfig: string;
        presharedKey: string;
        serverPublicKey: string;
        clients: Clients[];
    };
    amneziaWg3?: {
        wgConfig: string;
        presharedKey: string;
        serverPublicKey: string;
        clients: Clients[];
    };
    xray?: {
        serverConfig: string;
        uuid: string;
        publicKey: string;
        privateKey: string;
        shortId: string;
    };
}

interface CpuInfo {
    cores: number;
}

interface MemoryInfo {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
}

interface DiskInfo {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    usedPercent: number;
}

interface NetworkInfo {
    rxBytes: number;
    txBytes: number;
}

interface DockerInfo {
    containers: ContainerInfo[];
}

interface ContainerInfo {
    name: string;
    cpuPercent: number;
    memUsageBytes: number;
    memLimitBytes: number;
    netRxBytes: number;
    netTxBytes: number;
    pids: number;
}

export interface GetServerLoadResponse {
    timestamp: string;
    uptimeSec: number;
    loadavg: [number, number, number];
    cpu: CpuInfo;
    memory: MemoryInfo;
    disk: DiskInfo;
    network: NetworkInfo;
    docker: DockerInfo;
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
    amnezia: amneziaSchema.optional(),
    amneziaWg3: amneziaSchema.optional(),
    xray: xraySchema.optional(),
});

export type ServerBackupZod = z.infer<typeof serverBackupSchema>;
