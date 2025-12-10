'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { ImportBackupDialog } from './import-dialog';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

export default function ServerActions() {
    const downloadBackup = api.server.downloadBackup.useMutation({
        onSuccess: () => {
            toast.success('Backup was downloaded successfully');
        },
        onError: (error) => {
            toast.error('Error downloading');
            console.error(error);
        },
    });

    const handleDownload = async () => {
        try {
            const result = await downloadBackup.mutateAsync();
            const binaryString = atob(result.content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: result.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                a.remove();
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Failed to download Backup:', error);
        }
    };

    const rebootServer = api.server.rebootServer.useMutation({
        onSuccess: () => {
            toast.success('Server was rebooted successfully');
        },
        onError: (error) => {
            toast.error('Error rebooting');
            console.error(error);
        },
    });

    const handleReboot = () => {
        rebootServer.mutate();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Server Actions</CardTitle>
                <CardDescription>Manage server configuration and operations</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 justify-between h-full">
                <div className="flex flex-col items-start gap-3">
                    <Button
                        onClick={handleDownload}
                        disabled={downloadBackup.isPending}
                        className="justify-start"
                        variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        {downloadBackup.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            'Load Backup'
                        )}
                    </Button>

                    <ImportBackupDialog />

                    <Button
                        onClick={handleReboot}
                        disabled={rebootServer.isPending}
                        className="text-destructive hover:text-destructive justify-start"
                        variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {rebootServer.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Rebooting...
                            </>
                        ) : (
                            'Reboot Server'
                        )}
                    </Button>
                </div>

                <div className="text-muted-foreground border-t pt-4 text-sm">
                    <p className="mb-1 font-medium">Notes:</p>
                    <ul className="list-inside list-disc space-y-1">
                        <li>Load backup downloads the current server backup</li>
                        <li>Import backup uploads a new backup file</li>
                        <li>Reboot server restarts the AmneziaVPN server</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
