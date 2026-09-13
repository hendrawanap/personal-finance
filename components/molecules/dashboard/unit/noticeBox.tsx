import type { ReactNode } from "react";
import { Alert02Icon, CheckmarkCircle02Icon, InformationCircleIcon } from "hugeicons-react";

import { cn } from "@/lib/utils";

type NoticeTone = "success" | "error" | "warning" | "info";

const TONE: Record<NoticeTone, { box: string; Icon: typeof Alert02Icon }> = {
    success: { box: "border-xenia-ok-ink/25 bg-xenia-ok-bg text-xenia-ok-ink", Icon: CheckmarkCircle02Icon },
    error: { box: "border-xenia-danger-line bg-xenia-danger-soft text-xenia-danger-ink", Icon: Alert02Icon },
    warning: { box: "border-xenia-brass-500/30 bg-xenia-warn-bg text-xenia-warn-ink", Icon: Alert02Icon },
    info: { box: "border-xenia-info-ink/25 bg-xenia-info-bg text-xenia-info-ink", Icon: InformationCircleIcon },
};

interface NoticeBoxProps {
    tone?: NoticeTone;
    title?: string;
    children?: ReactNode;
    /** Slot kanan (tombol "Dismiss", "Retry", link). */
    action?: ReactNode;
    className?: string;
}

/**
 * Banner inline (sukses/error/peringatan/info) di dalam halaman atau form.
 * Menggantikan kotak `border-[#D6E0D3] bg-[#EEF2ED]` dsb. yang ditulis ulang di tiap halaman.
 * Untuk umpan balik sesaat setelah mutasi tetap pakai toast.
 */
export function NoticeBox({ tone = "info", title, children, action, className }: NoticeBoxProps) {
    const { box, Icon } = TONE[tone];
    return (
        <div
            role={tone === "error" ? "alert" : "status"}
            className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", box, className)}
        >
            <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
                {title && <p className="font-medium">{title}</p>}
                {children && <div className={cn(title && "mt-0.5", "text-[13px] opacity-90")}>{children}</div>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
