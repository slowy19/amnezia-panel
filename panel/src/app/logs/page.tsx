'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/trpc/react';
import { CustomPagination } from '@/components/custom-pagination';
import debounce from 'lodash.debounce';
import { InputSearchLoader } from '@/components/input-search';
import { Loader } from '@/components/loader';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { LevelTypes, LogTypes } from 'prisma/generated/enums';
import { levelTypesMapping, logTypesMapping } from '@/lib/data/mappings';
import { getLevelTypeColor, getLogTypeColor, getNormalDate } from '@/lib/utils';
import { PopoverMessage } from '@/components/popover-message';

const optionsLevelTypes = [
    {
        value: 'All',
        label: 'Все',
    },
    {
        value: LevelTypes.INFO,
        label: levelTypesMapping[LevelTypes.INFO],
    },
    {
        value: LevelTypes.WARNING,
        label: levelTypesMapping[LevelTypes.WARNING],
    },
    {
        value: LevelTypes.ERROR,
        label: levelTypesMapping[LevelTypes.ERROR],
    },
];

const optionsLogTypes = [
    {
        value: 'All',
        label: 'Все',
    },
    {
        value: LogTypes.TELEGRAM,
        label: logTypesMapping[LogTypes.TELEGRAM],
    },
    {
        value: LogTypes.SERVER,
        label: logTypesMapping[LogTypes.SERVER],
    },
    {
        value: LogTypes.CLIENT,
        label: logTypesMapping[LogTypes.CLIENT],
    },
];

export default function LogsPage() {
    const [search, setSearch] = useState('');
    const [activeLevelType, setActiveLevelType] = useState(optionsLevelTypes[0]?.value || '');
    const [activeLogType, setActiveLogType] = useState(optionsLogTypes[0]?.value || '');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState('25');

    const { data, isLoading, isFetching, error } = api.server.getLogs.useQuery({
        search,
        page,
        limit,
        levelType: activeLevelType,
        logType: activeLogType,
    });

    const numberLimit = Number(limit);
    const totalPages = data ? Math.ceil(data.totalItems / numberLimit) : 0;

    const changeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPage(1);
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
            <div className="grid gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
                <p className="text-muted-foreground">View logs of server</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Logs table</CardTitle>
                    <CardDescription>Logs count: {data?.totalItems}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6">
                        <div className="flex items-center gap-4">
                            <InputSearchLoader
                                onChange={debouncedChangeHandler}
                                isLoading={isLoading || isFetching}
                                placeholder="Search by message..."
                            />
                            <div className="flex items-center gap-2">
                                Log type:
                                <Select
                                    onValueChange={(value) => setActiveLogType(value)}
                                    defaultValue="All">
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Log type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {optionsLogTypes.map((el) => (
                                            <SelectItem key={el.value} value={el.value}>
                                                {el.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                Level type:
                                <Select
                                    onValueChange={(value) => setActiveLevelType(value)}
                                    defaultValue="All">
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Level type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {optionsLevelTypes.map((el) => (
                                            <SelectItem key={el.value} value={el.value}>
                                                {el.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {isLoading ? (
                            <Loader />
                        ) : error ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-destructive">Error load data</div>
                            </div>
                        ) : (
                            <>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Log type</TableHead>
                                                <TableHead>Level type</TableHead>
                                                <TableHead>Message</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data?.logs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="font-medium">
                                                        {getNormalDate(log.createdAt)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="default"
                                                            className={getLogTypeColor(
                                                                log.logType
                                                            )}>
                                                            {logTypesMapping[log.logType]}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="default"
                                                            className={getLevelTypeColor(
                                                                log.levelType
                                                            )}>
                                                            {levelTypesMapping[log.levelType]}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <PopoverMessage message={log.message} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                {data?.totalItems && totalPages > 1 && (
                                    <div className="flex w-full items-center justify-center">
                                        <CustomPagination
                                            currentPage={page}
                                            onPageChange={setPage}
                                            totalPages={totalPages}
                                            limit={limit}
                                            setLimit={setLimit}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
