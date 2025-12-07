'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { truncateMessage } from '@/lib/utils';

interface Props {
    message: string | null;
}

export const PopoverMessage = ({ message }: Readonly<Props>) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    disabled={!message || message === '—'}
                    className="h-auto p-0 text-left justify-start font-normal hover:bg-muted/50">
                    <span className="text-pretty">{truncateMessage(message || '—')}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="start">
                <div className="space-y-1 p-4">
                    <h4 className="font-medium text-sm text-muted-foreground">
                        Full message
                    </h4>
                </div>
                <ScrollArea className="h-[200px] px-4">
                    <p className="text-sm text-pretty leading-relaxed pb-4 wrap-break-word">
                        {message}
                    </p>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};
