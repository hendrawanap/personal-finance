'use client'
import { useState } from 'react'
import {
  Mail01Icon,
  LockPasswordIcon,
  ViewIcon,
  ViewOffSlashIcon,
  ArrowRight03Icon,
  Wallet02Icon,
  Alert02Icon,
  SparklesIcon,
} from 'hugeicons-react'
import { useAdminLogin } from '@/hooks/mutation/auth/useAdminLogin'
import { setCookie } from 'cookies-next'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const { mutate: login, isPending, errorMessage, reset } = useAdminLogin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login({ identifier: email, password })
  }

  const handleDemoLogin = () => {
    setCookie('accessToken', 'demo-access-token')
    setCookie('refreshToken', 'demo-refresh-token')
    toast.success('Signed in as Demo User')
    router.push('/dashboard')
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (errorMessage) reset()
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (errorMessage) reset()
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#142219]">
      {/* Dusk gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#142219] via-[#24382B] to-[#4F6B52]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#B4884F] opacity-30 blur-[120px]" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#4F6B52] opacity-30 blur-[100px]" />

      <div className="relative w-full max-w-md backdrop-blur-2xl bg-[#F8F4E9]/85 border border-white/50 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/30 p-5 sm:p-8 md:p-10">
        {/* Brand identity */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#4F6B52] text-[#F2ECDD] shadow-lg shadow-[#4F6B52]/30 mb-3">
            <div className="absolute inset-0 rounded-xl bg-[#B4884F] opacity-25 blur-[8px]" />
            <Wallet02Icon size={24} className="relative" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#1D1B16]">
            Personal Finance
          </h1>
          <p className="mt-1 text-sm text-[#8A8271]">Sign in to manage your finances</p>
        </div>

        {/* Demo Fast Login */}
        <div className="mb-6 rounded-2xl border border-xenia-border bg-white/70 p-4 text-center">
          <p className="text-xs text-[#5C5748]">Testing locally without an API backend?</p>
          <button
            type="button"
            onClick={handleDemoLogin}
            className="mt-2.5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-xenia-moss-600 bg-white py-2.5 text-xs font-semibold text-xenia-moss-600 shadow-sm transition-all hover:bg-xenia-moss-600 hover:text-white"
          >
            <SparklesIcon size={16} />
            Quick Demo Login (Bypass Auth)
          </button>
        </div>

        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-xenia-border" />
          <span className="bg-[#F8F4E9] px-3 text-[11px] uppercase tracking-wider text-xenia-stone-500">
            or with credentials
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="flex items-center gap-1.5 text-sm font-medium text-[#3F3B32] mb-1.5"
            >
              <Mail01Icon size={16} className="text-[#4F6B52]" />
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={handleEmailChange}
              placeholder="hello@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-[#E2D9C2] text-[#1D1B16] placeholder:text-[#A39C89] outline-none focus:ring-2 focus:ring-[#B4884F]/50 focus:border-[#B4884F] focus:bg-white/80 transition-all text-sm"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="flex items-center gap-1.5 text-sm font-medium text-[#3F3B32] mb-1.5"
            >
              <LockPasswordIcon size={16} className="text-[#4F6B52]" />
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-11 rounded-xl bg-white/60 border border-[#E2D9C2] text-[#1D1B16] placeholder:text-[#A39C89] outline-none focus:ring-2 focus:ring-[#B4884F]/50 focus:border-[#B4884F] focus:bg-white/80 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8271] hover:text-[#4F6B52] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <ViewOffSlashIcon size={18} /> : <ViewIcon size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div className="flex items-center justify-between text-xs pt-1">
            <a
              href="/forgot-password"
              className="ml-auto text-[#9A7140] hover:text-[#7A5A32] font-medium transition-colors"
            >
              Forgot Password?
            </a>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 px-4 py-3 rounded-xl bg-[#B3452E]/10 border border-[#B3452E]/30"
            >
              <Alert02Icon
                size={18}
                className="mt-0.5 shrink-0 text-[#B3452E]"
              />
              <span className="text-sm text-[#8A3322]">{errorMessage}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#4F6B52] hover:bg-[#3F5A43] text-white font-semibold tracking-wide shadow-lg shadow-[#4F6B52]/30 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 text-sm"
          >
            {isPending ? 'PROCESSING...' : 'CONTINUE'}
            {!isPending && <ArrowRight03Icon size={18} />}
          </button>
        </form>
      </div>
    </div>
  )
}
