"use client";

import { Buttons } from "@/components/atoms/buttons";
import { cn } from "@/lib/utils";

interface PaginationProps {
    /** 1-based. */
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    /** Kalau diisi, tampilkan "Showing a–b of N". */
    totalItems?: number;
    pageSize?: number;
    className?: string;
}

/**
 * Pager bersama ("Prev / Next" + "Page x of y" / "Showing a–b of N").
 * DataTable memakainya di footer; halaman dengan list manual (card grid,
 * masonry) memakainya langsung.
 */
export function Pagination({ page, pageCount, onPageChange, totalItems, pageSize, className }: PaginationProps) {
    const safeCount = Math.max(pageCount, 1);
    const from = totalItems !== undefined && pageSize ? Math.min((page - 1) * pageSize + 1, totalItems) : undefined;
    const to = totalItems !== undefined && pageSize ? Math.min(page * pageSize, totalItems) : undefined;

    return (
        <div className={cn("flex items-center justify-between gap-3 text-xs text-xenia-stone-500", className)}>
            <span className="tabular-nums">
                {from !== undefined && to !== undefined
                    ? totalItems === 0
                        ? "No results"
                        : `Showing ${from}–${to} of ${totalItems}`
                    : `Page ${page} of ${safeCount}`}
            </span>
            <div className="flex gap-2">
                <Buttons style="second" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
                    Prev
                </Buttons>
                <Buttons
                    style="second"
                    size="sm"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= safeCount}
                >
                    Next
                </Buttons>
            </div>
        </div>
    );
}
