type NavigationItem = {
    title: string;
    url: string;
};

type NavigationSection = {
    title: string;
    url: string;
    items: NavigationItem[];
};

export type Navigation = {
    navMain: NavigationSection[];
};

export const navigation: Navigation = {
    navMain: [
        {
            title: 'Clients',
            url: '#',
            items: [
                {
                    title: 'Clients table',
                    url: '/clients',
                },
                {
                    title: 'Create client',
                    url: '/create-client',
                },
            ],
        },
        {
            title: 'Info',
            url: '#',
            items: [
                {
                    title: 'Server',
                    url: '/server',
                },
                {
                    title: 'Logs',
                    url: '/logs',
                },
            ],
        },
    ],
};
