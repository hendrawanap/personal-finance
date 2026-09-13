import type { ReactNode } from "react";

import { BADGE_TONE_CLASS, toneForStatus, type BadgeTone } from "@/constant/status";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    /** Teks status. Kalau `tone` tidak diisi, warna diambil dari `constant/status`. */
    status?: string | null;
    tone?: BadgeTone;
    /** Ganti label yang tampil (default: `status` dengan kapital pertama). */
    children?: ReactNode;
    /** `pill` (default) bulat penuh; `square` sudut kecil untuk sel tabel padat. */
    shape?: "pill" | "square";
    size?: "sm" | "md";
    /** Titik warna di depan teks. */
    dot?: boolean;
    className?: string;
}

function humanize(s: string) {
    return s.replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Chip status bersama. Menggantikan ±20 `<span className="rounded-full bg-[#E4EFE2] …">`
 * dan `STATUS_BADGE` lokal.
 */
export function StatusBadge({
    status,
    tone,
    children,
    shape = "pill",
    size = "sm",
    dot = false,
    className,
}: StatusBadgeProps) {
    const t = tone ?? toneForStatus(status);
    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium",
                shape === "pill" ? "rounded-full" : "rounded-md",
                size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
                BADGE_TONE_CLASS[t],
                className,
            )}
        >
            {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
            {children ?? (status ? humanize(status) : "—")}
        </span>
    );
}
