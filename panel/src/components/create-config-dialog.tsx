'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/trpc/react';
import { createConfigSchema, type createConfigFormData } from '@/lib/schemas/configs';

export function CreateConfigDialog() {
    const [open, setOpen] = useState(false);
    const utils = api.useUtils();

    const form = useForm<createConfigFormData>({
        resolver: zodResolver(createConfigSchema),
        defaultValues: {
            clientId: undefined,
            username: '',
            expiresAt: '',
            protocol: 'XRAY',
        },
    });

    const createConfig = api.configs.createConfig.useMutation({
        onSuccess: () => {
            toast.success('Config was successfully created');
            utils.clients.getClientsWithConfigs.invalidate();
            setOpen(false);
            form.reset();
        },
        onError: (error) => {
            toast.error('Error');

            console.error(error);
        },
    });

    const onSubmit = (data: createConfigFormData) => {
        createConfig.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="cursor-pointer" variant={'outline'}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create config
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Create config</DialogTitle>
                    <DialogDescription>
                        Fill info about new config
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Название <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter a name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={createConfig.isPending}>
                                Отмена
                            </Button>
                            <Button type="submit" disabled={createConfig.isPending}>
                                {createConfig.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {createConfig.isPending ? 'Creating...' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
