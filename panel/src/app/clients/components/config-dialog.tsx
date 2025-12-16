'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Loader2,
    Copy,
    Check,
    User,
    Wifi,
    Calendar,
    Globe,
    Clock,
    Activity,
    Shield,
    Info,
} from 'lucide-react';
import { cn, formatBytes, formatLastHandshake, getProtocolColor } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/trpc/react';
import type { Protocols } from 'prisma/generated/enums';
import { protocolsMapping } from '@/lib/data/mappings';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ConfigInfoDialogProps {
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
}

export function ConfigDialog({ config }: ConfigInfoDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string>(
        config.clientId ? String(config.clientId) : 'none'
    );
    const [copiedKey, setCopiedKey] = useState(false);
    const utils = api.useUtils();

    const { data: vpnKey, isLoading: isLoadingKey } = api.configs.getVpnKey.useQuery(
        {
            id: config.id,
        },
        {
            enabled: open,
        }
    );

    const { data: clients } = api.clients.getClients.useQuery();

    const getTruncatedKey = (key: string): string => {
        const protocolMatch = key.match(/^([a-zA-Z]+):\/\//);
        if (protocolMatch) {
            return `${protocolMatch[0]}...`;
        }
        return '...';
    };

    const copyKeyToClipboard = async () => {
        if (!vpnKey) return;

        try {
            await navigator.clipboard.writeText(vpnKey);
            setCopiedKey(true);
            toast.success('Config key copied to clipboard');
            setTimeout(() => setCopiedKey(false), 2000);
        } catch (err) {
            toast.error('Failed to copy key');
        }
    };

    const updateConfigClient = api.configs.updateClientConfig.useMutation({
        onSuccess: () => {
            toast.success('Client was updated successfully');
            utils.clients.getClientsWithConfigs.invalidate();
            setOpen(false);
        },
        onError: (error) => {
            toast.error('Error updating client');
            console.error(error);
        },
    });

    const handleSaveClient = () => {
        if (selectedClientId === 'none') return;

        updateConfigClient.mutate({
            id: config.id,
            clientId: selectedClientId,
        });
    };

    const totalTraffic = config.traffic.received + config.traffic.sent;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Tooltip>
                <DialogTrigger asChild>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Info className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                </DialogTrigger>
                <TooltipContent>
                    <p>Config info</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-150">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Config Details
                    </DialogTitle>
                    <DialogDescription>View and manage configuration settings</DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-sm font-medium">
                                Username
                            </Label>
                            <div className="flex items-center gap-2">
                                <User className="text-muted-foreground h-4 w-4" />
                                <span className="font-medium">{config.username}</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-sm font-medium">
                                Status
                            </Label>
                            <Badge
                                variant={config.online ? 'default' : 'secondary'}
                                className={cn(
                                    config.online
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                )}>
                                {config.online ? 'Online' : 'Offline'}
                            </Badge>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-sm font-medium">
                                Protocol
                            </Label>
                            <Badge variant="default" className={getProtocolColor(config.protocol)}>
                                {protocolsMapping[config.protocol]}
                            </Badge>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-sm font-medium">
                                Created at
                            </Label>
                            <div className="flex items-center gap-2">
                                <Calendar className="text-muted-foreground h-4 w-4" />
                                <span>{format(config.createdAt, 'PP')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Config Key</Label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Input
                                    value={vpnKey ? getTruncatedKey(vpnKey) : ''}
                                    readOnly
                                    className="font-mono"
                                    placeholder={isLoadingKey ? 'Loading...' : 'No key available'}
                                />
                                <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-transparent to-white dark:to-gray-950" />
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={copyKeyToClipboard}
                                disabled={!vpnKey || copiedKey}
                                className="shrink-0">
                                {copiedKey ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-medium">
                            <Activity className="h-4 w-4" />
                            Connection Statistics
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-sm font-medium">
                                    Traffic (Total)
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Wifi className="text-muted-foreground h-4 w-4" />
                                    <span>{formatBytes(totalTraffic)}</span>
                                </div>
                                <div className="text-muted-foreground text-xs">
                                    ↑ {formatBytes(config.traffic.sent)} / ↓{' '}
                                    {formatBytes(config.traffic.received)}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-sm font-medium">
                                    Last Handshake
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Clock className="text-muted-foreground h-4 w-4" />
                                    <span>{formatLastHandshake(config.lastHandshake)}</span>
                                </div>
                            </div>

                            {config.endpoint && (
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-muted-foreground text-sm font-medium">
                                        Endpoint
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Globe className="text-muted-foreground h-4 w-4" />
                                        <span className="font-mono text-sm">{config.endpoint}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {config.allowedIps.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Allowed IPs</Label>
                            <div className="flex flex-wrap gap-2">
                                {config.allowedIps.map((ip, index) => (
                                    <Badge key={index} variant="outline" className="font-mono">
                                        {ip}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 border-t pt-4">
                        <Label className="text-sm font-medium">Client Assignment</Label>

                        <div className="flex items-center gap-2">
                            <Select
                                value={selectedClientId}
                                onValueChange={setSelectedClientId}
                                disabled={updateConfigClient.isPending}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select a client" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No client (Orphan)</SelectItem>
                                    {clients?.map((client) => (
                                        <SelectItem key={client.id} value={String(client.id)}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                onClick={handleSaveClient}
                                disabled={
                                    updateConfigClient.isPending ||
                                    selectedClientId ===
                                        (config.clientId ? String(config.clientId) : 'none')
                                }
                                className="shrink-0">
                                {updateConfigClient.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save'
                                )}
                            </Button>
                        </div>
                    </div>

                    {config.expiresAt && (
                        <div className="space-y-1 border-t pt-4">
                            <Label className="text-muted-foreground text-sm font-medium">
                                Expiration Date
                            </Label>
                            <div className="flex items-center gap-2">
                                <Calendar className="text-muted-foreground h-4 w-4" />
                                <span>
                                    {format(new Date(Number(config.expiresAt) * 1000), 'PPP')}
                                </span>
                                <Badge variant="outline" className="ml-2">
                                    {new Date(config.expiresAt) > new Date() ? 'Active' : 'Expired'}
                                </Badge>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
