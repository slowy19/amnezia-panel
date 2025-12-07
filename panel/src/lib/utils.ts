import { clsx, type ClassValue } from 'clsx';
import type { LevelTypes, LogTypes, Protocols } from 'prisma/generated/enums';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const truncateMessage = (message: string, maxLength = 100) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
};

export const getNormalDate = (date: Date): string => {
    return new Date(date).toLocaleString('en', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    });
};

export function formatDate(date: string | number | Date | null): string {
    if (!date) return '';

    return new Date(date).toLocaleString('en', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    });
}

export const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatLastHandshake = (dateString: string | number | null): string => {
    if (!dateString || dateString === '0') return 'Never';

    let date: Date;

    if (typeof dateString === 'string' && /^\d+$/.test(dateString)) {
        date = new Date(Number(dateString) * 1000);
    } else if (typeof dateString === 'number') {
        date = new Date(dateString * 1000);
    } else {
        date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
        return 'Invalid date';
    }

    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
        const diffInMinutes = diffInHours * 60;
        if (diffInMinutes < 1) {
            return 'Just now';
        }
        return `${Math.floor(diffInMinutes)} min ago`;
    } else if (diffInHours < 24) {
        const hours = Math.floor(diffInHours);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else {
        return format(date, 'PPpp');
    }
};

export function getTrpcErrorCode(statusCode: number): any {
    switch (statusCode) {
        case 400:
            return 'BAD_REQUEST';
        case 401:
            return 'UNAUTHORIZED';
        case 403:
            return 'FORBIDDEN';
        case 404:
            return 'NOT_FOUND';
        case 429:
            return 'TOO_MANY_REQUESTS';
        case 500:
        case 502:
        case 503:
        case 504:
            return 'INTERNAL_SERVER_ERROR';
        default:
            return 'INTERNAL_SERVER_ERROR';
    }
}

export const getProtocolColor = (protocol: Protocols) => {
    switch (protocol) {
        case 'AMNEZIAWG':
            return 'bg-red-100 text-red-800';
        case 'AMNEZIAWG':
            return 'bg-purple-100 text-purple-800';
        case 'XRAY':
            return 'bg-zinc-900 text-zinc-50';
    }
};

export const getLevelTypeColor = (levelType: LevelTypes) => {
    switch (levelType) {
        case 'ERROR':
            return 'bg-red-100 text-red-800';
        case 'INFO':
            return 'bg-gray-100 text-gray-800';
        case 'WARNING':
            return 'bg-orange-100 text-orange-800';
    }
};

export const getLogTypeColor = (levelType: LogTypes) => {
    switch (levelType) {
        case 'TELEGRAM':
            return 'bg-blue-100 text-blue-800';
        case 'SERVER':
            return 'bg-pink-100 text-pink-800';
        case 'CLIENT':
            return 'bg-green-100 text-green-800';
    }
};
