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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/trpc/react';
import { createConfigSchema, type createConfigFormData } from '@/lib/schemas/configs';
import { protocolsMapping } from '@/lib/data/mappings';

export function CreateConfigDialog() {
    const [open, setOpen] = useState(false);
    const utils = api.useUtils();

    const { data: clients } = api.clients.getClients.useQuery();

    const form = useForm<createConfigFormData>({
        resolver: zodResolver(createConfigSchema),
        defaultValues: {
            clientId: undefined,
            username: '',
            expiresAt: '',
            protocol: undefined,
        },
    });

    const createConfig = api.configs.createConfig.useMutation({
        onSuccess: () => {
            toast.success('Config was created successfully');
            utils.clients.getClientsWithConfigs.invalidate();
            setOpen(false);
            form.reset();
        },
        onError: (error) => {
            toast.error('Error creating config');
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
                    Create Config
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Create New Config</DialogTitle>
                    <DialogDescription>
                        Fill in the information for the new configuration
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="clientId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Client (Optional)</FormLabel>
                                    <Select
                                        onValueChange={(value) =>
                                            field.onChange(
                                                value === 'none' ? undefined : Number(value)
                                            )
                                        }
                                        value={field.value ? String(field.value) : 'none'}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a client" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">No client (Orphan)</SelectItem>
                                            {clients?.map((client) => (
                                                <SelectItem
                                                    key={client.id}
                                                    value={String(client.id)}>
                                                    {client.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Username <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter username" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="protocol"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Protocol <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select protocol" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.entries(protocolsMapping).map(
                                                ([value, label]) => (
                                                    <SelectItem key={value} value={value}>
                                                        {label}
                                                    </SelectItem>
                                                )
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="expiresAt"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>
                                        Expiration Date <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        'w-full pl-3 text-left font-normal',
                                                        !field.value && 'text-muted-foreground'
                                                    )}>
                                                    {field.value ? (
                                                        format(
                                                            new Date(Number(field.value) * 1000),
                                                            'PPP'
                                                        )
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={
                                                    field.value
                                                        ? new Date(Number(field.value) * 1000)
                                                        : undefined
                                                }
                                                onSelect={(date) => {
                                                    const unixTimestamp = date
                                                        ? Math.floor(
                                                              date.getTime() / 1000
                                                          ).toString()
                                                        : '';
                                                    field.onChange(unixTimestamp);
                                                }}
                                                disabled={(date) => date < new Date()}
                                            />
                                        </PopoverContent>
                                    </Popover>
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
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createConfig.isPending}>
                                {createConfig.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {createConfig.isPending ? 'Creating...' : 'Create Config'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
