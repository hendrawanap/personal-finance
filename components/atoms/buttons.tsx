"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loading03Icon } from "hugeicons-react";

import { buttonClass, type ButtonSize, type ButtonStyle } from "./buttonStyles";

interface ButtonsProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
    style?: ButtonStyle;
    size?: ButtonSize;
    icon?: ReactNode;
    /** Tampilkan spinner dan nonaktifkan tombol (untuk mutasi yang sedang berjalan). */
    loading?: boolean;
    children: ReactNode;
}

/**
 * Tombol dashboard. Jangan menulis `<button className="bg-[#4F6B52] …">` di
 * halaman — pakai ini (atau `Links` untuk navigasi).
 */
export function Buttons({
    style = "main",
    size = "md",
    icon,
    loading = false,
    children,
    className,
    type = "button",
    disabled,
    ...rest
}: ButtonsProps) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={buttonClass(style, size, className)}
            {...rest}
        >
            {loading ? <Loading03Icon size={16} className="animate-spin" aria-hidden /> : icon}
            {children}
        </button>
    );
}
