import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    apiProtocolsMapping,
    protocolsApiMapping,
    protocolsServerMapping,
} from '@/lib/data/mappings';
import { getProtocolColor } from '@/lib/utils';

interface ServerInfoProps {
    server?: {
        id: string;
        region: string;
        weight: number;
        maxPeers: number;
        totalPeers: number;
        protocols: string[];
    };
}

export default function ServerInfo({ server }: ServerInfoProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Server Information</CardTitle>
                <CardDescription>Detailed information about the server</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-muted-foreground text-sm font-medium">Server ID</p>
                        <p className="font-mono text-sm">{server?.id}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-sm font-medium">Region</p>
                        <p className="font-semibold">{server?.region}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-sm font-medium">Weight</p>
                        <p>{server?.weight}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-sm font-medium">Max Peers</p>
                        <p>{server?.maxPeers}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-sm font-medium">Current Peers</p>
                        <p>
                            {server?.totalPeers} / {server?.maxPeers}
                        </p>
                    </div>
                </div>

                <div>
                    <p className="text-muted-foreground mb-2 text-sm font-medium">Protocols</p>
                    <div className="flex gap-2">
                        {server?.protocols.map((protocol) => (
                            <Badge
                                variant="default"
                                key={protocol}
                                className={getProtocolColor(
                                    apiProtocolsMapping[protocol as 'amneziawg' | 'xray']
                                )}>
                                {protocolsServerMapping[protocol]}
                            </Badge>
                        ))}
                    </div>
                </div>

                <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Peer Usage</p>
                            <div className="bg-secondary mt-1 h-2 w-64 overflow-hidden rounded-full">
                                {server?.totalPeers && server.maxPeers && (
                                    <div
                                        className="bg-primary h-full"
                                        style={{
                                            width: `${(server?.totalPeers / server?.maxPeers) * 100}%`,
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                        {server?.totalPeers && server.maxPeers && (
                            <span className="text-sm font-medium">
                                {Math.round((server?.totalPeers / server?.maxPeers) * 100)}%
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
