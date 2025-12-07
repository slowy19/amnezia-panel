'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { CalendarIcon, Plus, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/trpc/react';
import { protocolsMapping } from '@/lib/data/mappings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClientSchema, type createClientFormData } from '@/lib/schemas/clients';
import { useRouter } from 'next/navigation';

export default function CreateClientPage() {
    const utils = api.useUtils();
    const router = useRouter()

    const form = useForm<createClientFormData>({
        resolver: zodResolver(createClientSchema),
        defaultValues: {
            name: '',
            telegramId: '',
            configs: [
                {
                    username: '',
                    expiresAt: '',
                    protocol: undefined,
                },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'configs',
    });

    const watchClientName = form.watch('name');
    const watchConfigs = form.watch('configs');

    const createClientWithConfigs = api.clients.createClient.useMutation({
        onSuccess: () => {
            toast.success('Client and configs created successfully');
            form.reset();
            utils.clients.getClientsWithConfigs.invalidate();
            router.push('/')
        },
        onError: (error) => {
            toast.error('Error creating client');
            console.error(error);
        },
    });

    const onSubmit = (data: createClientFormData) => {
        const configsWithUsernames = data.configs.map((config) => ({
            ...config,
            username:
                data.name && config.username ? `${data.name}-${config.username}` : config.username,
        }));

        createClientWithConfigs.mutate({
            name: data.name,
            telegramId: data.telegramId || undefined,
            configs: configsWithUsernames,
        });
    };

    const addConfig = () => {
        append({
            username: '',
            expiresAt: '',
            protocol: 'AMNEZIAWG',
        });
    };

    return (
        <div className="container mx-auto max-w-4xl py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Create New Client</h1>
                <p className="text-muted-foreground mt-2">
                    Add a new client and their VPN configurations
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Client Information</CardTitle>
                            <CardDescription>
                                Enter the basic information for the client
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Client Name <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter client name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="telegramId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telegram Chat ID (Optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="123456789"
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>VPN Configurations</CardTitle>
                                    <CardDescription>
                                        Add one or more VPN configurations for this client
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addConfig}
                                    className="cursor-pointer">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Config
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {fields.length === 0 ? (
                                <div className="rounded-lg border-2 border-dashed py-8 text-center">
                                    <p className="text-muted-foreground">
                                        No configurations added yet
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addConfig}
                                        className="mt-4">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add First Config
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {fields.map((field, index) => {
                                        const configUsername = watchConfigs[index]?.username || '';
                                        const fullUsername =
                                            watchClientName && configUsername
                                                ? `${watchClientName}-${configUsername}`
                                                : configUsername || '[waiting for input]';

                                        return (
                                            <div
                                                key={field.id}
                                                className="space-y-4 rounded-lg border p-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-semibold">
                                                        Config #{index + 1}
                                                    </h3>
                                                    {fields.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => remove(index)}
                                                            className="text-destructive h-8 w-8 p-0">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="bg-muted rounded-md p-3">
                                                    <div className="mb-1 text-sm font-medium">
                                                        Generated Username:
                                                    </div>
                                                    <div className="font-mono text-sm">
                                                        {watchClientName ? (
                                                            <>
                                                                <span className="text-blue-600">
                                                                    {watchClientName}
                                                                </span>
                                                                <span className="text-muted-foreground">
                                                                    -
                                                                </span>
                                                                <span className="text-green-600">
                                                                    {configUsername || '[username]'}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-muted-foreground">
                                                                Enter client name to see full
                                                                username
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-muted-foreground mt-1 text-xs">
                                                        Final username:{' '}
                                                        <Badge variant="secondary">
                                                            {fullUsername}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <FormField
                                                        control={form.control}
                                                        name={`configs.${index}.username`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Username Suffix{' '}
                                                                    <span className="text-destructive">
                                                                        *
                                                                    </span>
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Enter username suffix"
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name={`configs.${index}.protocol`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Protocol{' '}
                                                                    <span className="text-destructive">
                                                                        *
                                                                    </span>
                                                                </FormLabel>
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select protocol" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {Object.entries(
                                                                            protocolsMapping
                                                                        ).map(([value, label]) => (
                                                                            <SelectItem
                                                                                key={value}
                                                                                value={value}>
                                                                                {label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <FormField
                                                    control={form.control}
                                                    name={`configs.${index}.expiresAt`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-col">
                                                            <FormLabel>
                                                                Expiration Date{' '}
                                                                <span className="text-destructive">
                                                                    *
                                                                </span>
                                                            </FormLabel>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <FormControl>
                                                                        <Button
                                                                            variant="outline"
                                                                            className={cn(
                                                                                'w-full pl-3 text-left font-normal',
                                                                                !field.value &&
                                                                                    'text-muted-foreground'
                                                                            )}>
                                                                            {field.value ? (
                                                                                format(
                                                                                    new Date(
                                                                                        Number(
                                                                                            field.value
                                                                                        ) * 1000
                                                                                    ),
                                                                                    'PPP'
                                                                                )
                                                                            ) : (
                                                                                <span>
                                                                                    Pick a date
                                                                                </span>
                                                                            )}
                                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                        </Button>
                                                                    </FormControl>
                                                                </PopoverTrigger>
                                                                <PopoverContent
                                                                    className="w-auto p-0"
                                                                    align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={
                                                                            field.value
                                                                                ? new Date(
                                                                                      Number(
                                                                                          field.value
                                                                                      ) * 1000
                                                                                  )
                                                                                : undefined
                                                                        }
                                                                        onSelect={(date) => {
                                                                            const unixTimestamp =
                                                                                date
                                                                                    ? Math.floor(
                                                                                          date.getTime() /
                                                                                              1000
                                                                                      ).toString()
                                                                                    : '';
                                                                            field.onChange(
                                                                                unixTimestamp
                                                                            );
                                                                        }}
                                                                        disabled={(date) =>
                                                                            date < new Date()
                                                                        }
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                form.reset();
                                remove();
                                append({
                                    username: '',
                                    expiresAt: '',
                                    protocol: 'AMNEZIAWG',
                                });
                            }}
                            disabled={createClientWithConfigs.isPending}>
                            Reset Form
                        </Button>

                        <div className="flex items-center gap-4">
                            <div className="text-muted-foreground text-sm">
                                {fields.length} configuration{fields.length !== 1 ? 's' : ''} added
                            </div>
                            <Button
                                type="submit"
                                disabled={createClientWithConfigs.isPending}
                                size="lg">
                                {createClientWithConfigs.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {createClientWithConfigs.isPending
                                    ? 'Creating...'
                                    : 'Create Client & Configs'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
}
