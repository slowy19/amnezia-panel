import { getTrpcErrorCode } from '@/lib/utils';
import { TRPCError } from '@trpc/server';
import { logsService } from './logs';
import type {
    CreateUserResponse,
    GetServerResponse,
    GetUsersResponse,
    MessageResponse,
    Protocol,
    ServerBackup,
} from '../interfaces/amnezia-api';

class AmneziaApiService {
    private readonly baseUrl: string;
    private readonly apiKey: string;

    private readonly maxRetries = 3;
    private readonly retryDelay = 1000;

    constructor() {
        this.baseUrl = `http://${process.env.AMNEZIA_API_HOST}:${process.env.AMNEZIA_API_PORT}/`; // change
        this.apiKey = process.env.AMNEZIA_API_KEY!;
    }

    private getFetchOptions(method: string): RequestInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
        };

        return {
            method,
            headers,
        };
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private async makeRequestWithRetry<T>(
        endpoint: string,
        options: RequestInit,
        body?: any,
        query?: Record<string, string | number | boolean>
    ): Promise<T> {
        let url = `${this.baseUrl}/${endpoint}`;
        if (query) {
            const queryString = new URLSearchParams();
            for (const [key, value] of Object.entries(query)) {
                queryString.append(key, String(value));
            }
            url += `?${queryString.toString()}`;
        }

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const fetchOptions: RequestInit = {
                    ...options,
                    body: body ? JSON.stringify(body) : undefined,
                };

                const response = await fetch(url, fetchOptions);

                if (!response.ok) {
                    if (response.status === 400) {
                        throw new TRPCError({
                            code: getTrpcErrorCode(response.status),
                            message: 'Amnezia API error: Uncorrected request',
                        });
                    }

                    if (response.status === 401) {
                        throw new TRPCError({
                            code: getTrpcErrorCode(response.status),
                            message: 'Amnezia API error: Authentication failed',
                        });
                    }

                    if (response.status === 403) {
                        throw new TRPCError({
                            code: getTrpcErrorCode(response.status),
                            message: 'Amnezia API error: Forbidden',
                        });
                    }

                    if (response.status === 404) {
                        throw new TRPCError({
                            code: getTrpcErrorCode(response.status),
                            message: 'Amnezia API error: Not found',
                        });
                    }

                    if (response.status === 409) {
                        throw new TRPCError({
                            code: getTrpcErrorCode(response.status),
                            message: 'Amnezia API error: Conflict',
                        });
                    }

                    const errorText = await response.text();

                    throw new TRPCError({
                        code: getTrpcErrorCode(response.status),
                        message: `Amnezia API error: ${errorText}`,
                    });
                }

                const data = await response.json();
                return data.result as T;
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }

                if (attempt === this.maxRetries) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: `Amnezia API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    });
                }

                await this.sleep(this.retryDelay * attempt);
            }
        }

        throw new TRPCError({
            code: 'TIMEOUT',
            message: 'Amnezia API request failed after maximum retries',
        });
    }

    async getConfigs(skip: number = 0, limit: number = 500): Promise<GetUsersResponse> {
        try {
            return await this.makeRequestWithRetry<GetUsersResponse>(
                'users',
                this.getFetchOptions('GET'),
                undefined,
                { skip, limit }
            );
        } catch (error) {
            await logsService.createLog(
                'SERVER',
                'ERROR',
                `Failed to get configs: ${error instanceof TRPCError || error instanceof Error ? error.message : 'Unknown error'}`
            );

            if (error instanceof TRPCError) {
                throw error;
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to get configs: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }

    async createConfig(
        clientName: string,
        protocol: Protocol,
        expiresAt: number
    ): Promise<CreateUserResponse> {
        try {
            return await this.makeRequestWithRetry<CreateUserResponse>(
                'users',
                this.getFetchOptions('POST'),
                {
                    clientName,
                    protocol,
                    expiresAt,
                }
            );
        } catch (error) {
            await logsService.createLog(
                'SERVER',
                'ERROR',
                `Failed to create config: ${error instanceof TRPCError || error instanceof Error ? error.message : 'Unknown error'}`
            );

            if (error instanceof TRPCError) {
                throw error;
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to create config: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }

    async deleteConfig(clientId: string, protocol: Protocol): Promise<MessageResponse> {
        try {
            return await this.makeRequestWithRetry<MessageResponse>(
                'users',
                this.getFetchOptions('DELETE'),
                {
                    clientId,
                    protocol,
                }
            );
        } catch (error) {
            await logsService.createLog(
                'SERVER',
                'ERROR',
                `Failed to delete config: ${error instanceof TRPCError || error instanceof Error ? error.message : 'Unknown error'}`
            );

            if (error instanceof TRPCError) {
                throw error;
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to delete config: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }

    async getServer(): Promise<GetServerResponse> {
        try {
            return await this.makeRequestWithRetry<GetServerResponse>(
                'server',
                this.getFetchOptions('GET')
            );
        } catch (error) {
            await logsService.createLog(
                'SERVER',
                'ERROR',
                `Failed to get server: ${error instanceof TRPCError || error instanceof Error ? error.message : 'Unknown error'}`
            );

            if (error instanceof TRPCError) {
                throw error;
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to get server: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }

    async getServerBackup(): Promise<ServerBackup> {
        try {
            return await this.makeRequestWithRetry<ServerBackup>(
                'server/backup',
                this.getFetchOptions('GET')
            );
        } catch (error) {
            await logsService.createLog(
                'SERVER',
                'ERROR',
                `Failed to get server backup: ${error instanceof TRPCError || error instanceof Error ? error.message : 'Unknown error'}`
            );

            if (error instanceof TRPCError) {
                throw error;
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to get server backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }

    async importServerBackup(body: ServerBackup): Promise<ServerBackup> {
        try {
            return await this.makeRequestWithRetry<ServerBackup>(
                'server/backup',
                this.getFetchOptions('POST'),
                body
            );
        } catch (error) {
            await logsService.createLog(
                'SERVER',
                'ERROR',
                `Failed to import server backup: ${error instanceof TRPCError || error instanceof Error ? error.message : 'Unknown error'}`
            );

            if (error instanceof TRPCError) {
                throw error;
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to import server backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }

    async rebootServer(): Promise<MessageResponse> {
        try {
            return await this.makeRequestWithRetry<MessageResponse>(
                'server/reboot',
                this.getFetchOptions('POST')
            );
        } catch (error) {
            await logsService.createLog(
                'SERVER',
                'ERROR',
                `Failed to reboot server: ${error instanceof TRPCError || error instanceof Error ? error.message : 'Unknown error'}`
            );

            if (error instanceof TRPCError) {
                throw error;
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to reboot server: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }
}

export const amneziaApiService = new AmneziaApiService();
