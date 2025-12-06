export type Protocol = 'amneziawg' | 'xray';

interface IDevice {
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

interface IUser {
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
    protocols: string[];
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
