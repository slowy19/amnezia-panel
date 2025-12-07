import React from 'react';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from './ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Props {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    limit: string;
    setLimit: React.Dispatch<React.SetStateAction<string>>;
}

const options = [
    {
        value: '25',
        label: '25',
    },
    {
        value: '50',
        label: '50',
    },
    {
        value: '100',
        label: '100',
    },
    {
        value: '200',
        label: '200',
    },
];

export function CustomPagination({
    currentPage,
    onPageChange,
    totalPages,
    limit,
    setLimit,
}: Readonly<Props>) {
    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
        }
    };

    let pages: (number | 'ellipsis')[] = [];

    if (totalPages <= 5) {
        pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
        if (currentPage < 3) {
            pages = [1, 2, 3, 'ellipsis', totalPages];
        } else if (currentPage >= totalPages - 2) {
            pages = [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [
                1,
                'ellipsis',
                currentPage - 1,
                currentPage,
                currentPage + 1,
                'ellipsis',
                totalPages,
            ];
        }
    }

    const handleChangeLimit = (value: string) => {
        setLimit(value);
        handlePageChange(1);
    };

    return (
        <div className="flex items-center gap-2">
            <Select value={limit} onValueChange={handleChangeLimit}>
                <SelectTrigger>
                    <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((el) => (
                        <SelectItem key={el.value} value={el.value}>
                            {el.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Pagination>
                <PaginationContent>
                    <PaginationItem className="cursor-pointer">
                        <PaginationPrevious
                            size="default"
                            onClick={() => handlePageChange(currentPage - 1)}
                        />
                    </PaginationItem>

                    {pages.map((page, index) => {
                        if (page === 'ellipsis') {
                            return (
                                <PaginationItem key={`ellipsis-${index}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            );
                        } else {
                            return (
                                <PaginationItem key={page} className="cursor-pointer">
                                    <PaginationLink
                                        size="default"
                                        isActive={currentPage === page}
                                        onClick={() => handlePageChange(page)}>
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            );
                        }
                    })}

                    <PaginationItem className="cursor-pointer">
                        <PaginationNext
                            size="default"
                            onClick={() => handlePageChange(currentPage + 1)}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
}
