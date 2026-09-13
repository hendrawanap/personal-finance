"use client";

import { Search01Icon } from "hugeicons-react";

import { cn } from "@/lib/utils";

interface SearchBarsProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Kelas pembungkus — atur lebar di sini (`w-full max-w-sm`, `flex-1`). Default `w-56`. */
  className?: string;
  autoFocus?: boolean;
  variant?: "default" | "dark";
}

const variantStyles = {
  default: {
    icon: "text-xenia-stone-500",
    input:
      "border-xenia-border bg-white text-xenia-ink-900 placeholder:text-xenia-stone-400 focus:border-xenia-moss-600",
  },
  dark: {
    icon: "text-xenia-sage-100/50",
    input:
      "border-xenia-moss-800 bg-xenia-forest-900 text-xenia-sage-100 placeholder:text-xenia-sage-100/50 focus:border-xenia-brass-500",
  },
};

export function SearchBars({
  value,
  onChange,
  placeholder = "Search...",
  className,
  autoFocus,
  variant = "default",
}: SearchBarsProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn("relative w-56", className)}>
      <Search01Icon
        size={15}
        className={cn(
          "pointer-events-none absolute top-1/2 left-3 -translate-y-1/2",
          styles.icon,
        )}
      />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-lg border py-2 pr-3 pl-9 text-sm outline-none",
          styles.input,
        )}
      />
    </div>
  );
}
