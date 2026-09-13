"use client";

import { useState, type ReactNode } from "react";
import { Alert02Icon, Delete02Icon } from "hugeicons-react";

import { Buttons } from "@/components/atoms/buttons";
import { TextInput } from "@/components/molecules/inputs/form";
import { cn } from "@/lib/utils";

import { DialogShell } from "./dialogShell";

type Tone = "danger" | "default";

interface ConfirmDialogProps {
    /** Default `true` supaya pemakai lama yang merender kondisional tetap jalan. */
    open?: boolean;
    title: string;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    /** `danger` (default): ikon & tombol merah. `default`: tombol hijau. */
    tone?: Tone;
    /** Spinner + kunci dialog selama mutasi. */
    isPending?: boolean;
    /** Pesan error mutasi, ditampilkan di dalam dialog. */
    error?: string | null;
    /**
     * Kalau diisi, user harus mengetik teks ini persis sebelum tombol konfirmasi
     * aktif (hapus permanen). Menggantikan ForceDeleteDialog / typed-delete deals.
     */
    typedConfirmation?: string;
    onConfirm: () => void | Promise<unknown>;
    onCancel: () => void;
}

/**
 * Dialog konfirmasi bersama (hapus, publish, reset, …).
 * Satu-satunya cara menampilkan konfirmasi di dashboard — JANGAN `window.confirm`
 * dan jangan membuat `DeleteXModal` lokal.
 */
export default function ConfirmDialog({ open = true, ...props }: ConfirmDialogProps) {
    // State ketikan hidup di body supaya otomatis reset setiap dialog dibuka.
    if (!open) return null;
    return <ConfirmDialogBody {...props} />;
}

function ConfirmDialogBody({
    title,
    description,
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
    tone = "danger",
    isPending = false,
    error,
    typedConfirmation,
    onConfirm,
    onCancel,
}: Omit<ConfirmDialogProps, "open">) {
    const [typed, setTyped] = useState("");

    const typedOk = !typedConfirmation || typed.trim() === typedConfirmation;
    const danger = tone === "danger";

    return (
        <DialogShell open onClose={onCancel} title={title} hideHeader size="sm" lock={isPending}>
            <div
                className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    danger ? "bg-xenia-danger-soft text-xenia-danger" : "bg-xenia-ok-bg text-xenia-ok-ink",
                )}
            >
                {danger ? <Delete02Icon size={18} /> : <Alert02Icon size={18} />}
            </div>
            <h2 className="mt-4 font-display text-lg font-medium text-xenia-ink-900">{title}</h2>
            {description && <div className="mt-1 text-sm text-xenia-stone-500">{description}</div>}

            {typedConfirmation && (
                <div className="mt-4 space-y-1.5">
                    <p className="text-xs text-xenia-stone-700">
                        Type <span className="font-mono font-semibold text-xenia-ink-900">{typedConfirmation}</span> to confirm.
                    </p>
                    <TextInput
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        autoFocus
                        autoComplete="off"
                        disabled={isPending}
                    />
                </div>
            )}

            {error && (
                <p role="alert" className="mt-3 rounded-lg border border-xenia-danger-line bg-xenia-danger-soft px-3 py-2 text-xs text-xenia-danger-ink">
                    {error}
                </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
                <Buttons style="second" onClick={onCancel} disabled={isPending}>
                    {cancelLabel}
                </Buttons>
                <Buttons
                    style={danger ? "fourth" : "main"}
                    onClick={() => void onConfirm()}
                    loading={isPending}
                    disabled={!typedOk}
                >
                    {confirmLabel}
                </Buttons>
            </div>
        </DialogShell>
    );
}
