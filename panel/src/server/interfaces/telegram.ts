export interface SendMessageParams {
    chatId: string | number;
    text: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    disableWebPagePreview?: boolean;
    disableNotification?: boolean;
    replyToMessageId?: number;
    replyMarkup?: any;
}

export interface TelegramMessageResponse {
    message_id: number;
    from: {
        id: number;
        is_bot: boolean;
        first_name: string;
        username: string;
    };
    chat: {
        id: number;
        title?: string;
        type: 'private' | 'group' | 'supergroup' | 'channel';
        username?: string;
        first_name?: string;
    };
    date: number;
    text: string;
}

export interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

export interface TelegramChat {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
}

export interface WebhookInfo {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    max_connections?: number;
    allowed_updates?: string[];
}
