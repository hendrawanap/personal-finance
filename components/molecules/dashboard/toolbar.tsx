"use client";

import type { ReactNode } from "react";
import { Cancel01Icon } from "hugeicons-react";

import { Buttons } from "@/components/atoms/buttons";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Kontainer utama toolbar list/index.
 * Menyusun kelompok kontrol filter di kiri dan utilitas/reset di kanan secara responsif.
 */
export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Kelompok elemen input (SearchBars, Selects, PillTabs, dll.) di dalam Toolbar.
 */
export function ToolbarGroup({
  children,
  className,
  align = "start",
}: {
  children: ReactNode;
  className?: string;
  align?: "start" | "end";
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5",
        align === "end" && "ml-auto justify-end",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ClearFilterButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

/**
 * Tombol standar untuk mereset filter yang sedang aktif kembali ke default.
 */
export function ClearFilterButton({
  onClick,
  label = "Clear filters",
  className,
}: ClearFilterButtonProps) {
  return (
    <Buttons
      style="ghost"
      size="sm"
      onClick={onClick}
      icon={<Cancel01Icon size={14} />}
      className={cn(
        "whitespace-nowrap text-xenia-stone-500 hover:text-xenia-ink-900",
        className,
      )}
    >
      {label}
    </Buttons>
  );
}
