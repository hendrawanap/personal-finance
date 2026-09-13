'use client'

import { MoonIcon } from 'hugeicons-react'

/**
 * Shared auth chrome: dusk backdrop + glass card.
 *
 * Used by both /forgot-password and /reset-password so neither drifts away
 * from the login page. If each wrote its own layout, one would be left behind
 * every time the other was touched.
 */
export function AuthShell({
    title,
    subtitle,
    children,
    footer,
}: {
    title: string
    subtitle?: string
    children: React.ReactNode
    footer?: React.ReactNode
}) {
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#142219] p-4">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#142219] via-[#24382B] to-[#4F6B52]" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#B4884F] opacity-30 blur-[120px]" />
            <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#4F6B52] opacity-30 blur-[100px]" />

            <div className="relative w-full max-w-md rounded-3xl border border-white/50 bg-[#F8F4E9]/85 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8 md:p-10">
                <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
                    <div className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4F6B52] text-[#F2ECDD] shadow-lg shadow-[#4F6B52]/30">
                        <div className="absolute inset-0 rounded-xl bg-[#B4884F] opacity-25 blur-[8px]" />
                        <MoonIcon size={24} className="relative" strokeWidth={1.75} />
                    </div>
                    <h1 className="font-display text-2xl font-medium tracking-tight text-[#1D1B16] sm:text-3xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-1.5 text-sm leading-relaxed text-[#8A8271]">
                            {subtitle}
                        </p>
                    )}
                </div>

                {children}

                {footer && (
                    <div className="mt-6 border-t border-[#E2D9C2] pt-5 text-center text-sm text-[#8A8271]">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}

/** Round icon badge for status screens (success, dead link, and so on). */
export function AuthBadge({
    tone,
    children,
}: {
    tone: 'moss' | 'amber' | 'rust'
    children: React.ReactNode
}) {
    const halo = {
        moss: 'bg-[#4F6B52]/12',
        amber: 'bg-[#B4884F]/15',
        rust: 'bg-[#B3452E]/10',
    } as const

    const core = {
        moss: 'border-[#4F6B52]/30 text-[#4F6B52]',
        amber: 'border-[#B4884F]/40 text-[#9A7140]',
        rust: 'border-[#B3452E]/30 text-[#B3452E]',
    } as const

    return (
        <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${halo[tone]}`}
        >
            <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border bg-white/70 ${core[tone]}`}
            >
                {children}
            </div>
        </div>
    )
}