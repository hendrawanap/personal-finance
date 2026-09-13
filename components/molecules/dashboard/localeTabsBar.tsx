'use client'

import type { ReactNode } from 'react'
import { Globe02Icon } from 'hugeicons-react'

import { PillTabs, type PillTabOption } from '@/components/atoms/pillTabs'
import { cn } from '@/lib/utils'

export interface LocaleTabsBarProps<T extends string = string> {
  options: ReadonlyArray<PillTabOption<T>>
  value: T
  onChange: (value: T) => void
  'aria-label'?: string
  className?: string
  /**
   * Ukuran pill tabs di dalam bar: 'sm' (default) atau 'md'.
   */
  size?: 'sm' | 'md'
  /**
   * Slot opsional di sisi kanan bar untuk tombol aksi (misal: "Remove this version").
   */
  actions?: ReactNode
}

/**
 * Bar pemilih bahasa / localization standar untuk dashboard (seperti di Detail Deals).
 *
 * Mengelompokkan ikon globe dan PillTabs di dalam container putih berbingkai
 * (`rounded-xl border border-xenia-border bg-white p-2`), dengan slot opsional
 * `actions` di sisi kanan.
 */
export function LocaleTabsBar<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel = 'Viewing language',
  className,
  size = 'sm',
  actions,
}: LocaleTabsBarProps<T>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-xl border border-xenia-border bg-white p-2',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Globe02Icon size={16} className="ml-2 text-xenia-stone-500 shrink-0" />
        <PillTabs
          aria-label={ariaLabel}
          options={options}
          value={value}
          onChange={onChange}
          size={size}
        />
      </div>

      {actions && (
        <div className="flex items-center gap-2 ml-auto">{actions}</div>
      )}
    </div>
  )
}
