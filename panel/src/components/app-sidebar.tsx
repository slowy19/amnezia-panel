'use client';

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { Navigation } from '@/lib/data/navigation';

type Navbar = {
    navigation: Navigation;
};

export function AppSidebar({ navigation }: Readonly<Navbar>) {
    const pathname = usePathname();

    return (
        <Sidebar>
            <SidebarHeader>
                <h1 className="font-bold">{process.env.NEXT_PUBLIC_VPN_NAME}</h1>
                <span className="text-xs text-neutral-700">Admin panel</span>
            </SidebarHeader>

            <SidebarContent>
                {navigation.navMain.map((item) => (
                    <SidebarGroup key={item.title}>
                        <SidebarGroupLabel>
                            <span className="font-semibold uppercase">{item.title}</span>
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {item.items.map((menuItem) => {
                                    const isActive = pathname === menuItem.url;

                                    return (
                                        <SidebarMenuItem key={menuItem.title}>
                                            <SidebarMenuButton asChild isActive={isActive}>
                                                <Link href={menuItem.url}>{menuItem.title}</Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
        </Sidebar>
    );
}
