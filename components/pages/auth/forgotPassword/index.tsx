'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    ArrowLeft01Icon,
    ArrowRight03Icon,
    Mail01Icon,
    MailOpen01Icon,
} from 'hugeicons-react'
import { AuthShell, AuthBadge } from '@/components/organisms/auth/authShell'
import { useRequestPasswordReset, useResendPasswordReset } from '@/hooks/mutation/auth/passwordReset'
const RESEND_COOLDOWN_SEC = 60

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [sentTo, setSentTo] = useState<string | null>(null)
    const [cooldown, setCooldown] = useState(0)

    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setTimeout(() => setCooldown((v) => v - 1), 1000)
        return () => clearTimeout(timer)
    }, [cooldown])

    const startCooldown = (target: string) => {
        setSentTo(target)
        setCooldown(RESEND_COOLDOWN_SEC)
    }

    const request = useRequestPasswordReset({
        onSuccess: () => startCooldown(email.trim()),
    })

    const resend = useResendPasswordReset({
        onSuccess: () => setCooldown(RESEND_COOLDOWN_SEC),
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const target = email.trim()
        if (!target || request.isPending) return
        request.mutate({ email: target })
    }

    if (sentTo) {
        return (
            <AuthShell
                title="Check your inbox"
                subtitle={`If ${maskEmail(sentTo)} is registered, we’ve sent a link to reset the password.`}
                footer={
                    <a
                        href="/login"
                        className="inline-flex items-center gap-1.5 font-medium text-[#9A7140] transition-colors hover:text-[#7A5A32]"
                    >
                        <ArrowLeft01Icon size={16} />
                        Back to sign in
                    </a>
                }
            >
                <div className="text-center">
                    <AuthBadge tone="moss">
                        <MailOpen01Icon size={22} strokeWidth={1.6} />
                    </AuthBadge>

                    <div className="mt-5 rounded-xl border border-[#E2D9C2] bg-white/60 px-4 py-3.5 text-left">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4F6B52]">
                            What happens next
                        </p>
                        <ol className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-[#3F3B32]">
                            <li>1. Open the email and tap the button inside.</li>
                            <li>2. Choose a new password.</li>
                            <li>3. Sign in with it.</li>
                        </ol>
                    </div>

                    <p className="mt-4 text-[13px] leading-relaxed text-[#8A8271]">
                        The link works once and expires after 1 hour. Nothing yet? Check
                        your spam folder before asking for a new one.
                    </p>

                    <button
                        type="button"
                        onClick={() => resend.mutate({ email: sentTo })}
                        disabled={cooldown > 0 || resend.isPending}
                        className="mt-5 text-sm font-medium text-[#9A7140] transition-colors hover:text-[#7A5A32] disabled:cursor-not-allowed disabled:text-[#A39C89]"
                    >
                        {cooldown > 0
                            ? `Resend in ${cooldown}s`
                            : resend.isPending
                              ? 'Sending…'
                              : 'Resend link'}
                    </button>
                </div>
            </AuthShell>
        )
    }

    return (
        <AuthShell
            title="Forgot password"
            subtitle="Enter your account email. We’ll send a link to reset your password."
            footer={
                <a
                    href="/login"
                    className="inline-flex items-center gap-1.5 font-medium text-[#9A7140] transition-colors hover:text-[#7A5A32]"
                >
                    <ArrowLeft01Icon size={16} />
                    Back to sign in
                </a>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label
                        htmlFor="email"
                        className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[#3F3B32]"
                    >
                        <Mail01Icon size={16} className="text-[#4F6B52]" />
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="hello@gmail.com"
                        disabled={request.isPending}
                        className="w-full rounded-xl border border-[#E2D9C2] bg-white/60 px-4 py-3 text-[#1D1B16] outline-none transition-all placeholder:text-[#A39C89] focus:border-[#B4884F] focus:bg-white/80 focus:ring-2 focus:ring-[#B4884F]/50 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                </div>

                <button
                    type="submit"
                    disabled={request.isPending || !email.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F6B52] py-3 font-semibold tracking-wide text-white shadow-lg shadow-[#4F6B52]/30 transition-all hover:bg-[#3F5A43] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
                >
                    {request.isPending ? 'SENDING...' : 'SEND RESET LINK'}
                    {!request.isPending && <ArrowRight03Icon size={18} />}
                </button>

                <p className="text-center text-[13px] leading-relaxed text-[#8A8271]">
                    For security, we don’t reveal whether an email is registered.
                </p>
            </form>
        </AuthShell>
    )
}

/**
 * Masks the address on the confirmation screen. This page is public, so
 * showing the full email would confirm a guessed address as belonging to a
 * real account.
 */
function maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (!domain) return '***'
    const head = local.slice(0, 2)
    return `${head}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`
}