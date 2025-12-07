'use client';

import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

interface Props {
    id: number;
}

export default function DeleteClientDialog({ id }: Readonly<Props>) {
    const [isDelete, setIsDelete] = useState(false);

    const utils = api.useUtils();

    const deleteClient = api.clients.deleteClient.useMutation({
        onSuccess: () => {
            utils.clients.getClientsWithConfigs.invalidate();
            toast.success('Client was successfully deleted');
        },
        onError: (error) => {
            toast.error('Error');
            console.error(error);
        },
    });

    const handleDeleteClient = () => {
        deleteClient.mutate({ id });
    };

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer text-red-400 hover:text-red-600"
                onClick={() => setIsDelete(true)}>
                <Trash2 className="h-4 w-4" />
            </Button>
            <AlertDialog open={isDelete} onOpenChange={setIsDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be canceled. This will permanently delete the client
                            and all related objects will also be deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteClient}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
