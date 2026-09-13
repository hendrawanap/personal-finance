"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { StatusBadge } from "@/components/atoms/statusBadge";
import type { BadgeTone } from "@/constant/status";
import { cn } from "@/lib/utils";

export type StatAccent = "moss" | "brass" | "info" | "stone" | "idle";

const ACCENT_TILE: Record<StatAccent, string> = {
  moss: "bg-xenia-ok-bg text-xenia-moss-600",
  brass: "bg-xenia-warn-bg text-xenia-brass-500",
  info: "bg-xenia-info-bg text-xenia-info-ink",
  stone: "bg-xenia-sand-100 text-xenia-stone-700",
  idle: "bg-xenia-surface-hover text-xenia-stone-500",
};

const ACCENT_TEXT: Record<StatAccent, string> = {
  moss: "text-xenia-moss-600",
  brass: "text-xenia-brass-500",
  info: "text-xenia-info-ink",
  stone: "text-xenia-stone-700",
  idle: "text-xenia-stone-500",
};

interface StatCardProps {
  /** Label kecil huruf kapital di atas judul (mis. "Loyalty"). */
  eyebrow?: ReactNode;
  title: ReactNode;
  value: ReactNode;
  /** Warna angka utama. Default tinta. */
  valueAccent?: StatAccent;
  /** Chip di samping angka (delta, "Net Growth", …). */
  delta?: ReactNode;
  deltaTone?: BadgeTone;
  deltaIcon?: ReactNode;
  subtext?: ReactNode;
  subtextAccent?: StatAccent;
  /** Ikon di kotak kanan atas. */
  icon?: ReactNode;
  accent?: StatAccent;
  /** Kalau diisi, kartu menjadi link yang bisa diklik. */
  href?: string;
  className?: string;
}

/**
 * Kartu KPI dashboard (angka besar + delta + keterangan). Menggantikan kartu
 * yang disalin-tempel di tiap varian dashboard home.
 */
export function StatCard({
  eyebrow,
  title,
  value,
  valueAccent,
  delta,
  deltaTone = "ok",
  deltaIcon,
  subtext,
  subtextAccent,
  icon,
  accent = "moss",
  href,
  className,
}: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <div>
          {eyebrow && (
            <span className="text-[11px] font-semibold tracking-wider text-xenia-stone-500 uppercase">
              {eyebrow}
            </span>
          )}
          <h3 className={cn("text-sm font-medium text-xenia-stone-700", eyebrow && "mt-1")}>
            {title}
          </h3>
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105",
              ACCENT_TILE[accent],
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={cn(
              "font-display text-2xl sm:text-3xl font-medium tracking-tight tabular-nums break-words",
              valueAccent ? ACCENT_TEXT[valueAccent] : "text-xenia-ink-900",
            )}
          >
            {value}
          </span>
          {delta != null && (
            <StatusBadge tone={deltaTone} shape="square">
              {deltaIcon}
              {delta}
            </StatusBadge>
          )}
        </div>
        {subtext && (
          <p
            className={cn(
              "mt-2 line-clamp-1 text-xs",
              subtextAccent ? ACCENT_TEXT[subtextAccent] : "text-xenia-stone-500",
            )}
          >
            {subtext}
          </p>
        )}
      </div>
    </>
  );

  const base = "flex flex-col justify-between rounded-2xl border border-xenia-border bg-white p-4 sm:p-5 shadow-sm";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          "group transition-all duration-200 hover:-translate-y-0.5 hover:border-xenia-moss-600 hover:shadow-md",
          className,
        )}
      >
        {body}
      </Link>
    );
  }

  return <div className={cn(base, className)}>{body}</div>;
}
