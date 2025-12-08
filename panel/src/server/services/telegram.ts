import { getTrpcErrorCode } from '@/lib/utils';
import { TRPCError, type TRPC_ERROR_CODE_KEY } from '@trpc/server';
import type { SendMessageParams, TelegramMessageResponse } from '../interfaces/telegram';
import { logsService } from './logs';

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

    private getTelegramErrorCode(description: string): TRPC_ERROR_CODE_KEY {
        if (
            description.includes('bot was blocked by the user') ||
            description.includes('user is deactivated') ||
            description.includes('bot was kicked')
        ) {
            return 'FORBIDDEN';
        }

        if (description.includes('chat not found') || description.includes('user not found')) {
            return 'NOT_FOUND';
        }

        if (description.includes('Too Many Requests')) {
            return 'TOO_MANY_REQUESTS';
        }

        return 'BAD_REQUEST';
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

                if (!response.ok) {
                    if (response.status === 429) {
                        const retryAfter = response.headers.get('Retry-After');
                        const delay = retryAfter
                            ? Number(retryAfter) * 1000
                            : this.retryDelay * attempt;
                        await this.sleep(delay);
                        continue;
                    }

                    throw new TRPCError({
                        code: getTrpcErrorCode(response.status),
                        message: `Telegram API error: ${response.statusText}`,
                    });
                }

                const data = await response.json();

                if (!data.ok) {
                    const errorCode = this.getTelegramErrorCode(data.description || '');

                    if (
                        data.description?.includes('bot was blocked by the user') ||
                        data.description?.includes('bot was kicked')
                    ) {
                        throw new TRPCError({
                            code: errorCode,
                            message: 'Bot was blocked by client',
                        });
                    }

                    if (data.description?.includes('chat not found')) {
                        throw new TRPCError({
                            code: errorCode,
                            message: 'Client not started a bot',
                        });
                    }

                    throw new TRPCError({
                        code: errorCode,
                        message: `Telegram API returned error: ${data.description}`,
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

    async sendMessage(params: SendMessageParams): Promise<TelegramMessageResponse> {
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
                `Failed to send Telegram message: ${error instanceof TRPCError || error instanceof Error ? error.message : 'Unknown error'}`
            );

            if (error instanceof TRPCError) {
                throw error;
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to send Telegram message: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }

    async sendInParts(chatId: string, fullMessage: string, footer: string) {
        const MAX_LENGTH = 4096;
        const PART_SEPARATOR = '\n\n--- Continued ---\n\n';

        let remainingText = fullMessage;
        let partNumber = 1;

        while (remainingText.length > 0) {
            let currentPart = partNumber === 1 ? '' : `📄 Part ${partNumber}\n\n`;

            const availableChars =
                MAX_LENGTH - currentPart.length - (partNumber > 1 ? PART_SEPARATOR.length : 0);
            const textToTake = Math.min(availableChars, remainingText.length);

            let textPart = remainingText.substring(0, textToTake);

            const lastNewLine = textPart.lastIndexOf('\n');
            if (lastNewLine > textToTake - 100 && lastNewLine > 0) {
                textPart = textPart.substring(0, lastNewLine);
            }

            if (partNumber > 1) {
                textPart = PART_SEPARATOR + textPart;
            }

            textPart = currentPart + textPart;

            if (remainingText.length - textPart.length + currentPart.length <= 0) {
                textPart += footer;
            }

            await this.sendMessage({
                chatId: chatId,
                text: textPart,
                parseMode: 'HTML',
            });

            remainingText = remainingText.substring(
                textPart.length - currentPart.length - (partNumber > 1 ? PART_SEPARATOR.length : 0)
            );
            partNumber++;

            if (remainingText.length > 0) {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }
    }

    async sendDocument(params: {
        chatId: string | number;
        document: string | File;
        caption?: string;
        parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
        disableNotification?: boolean;
        replyToMessageId?: number;
    }): Promise<any> {
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
                `Failed to send document: ${error instanceof TRPCError || error instanceof Error ? error.message : 'Unknown error'}`
            );

            if (error instanceof TRPCError) {
                throw error;
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to send document: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
