'use client';

import { useMemo, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Check,
    ChevronDownIcon,
    ChevronRightIcon,
    Copy,
    Loader2,
    Send,
    UserIcon,
} from 'lucide-react';
import {
    cn,
    formatBytes,
    formatDate,
    formatLastHandshake,
    getProtocolColor,
    telegramToastError,
} from '@/lib/utils';
import Link from 'next/link';
import type { Protocols } from 'prisma/generated/enums';
import { UpdateClientDialog } from './client-dialog';
import DeleteClientDialog from './delete-client-dialog';
import { protocolsMapping } from '@/lib/data/mappings';
import DeleteConfigDialog from './delete-config-dialog';
import { ConfigDialog } from './config-dialog';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

interface ConfigsWithClientsProps {
    clients: Array<{
        id: number;
        name: string;
        telegramId: string | null;
        createdAt: Date;
        configsCount: number;
        configs: Array<{
            id: string;
            username: string;
            protocol: Protocols;
            online: boolean;
            lastHandshake: string | null;
            traffic: {
                received: number;
                sent: number;
            };
            allowedIps: string[];
            endpoint: string | null;
            expiresAt: string | null;
            createdAt: Date;
            clientId: number | null;
        }>;
    }>;
    orphanConfigs: Array<{
        id: string;
        username: string;
        protocol: Protocols;
        online: boolean;
        lastHandshake: string | null;
        traffic: {
            received: number;
            sent: number;
        };
        allowedIps: string[];
        endpoint: string | null;
        expiresAt: string | null;
        createdAt: Date;
        clientId: number | null;
    }>;
}

export function ConfigsWithClientsTable({
    clients,
    orphanConfigs,
}: Readonly<ConfigsWithClientsProps>) {
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

    const toggleClient = (clientId: string) => {
        const newExpanded = new Set(expandedClients);
        if (newExpanded.has(clientId)) {
            newExpanded.delete(clientId);
        } else {
            newExpanded.add(clientId);
        }
        setExpandedClients(newExpanded);
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Traffic</TableHead>
                    <TableHead>Last handshake</TableHead>
                    <TableHead>Expires at</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {clients.map((client) => (
                    <ClientRow
                        key={client.id}
                        client={client}
                        isExpanded={expandedClients.has(String(client.id))}
                        onToggle={() => toggleClient(String(client.id))}
                    />
                ))}

                {orphanConfigs.map((config) => (
                    <ConfigRow key={config.id} config={config} isNested={false} />
                ))}
            </TableBody>
        </Table>
    );
}

