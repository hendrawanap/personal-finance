"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CheckboxFieldsProps {
    label: ReactNode;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export function CheckboxFields({ label, checked, onChange, disabled, className }: CheckboxFieldsProps) {
    return (
        <label
            className={cn(
                "flex cursor-pointer items-center gap-2 text-sm text-xenia-stone-700",
                disabled && "cursor-not-allowed opacity-60",
                className,
            )}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 accent-xenia-moss-600"
            />
            {label}
        </label>
    );
}
