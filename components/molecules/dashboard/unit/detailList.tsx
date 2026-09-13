import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DetailListProps {
    children: ReactNode;
    className?: string;
}

/** `<dl>` untuk pasangan label–nilai di halaman detail. Isi dengan `DetailRow`. */
export function DetailList({ children, className }: DetailListProps) {
    return <dl className={cn("divide-y divide-xenia-divider", className)}>{children}</dl>;
}

interface DetailRowProps {
    label: ReactNode;
    children?: ReactNode;
    /** `row` (default): label kiri, nilai kanan. `stack`: label kecil di atas nilai. */
    layout?: "row" | "stack";
    className?: string;
}

export function DetailRow({ label, children, layout = "row", className }: DetailRowProps) {
    if (layout === "stack") {
        return (
            <div className={cn("py-2.5", className)}>
                <dt className="text-xs font-medium uppercase tracking-wide text-xenia-stone-500">{label}</dt>
                <dd className="mt-0.5 text-sm break-words text-xenia-ink-900">{children ?? "—"}</dd>
            </div>
        );
    }
    return (
        <div className={cn("flex items-start justify-between gap-4 py-2.5", className)}>
            <dt className="shrink-0 text-sm text-xenia-stone-500">{label}</dt>
            <dd className="min-w-0 text-right text-sm font-medium break-words text-xenia-ink-900">{children ?? "—"}</dd>
        </div>
    );
}
