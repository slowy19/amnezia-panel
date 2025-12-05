import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const truncateMessage = (message: string, maxLength = 50) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
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
