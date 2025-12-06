'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/trpc/react';
import { InputSearchLoader } from '@/components/input-search';
import { Loader } from '@/components/loader';
import debounce from 'lodash.debounce';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CreateConfigDialog } from '@/components/create-config-dialog';
import { protocolsMapping } from '@/lib/data/mappings';

export default function ClientsPage() {
    const [search, setSearch] = useState('');
    const [protocolFilter, setProtocolFilter] = useState('All');
    const router = useRouter();

    const { data, isLoading, isFetching, error } = api.clients.getClientsWithConfigs.useQuery({
        search,
        protocolFilter,
    });

    const changeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
    };

    const debouncedChangeHandler = useMemo(() => debounce(changeHandler, 500), []);

    useEffect(() => {
        return () => {
            debouncedChangeHandler.cancel();
        };
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="grid gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
                    <p className="text-muted-foreground">Clients and configs management</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        className="cursor-pointer"
                        onClick={() => router.push('/create-client')}>
                        <Plus className="mr-2 h-4 w-4" /> Create Client
                    </Button>
                    <CreateConfigDialog />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Clients table</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 flex items-center gap-4">
                        <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
                            <Button
                                variant={protocolFilter === 'All' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setProtocolFilter('All')}
                                className="h-8">
                                All
                            </Button>
                            <Button
                                variant={protocolFilter === 'XRAY' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setProtocolFilter('XRAY')}
                                className="h-8">
                                {protocolsMapping['XRAY']}
                            </Button>
                            <Button
                                variant={protocolFilter === 'AMNEZIAWG' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setProtocolFilter('AMNEZIAWG')}
                                className="h-8">
                                {protocolsMapping['AMNEZIAWG']}
                            </Button>
                        </div>
                        <InputSearchLoader
                            placeholder="Search by config name..."
                            onChange={debouncedChangeHandler}
                            isLoading={isLoading || isFetching}
                        />
                    </div>

                    {isLoading ? (
                        <Loader />
                    ) : error ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-destructive">Error load data</div>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <ConfigsTableWithClients
                                clients={data?.clients || []}
                                orphanConfigs={data?.orphanConfigs || []}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
