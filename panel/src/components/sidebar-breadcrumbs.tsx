'use client';

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { usePathname } from 'next/navigation';
import { navigation } from '@/lib/data/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function SidebarBreadCrumbs() {
    const pathname = usePathname();

    const foundActivePage = navigation.navMain
        .flatMap((el) => el.items)
        .find((el) => pathname.startsWith(el.url));

    return (
        <header className="mb-5 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex w-full items-center justify-between gap-5">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbPage>{foundActivePage?.title}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        </header>
    );
}
