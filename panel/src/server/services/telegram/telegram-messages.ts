import { TRPCError } from '@trpc/server';
import { telegramService } from './telegram';
import { encryptionService } from '../encryption';
import { format } from 'date-fns';
import { protocolsMapping } from '@/lib/data/mappings';
import type { Protocols } from 'prisma/generated/enums';
import type { JsonValue } from '@prisma/client/runtime/client';

interface TelegramConfig {
    username: string;
    expiresAt: string | null;
    protocol: Protocols;
    vpnKey: JsonValue;
}

function formatConfigsMessage(
    configs: TelegramConfig[],
    clientName: string,
    options: {
        showHeader: boolean;
        showFooter: boolean;
        currentGroup: number;
        totalGroups: number;
        totalConfigs: number;
    }
): string {
    const { showHeader, showFooter, currentGroup, totalGroups, totalConfigs } = options;

    let message = '';

    if (showHeader) {
        message += `🔐 <b>VPN configurations from ${process.env.NEXT_PUBLIC_VPN_NAME}</b>\n\n`;
    }

    if (totalGroups > 1) {
        message += `📦 Part ${currentGroup} of ${totalGroups}\n\n`;
    }

    const configMessages = configs.map((config, index) => {
        const decryptedVpnKey = encryptionService.decryptField(config.vpnKey);

        const expiryDate = config.expiresAt
            ? format(new Date(Number(config.expiresAt) * 1000), 'MM/dd/yyyy')
            : 'Not set';

        const usernameDisplay = config.username.startsWith(clientName)
            ? config.username.split('-')[1] || config.username
            : config.username;

        return `Configuration for <b>${usernameDisplay}</b>
Protocol: <b>${protocolsMapping[config.protocol] || 'Not specified'}</b>
Expiration date: <b>${expiryDate}</b>
<code>${decryptedVpnKey}</code>${index < configs.length - 1 ? '\n─────────────────────\n' : ''}`;
    });

    message += configMessages.join('\n');

    if (showFooter) {
        message += `\n\n📦 Total configurations: ${totalConfigs}`;
    }

    return message;
}

export async function sendConfigsToTelegram(
    clientName: string,
    telegramId: string,
    configs?: TelegramConfig[]
) {
    if (!configs) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Error' });

    const MAX_CONFIGS_PER_MESSAGE = 3;

    const configGroups: TelegramConfig[][] = [];
    for (let i = 0; i < configs.length; i += MAX_CONFIGS_PER_MESSAGE) {
        configGroups.push(configs.slice(i, i + MAX_CONFIGS_PER_MESSAGE));
    }

    for (let i = 0; i < configGroups.length; i++) {
        const currentGroup = configGroups[i];
        if (!currentGroup) continue;

        const isFirstGroup = i === 0;
        const isLastGroup = i === configGroups.length - 1;

        const message = formatConfigsMessage(currentGroup, clientName, {
            showHeader: isFirstGroup,
            showFooter: isLastGroup,
            currentGroup: i + 1,
            totalGroups: configGroups.length,
            totalConfigs: configs.length,
        });

        try {
            await telegramService.sendMessage(
                {
                    chatId: telegramId,
                    text: message,
                    parseMode: 'HTML',
                },
                clientName
            );
        } catch (error: any) {
            if (
                error?.message?.includes('message is too long') ||
                error?.message?.includes('parse error')
            ) {
                for (const config of currentGroup) {
                    const singleMessage = formatConfigsMessage([config], clientName, {
                        showHeader: isFirstGroup && currentGroup.indexOf(config) === 0,
                        showFooter:
                            isLastGroup && currentGroup.indexOf(config) === currentGroup.length - 1,
                        currentGroup: i + 1,
                        totalGroups: configGroups.length,
                        totalConfigs: configs.length,
                    });

                    await telegramService.sendMessage(
                        {
                            chatId: telegramId,
                            text: singleMessage,
                            parseMode: 'HTML',
                        },
                        clientName
                    );
                }
            } else {
                throw error;
            }
        }
    }
}
