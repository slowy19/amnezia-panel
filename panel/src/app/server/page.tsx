'use client';

import { api } from '@/trpc/react';
import ServerInfo from './components/server-info';
import ServerActions from './components/server-actions';

export default function ServerPage() {
    const { data } = api.server.getServer.useQuery();

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Server Details</h1>
                <p className="text-muted-foreground">View and manage server configuration</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <ServerInfo server={data} />
                <ServerActions />
            </div>
        </div>
    );
}
