"use client";

import type {
    ComponentProps,
    ReactNode,
    SelectHTMLAttributes,
    TextareaHTMLAttributes,
} from "react";
import { useId } from "react";
import { ArrowDown01Icon } from "hugeicons-react";

import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------------------
 * Form kit dashboard — SATU gaya untuk semua form.
 *
 * Halaman tidak boleh mendefinisikan `inputClass`/`Field`/`SectionCard`
 * sendiri. Kalau ada kebutuhan yang belum tertampung, tambahkan di sini.
 *
 *   <FormSection title="Basic information">
 *     <div className="grid gap-4 md:grid-cols-2">
 *       <Field label="Name" required error={errors.name}>
 *         <TextInput value={name} onChange={…} invalid={!!errors.name} />
 *       </Field>
 *       <Field label="Status">
 *         <NativeSelect value={status} onChange={…}>…</NativeSelect>
 *       </Field>
 *     </div>
 *   </FormSection>
 *   <FormFooter cancelFallbackUrl="/dashboard/room">
 *     <Buttons type="submit" loading={isPending}>Save</Buttons>
 *   </FormFooter>
 * -------------------------------------------------------------------------- */

export const LABEL_CLASS =
    "block text-xs font-medium uppercase tracking-wide text-xenia-stone-500";

const CONTROL_BASE =
    "w-full rounded-lg border bg-white px-3 py-2 text-sm text-xenia-ink-900 outline-none transition-colors " +
    "placeholder:text-xenia-stone-400 focus:border-xenia-moss-600 focus:ring-2 focus:ring-xenia-moss-600/15 " +
    "disabled:cursor-not-allowed disabled:bg-xenia-cream disabled:text-xenia-stone-500 read-only:bg-xenia-cream";

/** Kelas kontrol form (input/select/textarea). Ekspor untuk kasus khusus yang perlu elemen sendiri. */
export function controlClass(invalid?: boolean, className?: string) {
    return cn(CONTROL_BASE, invalid ? "border-xenia-danger" : "border-xenia-border", className);
}

/* ---------------------------------- Field --------------------------------- */

interface FieldProps {
    label: ReactNode;
    /** Diteruskan ke `<label htmlFor>`; kalau kosong, label membungkus kontrol. */
    htmlFor?: string;
    hint?: ReactNode;
    error?: string;
    required?: boolean;
    className?: string;
    children: ReactNode;
}

/** Label · kontrol · hint/error. Menggantikan `FormField`/`Field` lokal di tiap halaman. */
export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
    return (
        <div className={cn("space-y-1.5", className)}>
            <label htmlFor={htmlFor} className={LABEL_CLASS}>
                {label}
                {required && (
                    <span className="ml-0.5 normal-case text-xenia-danger" aria-hidden>
                        *
                    </span>
                )}
            </label>
            {children}
            {error ? (
                <p className="text-xs text-xenia-danger" role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p className="text-xs text-xenia-stone-400">{hint}</p>
            ) : null}
        </div>
    );
}

/* -------------------------------- Controls -------------------------------- */

type Invalid = { invalid?: boolean };

/** `ref` diteruskan ke `<input>` (React 19: ref adalah prop biasa) — untuk fokus programatik. */
export function TextInput({
    invalid,
    className,
    ...props
}: ComponentProps<"input"> & Invalid) {
    return <input {...props} aria-invalid={invalid || undefined} className={controlClass(invalid, className)} />;
}

export function TextArea({
    invalid,
    className,
    rows = 3,
    ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & Invalid) {
    return (
        <textarea
            {...props}
            rows={rows}
            aria-invalid={invalid || undefined}
            className={controlClass(invalid, cn("resize-y", className))}
        />
    );
}

/** `<select>` native bergaya form, dengan ikon chevron. Untuk opsi berbasis array pakai `Selects variant="form"`. */
export function NativeSelect({
    invalid,
    className,
    children,
    ...props
}: SelectHTMLAttributes<HTMLSelectElement> & Invalid) {
    return (
        <div className={cn("relative", className)}>
            <select
                {...props}
                aria-invalid={invalid || undefined}
                className={controlClass(invalid, "appearance-none pr-9")}
            >
                {children}
            </select>
            <ArrowDown01Icon
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xenia-stone-500"
            />
        </div>
    );
}

/* --------------------------------- Switch --------------------------------- */

interface SwitchProps {
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    id?: string;
    "aria-label"?: string;
    className?: string;
}

/** Toggle polos (tanpa label/card). Untuk versi berlabel pakai `Toggles` dari atoms. */
export function Switch({ checked, onChange, disabled, id, className, ...rest }: SwitchProps) {
    const autoId = useId();
    return (
        <label className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center", disabled && "cursor-not-allowed opacity-60", className)}>
            <input
                id={id ?? autoId}
                type="checkbox"
                role="switch"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                className="peer absolute inset-0 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                {...rest}
            />
            <span
                className={cn(
                    "h-6 w-11 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-xenia-moss-600/40",
                    checked ? "bg-xenia-moss-600" : "bg-xenia-border",
                )}
            />
            <span
                className={cn(
                    "absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    checked ? "translate-x-5" : "translate-x-0",
                )}
            />
        </label>
    );
}

/* ------------------------------- Structure -------------------------------- */

interface FormSectionProps {
    title?: string;
    description?: string;
    /** Ikon kecil di depan judul (mis. kalender untuk section jadwal). */
    icon?: ReactNode;
    /** Slot kanan di header section (mis. tombol "Add"). */
    actions?: ReactNode;
    className?: string;
    children: ReactNode;
}

/** Card putih untuk satu kelompok field. Menggantikan `SectionCard`/`FormCard`/`ActivityFormCard`. */
export function FormSection({ title, description, icon, actions, className, children }: FormSectionProps) {
    return (
        <section className={cn("space-y-4 rounded-2xl border border-xenia-border bg-white p-5", className)}>
            {(title || actions) && (
                <div className="flex items-start justify-between gap-3">
                    <div>
                        {title && (
                            <h2 className="flex items-center gap-1.5 font-display text-base font-medium text-xenia-ink-900">
                                {icon && <span className="text-xenia-stone-400">{icon}</span>}
                                {title}
                            </h2>
                        )}
                        {description && <p className="mt-0.5 text-xs text-xenia-stone-500">{description}</p>}
                    </div>
                    {actions}
                </div>
            )}
            {children}
        </section>
    );
}

interface FormFooterProps {
    /** Slot kiri (mis. tombol Delete/danger). */
    start?: ReactNode;
    /** Tombol aksi (Cancel + Submit) — urutkan Cancel dulu, submit paling kanan. */
    children: ReactNode;
    /** Menempel di bawah viewport untuk form panjang. */
    sticky?: boolean;
    className?: string;
}

export function FormFooter({ start, children, sticky = false, className }: FormFooterProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-between gap-3",
                sticky &&
                    "sticky bottom-0 -mx-6 -mb-6 mt-2 border-t border-xenia-border bg-xenia-canvas/95 px-6 py-3 backdrop-blur",
                className,
            )}
        >
            <div className="flex items-center gap-2">{start}</div>
            <div className="flex items-center gap-2">{children}</div>
        </div>
    );
}
