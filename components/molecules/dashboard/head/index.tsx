"use client";

import type { ReactNode } from "react";

import { BackButton } from "@/components/atoms/backButton";
import { cn } from "@/lib/utils";

interface HeadingProps {
    title: string;
    /** Teks di bawah judul. Boleh ReactNode (mis. tanggal dengan `suppressHydrationWarning`). */
    subtitle?: ReactNode;
    /**
     * Landing spot when the tab has no in-app history (pasted URL, new tab,
     * refresh). The arrow is always a real browser back otherwise — it is not
     * a link to this route.
     */
    backUrl?: string;
    /** Sembunyikan panah back. Wajib `true` untuk halaman list/hub (bukan sub-halaman). */
    noIcon?: boolean;
    /**
     * @deprecated Hanya ada satu gaya heading. Prop ini diterima supaya
     * pemakai lama tidak error; akan dihapus setelah migrasi.
     */
    variant?: "warm" | "neutral";
    /** Badge/status di samping judul. */
    badge?: ReactNode;
    /** Slot kanan: tombol aksi utama halaman (Buttons/Links). */
    actions?: ReactNode;
    className?: string;
}

/**
 * Header halaman. Satu gaya untuk seluruh dashboard:
 * panah back (BackButton) · judul `font-display text-2xl` · subtitle · aksi di kanan.
 *
 * Jangan menulis `<h1>` manual di halaman — kalau butuh sesuatu yang tidak
 * bisa dilakukan komponen ini, tambahkan prop di sini.
 */
export function Heading({
    title,
    subtitle,
    backUrl,
    noIcon = false,
    badge,
    actions,
    className,
}: HeadingProps) {
    return (
        <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
            <div className="flex min-w-0 items-center gap-3">
                {!noIcon && (
                    <BackButton
                        fallbackUrl={backUrl}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-xenia-border bg-white text-xenia-stone-700 transition-colors hover:border-xenia-moss-600 hover:text-xenia-moss-600"
                    />
                )}
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-display text-xl sm:text-2xl font-medium text-xenia-ink-900">
                            {title}
                        </h1>
                        {badge}
                    </div>
                    {subtitle && <p className="mt-1 text-sm text-xenia-stone-500">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="flex w-full sm:w-auto shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
