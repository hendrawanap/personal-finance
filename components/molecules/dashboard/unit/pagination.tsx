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
    const calculatedCount =
        totalItems !== undefined && pageSize && pageSize > 0
            ? Math.ceil(totalItems / pageSize)
            : pageCount;
    const safeCount = Math.max(calculatedCount, 1);

    const from =
        totalItems !== undefined && pageSize
            ? totalItems === 0
                ? 0
                : Math.min((page - 1) * pageSize + 1, totalItems)
            : undefined;
    const to =
        totalItems !== undefined && pageSize ? Math.min(page * pageSize, totalItems) : undefined;

    // Generate page numbers to display
    const pageNumbers = (() => {
        if (safeCount <= 5) {
            return Array.from({ length: safeCount }, (_, i) => i + 1);
        }
        if (page <= 3) {
            return [1, 2, 3, 4, "...", safeCount];
        }
        if (page >= safeCount - 2) {
            return [1, "...", safeCount - 3, safeCount - 2, safeCount - 1, safeCount];
        }
        return [1, "...", page - 1, page, page + 1, "...", safeCount];
    })();

    return (
        <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-xenia-stone-500", className)}>
            <span className="tabular-nums text-center sm:text-left">
                {from !== undefined && to !== undefined
                    ? totalItems === 0
                        ? "No results"
                        : `Showing ${from}–${to} of ${totalItems} (Page ${page} of ${safeCount})`
                    : `Page ${page} of ${safeCount}`}
            </span>
            <div className="flex items-center gap-1.5">
                <Buttons style="second" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
                    Prev
                </Buttons>
                <span className="inline-block sm:hidden px-2 font-mono text-xs text-xenia-stone-600">
                    {page} / {safeCount}
                </span>
                <div className="hidden sm:inline-flex items-center gap-1.5">
                    {safeCount > 1 &&
                        pageNumbers.map((p, idx) =>
                            p === "..." ? (
                                <span key={`dots-${idx}`} className="px-1 text-xenia-stone-400 select-none">
                                    …
                                </span>
                            ) : (
                                <Buttons
                                    key={p}
                                    style={p === page ? "main" : "second"}
                                    size="sm"
                                    onClick={() => onPageChange(Number(p))}
                                    className="min-w-7 px-2 font-mono"
                                    aria-current={p === page ? "page" : undefined}
                                >
                                    {p}
                                </Buttons>
                            ),
                        )}
                </div>
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
