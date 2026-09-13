"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface PillTabOption<T extends string> {
    value: T;
    label: ReactNode;
    disabled?: boolean;
    /** Titik warna kecil di depan label (mis. locale terisi / kosong). */
    dot?: boolean;
}

interface PillTabsProps<T extends string> {
    options: ReadonlyArray<PillTabOption<T>>;
    value: T;
    onChange: (value: T) => void;
    size?: "sm" | "md";
    /** @deprecated Semua tabs kini seragam menggunakan style solid moss (tanpa variasi). */
    variant?: "solid" | "soft";
    "aria-label"?: string;
    className?: string;
}

/**
 * Segmented control / pill tabs untuk switcher: locale, scope, view mode, sub-tabs.
 *
 * Menggunakan satu style standar seragam di seluruh dashboard (Solid Moss):
 * container `bg-xenia-sand-100`, item aktif `bg-xenia-moss-600 text-white shadow-sm`.
 */
export function PillTabs<T extends string>({
    options,
    value,
    onChange,
    size = "sm",
    className,
    ...rest
}: PillTabsProps<T>) {
    return (
        <div
            role="tablist"
            aria-label={rest["aria-label"]}
            className={cn(
                "inline-flex items-center w-fit max-w-full self-start rounded-lg bg-xenia-sand-100 p-0.5 text-xenia-stone-700",
                className
            )}
        >
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        disabled={opt.disabled}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xenia-moss-600/40 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
                            size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
                            active
                                ? "bg-xenia-moss-600 text-white shadow-sm"
                                : "text-xenia-stone-700 hover:text-xenia-ink-900",
                        )}
                    >
                        {opt.dot !== undefined && (
                            <span
                                aria-hidden
                                className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    opt.dot ? "bg-current" : "border border-current opacity-50",
                                )}
                            />
                        )}
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