function ClientRow({
    client,
    isExpanded,
    onToggle,
}: Readonly<{
    client: {
        id: number;
        name: string;
        telegramId: string | null;
        createdAt: Date;
        configsCount: number;
        configs: Array<{
            id: string;
            username: string;
            protocol: Protocols;
            online: boolean;
            lastHandshake: string | null;
            traffic: {
                received: number;
                sent: number;
            };
            allowedIps: string[];
            endpoint: string | null;
            expiresAt: string | null;
            createdAt: Date;
            clientId: number | null;
        }>;
    };
    isExpanded: boolean;
    onToggle: () => void;
}>) {
    const [copiedChatId, setCopiedChatId] = useState(false);

    const configsWord = useMemo(() => {
        const count = client.configsCount;

        if (count === 1) {
            return 'config';
        } else {
            return 'configs';
        }
    }, [client.configsCount]);

    const totalTraffic = useMemo(() => {
        return client.configs.reduce((total, config) => {
            return total + config.traffic.received + config.traffic.sent;
        }, 0);
    }, [client.configs]);

    const sendConfigs = api.clients.sendKeysForClient.useMutation({
        onSuccess: () => {
            toast.success('VPN configs were sent successfully');
        },
        onError: (error) => {
            telegramToastError(error);
        },
    });

    const onSubmitConfigs = () => {
        sendConfigs.mutate({ id: client.id });
    };

    const sendLinks = api.clients.sendDownloadLinks.useMutation({
        onSuccess: () => {
            toast.success('AmneziaVPN links were sent successfully');
        },
        onError: (error) => {
            telegramToastError(error);
        },
    });

    const onSubmitLinks = () => {
        sendLinks.mutate({ id: client.id });
    };

    const copyChatIdToClipboard = async (chatId: string | null) => {
        if (!chatId) return;

        try {
            await navigator.clipboard.writeText(chatId);
            setCopiedChatId(true);
            toast.success('Telegram Chat ID copied to clipboard');
            setTimeout(() => setCopiedChatId(false), 2000);
        } catch (err) {
            toast.error('Failed to copy Telegram Chat ID');
        }
    };

    return (
        <>
            <TableRow>
                <TableCell>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggle}
                        className="h-8 w-8 p-0"
                        disabled={client.configsCount === 0}>
                        {client.configsCount > 0 ? (
                            isExpanded ? (
                                <ChevronDownIcon className="h-4 w-4" />
                            ) : (
                                <ChevronRightIcon className="h-4 w-4" />
                            )
                        ) : (
                            <div className="h-4 w-4" />
                        )}
                    </Button>
                </TableCell>
                <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggle}
                            disabled={client.configsCount === 0}
                            className="flex items-center gap-2 hover:bg-transparent">
                            <UserIcon className="h-4 w-4" />
                            {client.name}
                        </Button>

                        {client.telegramId && (
                            <Badge
                                variant="outline"
                                className="cursor-pointer text-xs whitespace-nowrap"
                                onClick={() => {
                                    copyChatIdToClipboard(client.telegramId);
                                }}>
                                <div className="flex items-center gap-1">
                                    <span>{client.telegramId}</span>
                                    {copiedChatId ? (
                                        <Check className="h-3 w-3" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </div>
                            </Badge>
                        )}
                    </div>
                </TableCell>
                <TableCell>
                    <span className="text-muted-foreground">
                        {client.configsCount} {configsWord}
                    </span>
                </TableCell>
                <TableCell>
                    <Badge variant="secondary">Client</Badge>
                </TableCell>
                <TableCell>{formatBytes(totalTraffic)}</TableCell>
                <TableCell>
                    {process.env.NEXT_PUBLIC_USES_TELEGRAM_BOT === 'true' ? (
                        <Button
                            disabled={sendLinks.isPending}
                            onClick={onSubmitLinks}
                            variant="outline"
                            size="sm">
                            {sendLinks.isPending && (
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            )}
                            {sendLinks.isPending ? 'Sending...' : 'Send links'}
                        </Button>
                    ) : (
                        '—'
                    )}
                </TableCell>
                <TableCell>
                    {process.env.NEXT_PUBLIC_USES_TELEGRAM_BOT === 'true' ? (
                        <Button
                            disabled={sendConfigs.isPending}
                            onClick={onSubmitConfigs}
                            size="sm">
                            {sendConfigs.isPending && (
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            )}
                            {sendConfigs.isPending ? 'Sending...' : 'Send configs'}
                        </Button>
                    ) : (
                        '—'
                    )}
                </TableCell>
                <TableCell>
                    <div className="flex items-center justify-end gap-1">
                        <UpdateClientDialog
                            id={client.id}
                            name={client.name}
                            telegramId={client.telegramId}
                        />
                        <DeleteClientDialog id={client.id} />
                    </div>
                </TableCell>
            </TableRow>

            {isExpanded &&
                client.configs.map((config) => (
                    <ConfigRow key={config.id} config={config} isNested={true} />
                ))}
        </>
    );
}

function ConfigRow({
    config,
    isNested = false,
}: Readonly<{
    config: {
        id: string;
        username: string;
        protocol: Protocols;
        online: boolean;
        lastHandshake: string | null;
        traffic: {
            received: number;
            sent: number;
        };
        allowedIps: string[];
        endpoint: string | null;
        expiresAt: string | null;
        createdAt: Date;
        clientId: number | null;
    };
    isNested?: boolean;
}>) {
    const totalTraffic = config.traffic.received + config.traffic.sent;
    const NumberExpiresAt = Number(config.expiresAt);

    const sendMessage = api.configs.sendVpnKey.useMutation({
        onSuccess: () => {
            toast.success('VPN config was sent successfully');
        },
        onError: (error) => {
            telegramToastError(error);
        },
    });

    const onSubmit = () => {
        sendMessage.mutate({ id: config.id });
    };

    return (
        <TableRow className={isNested ? 'bg-muted/20' : ''}>
            <TableCell>{isNested && <div className="ml-4"></div>}</TableCell>
            <TableCell>
                <div className={`flex items-center gap-2 ${isNested ? 'ml-6' : ''}`}>
                    <span>{config.username}</span>
                </div>
            </TableCell>
            <TableCell>
                <Badge
                    variant={config.online ? 'default' : 'secondary'}
                    className={cn(
                        config.online
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                    )}>
                    {config.online ? 'Online' : 'Offline'}
                </Badge>
            </TableCell>
            <TableCell>
                <Badge variant="default" className={getProtocolColor(config.protocol)}>
                    {protocolsMapping[config.protocol]}
                </Badge>
            </TableCell>
            <TableCell>{formatBytes(totalTraffic)}</TableCell>
            <TableCell>{formatLastHandshake(config.lastHandshake)}</TableCell>
            <TableCell>{formatDate(NumberExpiresAt * 1000)}</TableCell>
            <TableCell>
                <div className="flex items-center justify-end gap-2">
                    {process.env.NEXT_PUBLIC_USES_TELEGRAM_BOT === 'true' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer text-blue-400 hover:text-blue-600"
                            onClick={onSubmit}
                            disabled={sendMessage.isPending}>
                            {sendMessage.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    )}
                    <ConfigDialog config={config} />
                    <DeleteConfigDialog id={config.id} protocol={config.protocol} />
                </div>
            </TableCell>
        </TableRow>
    );
}
