'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Alert02Icon,
    ArrowLeft01Icon,
    ArrowRight03Icon,
    CheckmarkCircle02Icon,
    Loading03Icon,
    LockPasswordIcon,
    Tick02Icon,
    ViewIcon,
    ViewOffSlashIcon,
} from 'hugeicons-react'
import { AuthShell, AuthBadge } from '@/components/organisms/auth/authShell'
import { useConfirmPasswordReset, useValidateResetToken } from '@/hooks/mutation/auth/passwordReset'
const RULES = [
    { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
    { label: 'Contains a letter', test: (v: string) => /[A-Za-z]/.test(v) },
    { label: 'Contains a number', test: (v: string) => /\d/.test(v) },
] as const

const STRENGTH = [
    { label: 'Too short', fill: 'bg-[#CFC5AD]', text: 'text-[#635B47]' },
    { label: 'Weak', fill: 'bg-[#DC3545]', text: 'text-[#B02A37]' },
    { label: 'Almost there', fill: 'bg-[#D97706]', text: 'text-[#92400E]' },
    { label: 'Strong', fill: 'bg-[#2D6A4F]', text: 'text-[#1B4332]' },
] as const

function ResetPasswordContent() {
    const router = useRouter()
    const params = useSearchParams()
    const token = params.get('token')

    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [touched, setTouched] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    // Diperiksa sebelum form dirender, supaya user yang link-nya sudah mati
    // langsung melihat layar "minta link baru" — bukan baru tahu setelah
    // mengetik password dua kali.
    const {
        isPending: verifying,
        isError: invalidToken,
    } = useValidateResetToken(token)

    const confirmReset = useConfirmPasswordReset({
        onSuccess: () => setDone(true),
        onError: (message) => setServerError(message),
    })

    const passed = useMemo(() => RULES.map((r) => r.test(password)), [password])
    const score = passed.filter(Boolean).length
    const allPassed = passed.every(Boolean)
    const mismatch = touched && confirm.length > 0 && password !== confirm
    const matched = confirm.length > 0 && password === confirm
    const canSubmit = allPassed && matched && !confirmReset.isPending

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit || !token) return

        setServerError(null)
        confirmReset.mutate({ token, password })
    }

    if (done) {
        return (
            <AuthShell
                title="Password saved"
                subtitle="Your account is ready. Sign in with your new password."
            >
                <div className="text-center">
                    <AuthBadge tone="moss">
                        <CheckmarkCircle02Icon size={22} strokeWidth={1.6} />
                    </AuthBadge>

                    <a
                        href="/login"
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F6B52] py-3 font-semibold tracking-wide text-white shadow-lg shadow-[#4F6B52]/30 transition-all hover:bg-[#3F5A43] active:scale-[0.98]"
                    >
                        SIGN IN NOW
                        <ArrowRight03Icon size={18} />
                    </a>
                </div>
            </AuthShell>
        )
    }

    if (!token) {
        return (
            <AuthShell
                title="Link is incomplete"
                subtitle="Open this page from the button in your email — that link carries the code identifying your account."
                footer={
                    <Link
                        href="/forgot-password"
                        className="font-medium text-[#9A7140] transition-colors hover:text-[#7A5A32]"
                    >
                        Request a new link
                    </Link>
                }
            >
                <div className="text-center">
                    <AuthBadge tone="amber">
                        <Alert02Icon size={22} strokeWidth={1.6} />
                    </AuthBadge>
                </div>
            </AuthShell>
        )
    }

    if (verifying) {
        return (
            <AuthShell title="Xenia" subtitle="Checking your link…">
                <div className="flex justify-center py-4">
                    <div className="relative flex h-16 w-16 items-center justify-center">
                        <span className="absolute inset-0 rounded-full bg-[#4F6B52]/12" />
                        <span className="absolute inset-0 animate-ping rounded-full bg-[#4F6B52]/20 motion-reduce:animate-none" />
                        <Loading03Icon
                            size={26}
                            className="relative animate-spin text-[#4F6B52] motion-reduce:animate-none"
                            strokeWidth={1.6}
                        />
                    </div>
                </div>
            </AuthShell>
        )
    }

    if (invalidToken) {
        return (
            <AuthShell
                title="This link no longer works"
                // Pesan BE sengaja tidak membedakan kedaluwarsa dari sudah
                // dipakai, dan langkah berikutnya bagi user memang sama — jadi
                // jangan tampilkan pesan mentah dari server di sini.
                subtitle="Reset links expire after 1 hour and can only be used once. Request a new one to continue."
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
                    <AuthBadge tone="amber">
                        <Alert02Icon size={22} strokeWidth={1.6} />
                    </AuthBadge>

                    <button
                        type="button"
                        onClick={() => router.push('/forgot-password')}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F6B52] py-3 font-semibold tracking-wide text-white shadow-lg shadow-[#4F6B52]/30 transition-all hover:bg-[#3F5A43] active:scale-[0.98]"
                    >
                        REQUEST A NEW LINK
                        <ArrowRight03Icon size={18} />
                    </button>
                </div>
            </AuthShell>
        )
    }

    return (
        <AuthShell
            title="Reset your password"
            subtitle="Choose a new password. You’ll use it every time you sign in."
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
                        htmlFor="password"
                        className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[#3F3B32]"
                    >
                        <LockPasswordIcon size={16} className="text-[#4F6B52]" />
                        New password
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled={confirmReset.isPending}
                            className="w-full rounded-xl border border-[#E2D9C2] bg-white/60 px-4 py-3 pr-11 text-[#1D1B16] outline-none transition-all placeholder:text-[#A39C89] focus:border-[#B4884F] focus:bg-white/80 focus:ring-2 focus:ring-[#B4884F]/50 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={
                                showPassword ? 'Hide password' : 'Show password'
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8271] transition-colors hover:text-[#4F6B52]"
                        >
                            {showPassword ? (
                                <ViewOffSlashIcon size={18} />
                            ) : (
                                <ViewIcon size={18} />
                            )}
                        </button>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                        <div className="flex flex-1 gap-1.5">
                            {RULES.map((rule, i) => (
                                <span
                                    key={rule.label}
                                    className={`h-2 flex-1 rounded-full transition-all duration-200 ${
                                        i < score
                                            ? `${STRENGTH[score].fill} shadow-sm`
                                            : 'bg-[#D5CEBC]'
                                    }`}
                                />
                            ))}
                        </div>
                        <span
                            className={`text-[12px] font-semibold tracking-wide transition-colors ${STRENGTH[score].text}`}
                        >
                            {STRENGTH[score].label}
                        </span>
                    </div>

                    <ul className="mt-3 flex flex-col gap-1.5 rounded-xl border border-[#D5CEBC] bg-white/70 px-3.5 py-3 shadow-xs">
                        {RULES.map((rule, i) => (
                            <li
                                key={rule.label}
                                className={`flex items-center gap-2.5 text-[13px] font-medium transition-colors ${
                                    passed[i] ? 'text-[#1B4332]' : 'text-[#635B47]'
                                }`}
                            >
                                <span
                                    className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                                        passed[i]
                                            ? 'border-[#2D6A4F] bg-[#2D6A4F] text-white shadow-xs'
                                            : 'border-[#C8BFAB] bg-[#EFECE1]'
                                    }`}
                                >
                                    {passed[i] ? (
                                        <Tick02Icon size={11} strokeWidth={2.4} />
                                    ) : (
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#A89F8B]" />
                                    )}
                                </span>
                                {rule.label}
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <label
                        htmlFor="confirm"
                        className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[#3F3B32]"
                    >
                        <LockPasswordIcon size={16} className="text-[#4F6B52]" />
                        Confirm password
                    </label>
                    <input
                        id="confirm"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        onBlur={() => setTouched(true)}
                        placeholder="••••••••"
                        disabled={confirmReset.isPending}
                        className={`w-full rounded-xl border bg-white/60 px-4 py-3 text-[#1D1B16] outline-none transition-all placeholder:text-[#A39C89] focus:bg-white/80 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                            mismatch
                                ? 'border-[#B3452E] focus:border-[#B3452E] focus:ring-[#B3452E]/40'
                                : matched
                                  ? 'border-[#4F6B52] focus:border-[#4F6B52] focus:ring-[#4F6B52]/40'
                                  : 'border-[#E2D9C2] focus:border-[#B4884F] focus:ring-[#B4884F]/50'
                        }`}
                    />

                    {mismatch && (
                        <p className="mt-1.5 text-[13px] text-[#8A3322]">
                            Both fields must match.
                        </p>
                    )}
                    {matched && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#3F5A43]">
                            <Tick02Icon size={14} strokeWidth={2.4} />
                            Both fields match.
                        </p>
                    )}
                </div>

                {serverError && (
                    <div
                        role="alert"
                        className="flex items-start gap-2 rounded-xl border border-[#B3452E]/30 bg-[#B3452E]/10 px-4 py-3"
                    >
                        <Alert02Icon
                            size={18}
                            className="mt-0.5 shrink-0 text-[#B3452E]"
                        />
                        <span className="text-sm leading-relaxed text-[#8A3322]">
                            {serverError}
                        </span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F6B52] py-3 font-semibold tracking-wide text-white shadow-lg shadow-[#4F6B52]/30 transition-all hover:bg-[#3F5A43] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
                >
                    {confirmReset.isPending ? 'SAVING...' : 'SAVE PASSWORD'}
                    {!confirmReset.isPending && <ArrowRight03Icon size={18} />}
                </button>

                <p className="text-center text-[13px] text-[#8A8271]">
                    This link works once and expires 1 hour after it was sent.
                </p>
            </form>
        </AuthShell>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <AuthShell title="Xenia" subtitle="Loading…">
                    <div className="flex justify-center py-4">
                        <Loading03Icon
                            size={26}
                            className="animate-spin text-[#4F6B52] motion-reduce:animate-none"
                            strokeWidth={1.6}
                        />
                    </div>
                </AuthShell>
            }
        >
            <ResetPasswordContent />
        </Suspense>
    )
}