import type { SendMessageParams, TelegramMessageResponse } from '@/server/interfaces/telegram';
import { TRPCError, type TRPC_ERROR_CODE_KEY } from '@trpc/server';
import { logsService } from '../logs';

class TelegramService {
    private readonly baseUrl: string;
    private readonly maxRetries = 3;
    private readonly retryDelay = 1000;

    constructor() {
        this.baseUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
    }

    private getFetchOptions(method: string = 'POST'): RequestInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'User-Agent': 'TelegramBotClient/1.0',
        };

        return {
            method,
            headers,
        };
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private getTrpcErrorCodeFromTelegram(
        description: string,
        errorCode?: number
    ): TRPC_ERROR_CODE_KEY {
        if (errorCode === 403) {
            return 'FORBIDDEN';
        }

        if (errorCode === 400) {
            if (
                description.includes('chat not found') ||
                description.includes('user not found') ||
                description.includes('PEER_ID_INVALID')
            ) {
                return 'NOT_FOUND';
            }
            return 'BAD_REQUEST';
        }

        if (description.includes('Too Many Requests')) {
            return 'TOO_MANY_REQUESTS';
        }

        return 'INTERNAL_SERVER_ERROR';
    }

    private async makeRequestWithRetry<T>(
        endpoint: string,
        options: RequestInit,
        body?: any
    ): Promise<T> {
        if (process.env.NEXT_PUBLIC_USES_TELEGRAM_BOT !== 'true')
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not found Bot Token' });

        const url = `${this.baseUrl}/${endpoint}`;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const fetchOptions: RequestInit = {
                    ...options,
                    body: body ? JSON.stringify(body) : undefined,
                };

                const response = await fetch(url, fetchOptions);
                const data = await response.json();

                if (!data.ok) {
                    const errorCode = data.error_code || 500;
                    const description = data.description || 'Unknown Telegram error';

                    const trpcErrorCode = this.getTrpcErrorCodeFromTelegram(description, errorCode);

                    let userMessage = description;

                    if (errorCode === 403) {
                        userMessage = 'Bot was blocked by the user or user is deactivated';
                    } else if (errorCode === 400) {
                        if (
                            description.includes('chat not found') ||
                            description.includes('user not found') ||
                            description.includes('PEER_ID_INVALID')
                        ) {
                            userMessage = 'User has not started the bot or chat not found';
                        }
                    }

                    throw new TRPCError({
                        code: trpcErrorCode,
                        message: userMessage,
                    });
                }

                return data.result as T;
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }

                if (attempt === this.maxRetries) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: `Telegram API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    });
                }

                await this.sleep(this.retryDelay * attempt);
            }
        }

        throw new TRPCError({
            code: 'TIMEOUT',
            message: 'Telegram API request failed after maximum retries',
        });
    }

    async sendMessage(params: SendMessageParams, clientName: string): Promise<TelegramMessageResponse> {
        try {
            return await this.makeRequestWithRetry<TelegramMessageResponse>(
                'sendMessage',
                this.getFetchOptions(),
                {
                    chat_id: params.chatId,
                    text: params.text,
                    parse_mode: params.parseMode || 'HTML',
                    disable_web_page_preview: params.disableWebPagePreview || false,
                    disable_notification: params.disableNotification || false,
                    reply_to_message_id: params.replyToMessageId,
                    reply_markup: params.replyMarkup,
                }
            );
        } catch (error) {
            await logsService.createLog(
                'TELEGRAM',
                'ERROR',
                `Failed to send Telegram message for client ${clientName}: ${error instanceof TRPCError || error instanceof Error ? error.message : 'Unknown error'}`
            );

            if (error instanceof TRPCError) {
                throw error;
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to send Telegram message for client ${clientName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }

    async sendDocument(params: {
        chatId: string | number;
        document: string | File;
        caption?: string;
        parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
        disableNotification?: boolean;
        replyToMessageId?: number;
    }, clientName: string): Promise<any> {
        try {
            return await this.makeRequestWithRetry('sendDocument', this.getFetchOptions(), {
                chat_id: params.chatId,
                document: params.document,
                caption: params.caption,
                parse_mode: params.parseMode,
                disable_notification: params.disableNotification,
                reply_to_message_id: params.replyToMessageId,
            });
        } catch (error) {
            await logsService.createLog(
                'TELEGRAM',
                'ERROR',
                `Failed to send document for client ${clientName}: ${error instanceof TRPCError || error instanceof Error ? error.message : 'Unknown error'}`
            );

            if (error instanceof TRPCError) {
                throw error;
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to send document for client ${clientName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }

    async getMe(): Promise<any> {
        try {
            return await this.makeRequestWithRetry('getMe', this.getFetchOptions('GET'));
        } catch (error) {
            await logsService.createLog(
                'TELEGRAM',
                'ERROR',
                `Failed to get bot info: ${error instanceof TRPCError || error instanceof Error ? error.message : 'Unknown error'}`
            );

            if (error instanceof TRPCError) {
                throw error;
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to get bot info: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }
}

export const telegramService = new TelegramService();
