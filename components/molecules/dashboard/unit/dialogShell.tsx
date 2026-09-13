"use client";

import {
    useEffect,
    useRef,
    useSyncExternalStore,
    type ReactNode,
    type Ref,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Cancel01Icon } from "hugeicons-react";

import { cn } from "@/lib/utils";

export type DialogSize = "sm" | "md" | "lg" | "xl";

const SIZE: Record<DialogSize, string> = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
};

/**
 * Apakah sudah berjalan di browser. Portal tidak bisa dirender di server, dan
 * menyetel flag-nya lewat useState+useEffect melanggar react-hooks/set-state-in-effect.
 */
const neverChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

/** `top` untuk dialog yang isinya tumbuh sambil diketik (command palette). */
export type DialogAlign = "center" | "top";

interface DialogShellProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    /** Sembunyikan bar judul (judul tetap dipakai sebagai aria-label). */
    hideHeader?: boolean;
    size?: DialogSize;
    /** Tombol-tombol di bar bawah. Urutkan Cancel dulu, aksi utama paling kanan. */
    footer?: ReactNode;
    /** Isi tanpa padding & scroll bawaan (mis. grid media). */
    bare?: boolean;
    /** Klik overlay / Esc tidak menutup (saat mutasi berjalan). */
    lock?: boolean;
    /**
     * Ref ke elemen yang men-scroll isi dialog. Dibutuhkan oleh infinite scroll
     * di dalam modal (IntersectionObserver butuh root yang benar) — pakai
     * callback ref kalau nilainya harus memicu render, bukan useRef.
     */
    bodyRef?: Ref<HTMLDivElement>;
    /** Kelas tambahan untuk area isi (mis. `flex flex-col` supaya anak `bare` bisa scroll sendiri). */
    bodyClassName?: string;
    /** Posisi panel. Default `center`. */
    align?: DialogAlign;
    /**
     * Elemen yang menerima fokus saat dialog dibuka, mis. kotak pencarian.
     *
     * Tanpa ini panel-lah yang difokuskan: `autoFocus` di anak kalah karena
     * effect milik induk berjalan BELAKANGAN dan memindahkan fokus balik ke
     * panel — kotak yang langsung bisa diketik harus diminta lewat prop ini.
     */
    initialFocusRef?: RefObject<HTMLElement | null>;
    className?: string;
    children: ReactNode;
}

/**
 * Cangkang dialog bersama: overlay, panel, Esc, scroll-lock, fokus.
 * Semua modal dashboard (form modal, picker, konfirmasi) dibangun di atas ini —
 * jangan menulis `fixed inset-0 bg-black/40` sendiri.
 */
export function DialogShell({
    open,
    onClose,
    title,
    description,
    hideHeader = false,
    size = "md",
    footer,
    bare = false,
    lock = false,
    bodyRef,
    bodyClassName,
    align = "center",
    initialFocusRef,
    className,
    children,
}: DialogShellProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const mounted = useSyncExternalStore(neverChanges, onClient, onServer);

    useEffect(() => {
        if (!open) return;

        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !lock) onClose();
        };
        document.addEventListener("keydown", onKey);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const previouslyFocused = document.activeElement as HTMLElement | null;
        (initialFocusRef?.current ?? panelRef.current)?.focus();

        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, [open, onClose, lock, initialFocusRef]);

    if (!open || !mounted) return null;

    /**
     * Dirender lewat portal ke <body>, BUKAN di tempatnya dipanggil.
     *
     * `position: fixed` tidak selalu berpatokan pada viewport: begitu ada
     * leluhur ber-`transform`, `filter`, `backdrop-filter`, `perspective`,
     * `will-change` atau `contain`, leluhur itulah yang jadi containing
     * block-nya. Header dashboard punya `backdrop-blur`, jadi dialog yang
     * dipanggil dari sana dapat overlay setinggi header — bukan setinggi layar.
     * Gejalanya cuma terlihat di satu tempat pemanggilan, jadi mahal sekali
     * didiagnosis; portal membuatnya tidak bisa terjadi di mana pun.
     */
    return createPortal(
        <div
            className={cn(
                "fixed inset-0 z-[60] flex justify-center p-4",
                align === "top" ? "items-start pt-[12vh]" : "items-center",
            )}
        >
            <div
                className="absolute inset-0 bg-xenia-forest-950/60 backdrop-blur-[2px]"
                onClick={lock ? undefined : onClose}
                aria-hidden
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className={cn(
                    "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-xenia-border bg-white shadow-2xl outline-none",
                    SIZE[size],
                    className,
                )}
            >
                {!hideHeader && (title || description) && (
                    <div className="flex items-start justify-between gap-4 border-b border-xenia-divider px-5 py-4">
                        <div className="min-w-0">
                            {title && (
                                <h2 className="font-display text-lg font-medium text-xenia-ink-900">{title}</h2>
                            )}
                            {description && (
                                <p className="mt-0.5 text-sm text-xenia-stone-500">{description}</p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={lock}
                            aria-label="Close"
                            className="-mr-1 -mt-1 rounded-lg p-1.5 text-xenia-stone-500 transition-colors hover:bg-xenia-cream hover:text-xenia-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xenia-moss-600/40 disabled:opacity-50"
                        >
                            <Cancel01Icon size={16} />
                        </button>
                    </div>
                )}

                <div
                    ref={bodyRef}
                    className={cn(
                        "min-h-0 flex-1",
                        bare ? "overflow-hidden" : "overflow-y-auto px-5 py-4",
                        bodyClassName,
                    )}
                >
                    {children}
                </div>

                {footer && (
                    <div className="flex items-center justify-end gap-2 border-t border-xenia-divider bg-xenia-cream px-5 py-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
