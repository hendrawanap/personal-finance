"use client";

import type { ReactNode } from "react";

import { Switch } from "@/components/molecules/inputs/form";
import { cn } from "@/lib/utils";

type ToggleProps = {
  id?: string;
  label: ReactNode;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  /** `card` (default): baris berbingkai. `plain`: label + switch tanpa bingkai. */
  variant?: "card" | "plain";
  className?: string;
};

/** Switch berlabel. Untuk switch polos (mis. di dalam tabel) pakai `Switch` dari molecules/inputs/form. */
export function Toggles({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
  variant = "card",
  className,
}: ToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        variant === "card" && "rounded-xl border border-xenia-border bg-white/40 px-4 py-3",
        className,
      )}
    >
      <div>
        <p className="text-sm font-medium text-xenia-ink-900">{label}</p>
        {description && <p className="text-xs text-xenia-stone-500">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}
