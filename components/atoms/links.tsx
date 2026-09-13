"use client";

import type { ComponentProps, ReactNode } from "react";
import NextLink from "next/link";

import { buttonClass, type ButtonSize, type ButtonStyle } from "./buttonStyles";

interface LinksProps extends Omit<ComponentProps<typeof NextLink>, "href" | "style"> {
    path: string;
    style?: ButtonStyle;
    size?: ButtonSize;
    icon?: ReactNode;
    children: ReactNode;
}

/**
 * Link yang tampil sebagai tombol. Pakai ini untuk navigasi ("Add Room",
 * "Edit") — JANGAN `<Link><Buttons>…</Buttons></Link>` (button di dalam anchor
 * tidak valid HTML).
 */
export function Links({
    path,
    style = "main",
    size = "md",
    icon,
    children,
    className,
    ...rest
}: LinksProps) {
    return (
        <NextLink href={path} className={buttonClass(style, size, className)} {...rest}>
            {icon}
            {children}
        </NextLink>
    );
}
