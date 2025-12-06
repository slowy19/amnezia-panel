'use client';

import {  useId, type ChangeEventHandler, type RefObject } from 'react';

import { LoaderCircleIcon, SearchIcon } from 'lucide-react';
import { Input } from './ui/input';

interface Props {
    placeholder?: string;
    value?: string;
    onChange?: ChangeEventHandler<HTMLInputElement>;
    isLoading?: boolean;
    className?: string;
    ref?: RefObject<HTMLInputElement | null>
}

export const InputSearchLoader = ({ placeholder, value, onChange, isLoading, className, ref }: Readonly<Props>) => {
    const id = useId();

    return (
        <div className={`w-full max-w-xs space-y-2 ${className}`}>
            <div className="relative">
                <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                    <SearchIcon className="size-4" />
                    <span className="sr-only">Search</span>
                </div>
                <Input
                    id={id}
                    type="search"
                    placeholder={placeholder || 'Поиск...'}
                    value={value}
                    onChange={onChange}
                    ref={ref}
                    className="peer px-9 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
                />
                {isLoading && (
                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 peer-disabled:opacity-50">
                        <LoaderCircleIcon className="size-4 animate-spin" />
                        <span className="sr-only">Loading...</span>
                    </div>
                )}
            </div>
        </div>
    );
};
