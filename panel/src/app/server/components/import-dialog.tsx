'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/ui/shadcn-io/dropzone';
import { api } from '@/trpc/react';
import { DialogDescription } from '@radix-ui/react-dialog';
import { Loader2, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const ImportBackupDialog = () => {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File[] | undefined>();

    const handleDrop = (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles);
        }
    };

    const importBackup = api.server.importBackup.useMutation({
        onSuccess: () => {
            toast.success('Backup was imported successfully');
            setOpen(false);
            setFile(undefined);
        },
        onError: (error) => {
            toast.error('Error importing');
            console.error(error);
        },
    });

    const handleImport = async () => {
        if (!file?.[0]) {
            toast.error('Choose a file');
            return;
        }

        try {
            const fileContent = await file[0].text();
            if (!fileContent.trim()) {
                toast.error('File is empty');
                return;
            }

            importBackup.mutate({
                fileContent,
            });
        } catch (error) {
            toast.error('Error reading file');
            console.error(error);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setOpen(open);
        if (!open) {
            setFile(undefined);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="justify-start">
                    <Upload className="mr-2 h-4 w-4" />
                    Import Backup
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Importing</DialogTitle>
                    <DialogDescription className="mt-2">
                        Import JSON backup server of AmneziaVPN
                    </DialogDescription>
                </DialogHeader>
                <Dropzone
                    src={file}
                    onDrop={handleDrop}
                    onError={(error: any) => {
                        console.error(error);
                        toast.error('Error downloading');
                    }}
                    maxFiles={1}
                    accept={{
                        'application/json': ['.json'],
                    }}>
                    <DropzoneEmptyState />
                    <DropzoneContent />
                </Dropzone>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={importBackup.isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={importBackup.isPending || !file}
                        className="gap-2">
                        {importBackup.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            'Import'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
