"use client";

import { useId, useMemo, useState, type SelectHTMLAttributes } from "react";
import { ArrowDown01Icon, CheckmarkCircle02Icon } from "hugeicons-react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { SearchBars } from "@/components/atoms/searchBar";

interface SelectOption {
  value: string | number;
  label: string;
}

type SelectVariant = "filter" | "form" | "dark" | "outline";

interface SelectsProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
> {
  value: string;
  onChange: (value: string) => void;
  variant?: SelectVariant;
  placeholder?: string;
  placeholderDisabled?: boolean;
  hasError?: boolean;
  disabledCursor?: "wait" | "not-allowed";
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  options: SelectOption[];
  className?: string;
}

const variantStyles: Record<
  SelectVariant,
  {
    select: string;
    icon: string;
    placeholderText: string;
  }
> = {
  /** Toolbar list (di samping SearchBars) — tinggi & border sama dengan SearchBars. */
  filter: {
    select:
      "border border-xenia-border bg-white py-2 pl-3 pr-9 text-xenia-ink-900 focus:border-xenia-moss-600 focus:ring-xenia-moss-600",
    icon: "text-xenia-stone-500",
    placeholderText: "text-xenia-stone-400",
  },
  form: {
    select:
      "border bg-white px-3 py-2 pr-9 border-xenia-border text-xenia-ink-900 focus:border-xenia-moss-600 focus:ring-xenia-moss-600/15 focus:ring-2",
    icon: "text-xenia-stone-500",
    placeholderText: "text-xenia-stone-400",
  },
  dark: {
    select:
      "border border-xenia-moss-800 bg-xenia-forest-900 px-3 py-2 pr-9 text-xenia-sage-100 focus:border-xenia-brass-500 focus:ring-xenia-brass-500",
    icon: "text-xenia-sage-100/50",
    placeholderText: "text-xenia-sage-100/50",
  },
  outline: {
    select:
      "border border-xenia-ink-900/20 bg-transparent px-3 py-2 pr-9 text-xenia-ink-900 focus:border-xenia-ink-900 focus:ring-xenia-ink-900/40",
    icon: "text-xenia-ink-900/50",
    placeholderText: "text-xenia-ink-900/40",
  },
};

const errorClass =
  "border-xenia-danger focus:border-xenia-danger focus:ring-xenia-danger";

export function Selects({
  value,
  onChange,
  options,
  className,
  variant = "filter",
  placeholder,
  placeholderDisabled = true,
  hasError = false,
  disabledCursor = "wait",
  searchable = false,
  searchPlaceholder = "Search options...",
  emptyMessage = "No matching options.",
  disabled,
  ...rest
}: SelectsProps) {
  const styles = variantStyles[variant];
  const cursorClass =
    disabledCursor === "not-allowed"
      ? "disabled:cursor-not-allowed"
      : "disabled:cursor-wait";

  if (searchable) {
    return (
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={options}
        className={className}
        placeholder={placeholder}
        placeholderDisabled={placeholderDisabled}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        disabled={disabled}
        cursorClass={cursorClass}
        styles={styles}
        dark={variant === "dark"}
        hasError={hasError}
        ariaLabel={rest["aria-label"]}
        id={rest.id}
        name={rest.name}
        required={rest.required}
      />
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full appearance-none rounded-lg text-sm outline-none focus:ring-1 ${cursorClass} disabled:opacity-60 ${
          hasError ? errorClass : styles.select
        } ${!value ? styles.placeholderText : ""}`}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled={placeholderDisabled}>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ArrowDown01Icon
        size={14}
        className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 ${styles.icon}`}
      />
    </div>
  );
}

function SearchableSelect({
  value,
  onChange,
  options,
  className,
  placeholder,
  placeholderDisabled,
  searchPlaceholder,
  emptyMessage,
  disabled,
  cursorClass,
  styles,
  dark,
  hasError,
  ariaLabel,
  id,
  name,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  placeholder?: string;
  placeholderDisabled: boolean;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  cursorClass: string;
  styles: (typeof variantStyles)[SelectVariant];
  dark: boolean;
  hasError: boolean;
  ariaLabel?: string;
  id?: string;
  name?: string;
  required?: boolean;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => String(option.value) === value);
  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(term),
    );
  }, [options, search]);

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <div className={`relative ${className ?? ""}`}>
        <PopoverPrimitive.Trigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-label={ariaLabel}
            aria-required={required}
            aria-controls={listId}
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled}
            className={`w-full rounded-lg py-2 pr-9 pl-3 text-left text-sm outline-none focus:ring-1 ${cursorClass} disabled:opacity-60 ${hasError ? errorClass : styles.select} ${!value ? styles.placeholderText : ""}`}
          >
            {selected?.label ?? placeholder ?? "Select..."}
          </button>
        </PopoverPrimitive.Trigger>
        <ArrowDown01Icon
          size={14}
          className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 ${styles.icon}`}
        />
      </div>

      {name && (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      )}

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className={`z-[70] w-[var(--radix-popover-trigger-width)] rounded-lg border p-2 shadow-lg ${dark ? "border-xenia-moss-800 bg-xenia-forest-950" : "border-xenia-border bg-white"}`}
        >
          <SearchBars
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
            className="w-full"
            autoFocus
            variant={dark ? "dark" : "default"}
          />
          <div
            id={listId}
            role="listbox"
            className="mt-2 max-h-56 space-y-1 overflow-y-auto"
          >
            {!placeholderDisabled && placeholder && !search && (
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => {
                  onChange("");
                  close();
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${dark ? "text-xenia-sage-100/60 hover:bg-xenia-moss-800" : "text-xenia-stone-500 hover:bg-xenia-surface-hover"}`}
              >
                {placeholder}
              </button>
            )}
            {filteredOptions.length === 0 ? (
              <p
                className={`px-3 py-4 text-center text-sm ${dark ? "text-xenia-sage-100/60" : "text-xenia-stone-500"}`}
              >
                {emptyMessage}
              </p>
            ) : (
              filteredOptions.map((option) => {
                const optionValue = String(option.value);
                const isSelected = optionValue === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(optionValue);
                      close();
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${dark ? "text-xenia-sage-100 hover:bg-xenia-moss-800" : "text-xenia-ink-900 hover:bg-xenia-surface-hover"}`}
                  >
                    <span>{option.label}</span>
                    {isSelected && (
                      <CheckmarkCircle02Icon
                        size={16}
                        className={`shrink-0 ${dark ? "text-xenia-brass-500" : "text-xenia-moss-600"}`}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
