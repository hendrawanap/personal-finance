'use client'

import { STANDARD_LOCALES } from '@/constant/locale'
import { cn } from '@/lib/utils'

export function LocaleChips({
    locales,
    className,
}: {
    locales: readonly string[]
    className?: string
}) {
    const present = new Set(locales)

    return (
        <div className={cn('flex flex-wrap gap-1', className)}>
            {STANDARD_LOCALES.map((locale) => {
                const has = present.has(locale.code)
                return (
                    <span
                        key={locale.code}
                        title={
                            has
                                ? locale.label
                                : `${locale.label} — not translated`
                        }
                        className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
                            has
                                ? 'bg-xenia-sand-100 text-xenia-stone-700'
                                : 'border border-dashed border-xenia-border text-xenia-stone-400',
                        )}
                    >
                        {locale.code}
                    </span>
                )
            })}
        </div>
    )
}
