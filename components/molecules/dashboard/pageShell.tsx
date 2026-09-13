"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageWidth = "default" | "narrow" | "full";

const WIDTH: Record<PageWidth, string> = {
    default: "max-w-7xl",
    narrow: "max-w-4xl",
    full: "max-w-none",
};

interface PageShellProps {
    children: ReactNode;
    /** Lebar konten: `default` (7xl) untuk list/detail, `narrow` (4xl) untuk form sederhana. */
    width?: PageWidth;
    /** Kelas tambahan untuk pembungkus konten (bukan `<main>`). */
    className?: string;
    /** Jarak vertikal antar blok anak. Default `space-y-5`. */
    spacing?: "sm" | "md" | "lg";
}

const SPACING = { sm: "space-y-4", md: "space-y-5", lg: "space-y-8" } as const;

/**
 * Pembungkus terluar SETIAP halaman dashboard.
 *
 * Menggantikan tujuh varian `<main className="flex-1 space-y-5 bg-[#F2ECDD] p-6">`
 * / `<div className="min-h-screen … px-6 py-8 md:px-10">` yang tersebar.
 * Layout dashboard sudah `h-screen overflow-y-auto`, jadi halaman TIDAK boleh
 * memakai `min-h-screen` lagi.
 */
export function PageShell({
    children,
    width = "default",
    className,
    spacing = "md",
}: PageShellProps) {
    return (
        <main className="flex-1 bg-xenia-canvas p-6">
            <div className={cn("mx-auto w-full", WIDTH[width], SPACING[spacing], className)}>
                {children}
            </div>
        </main>
    );
}
