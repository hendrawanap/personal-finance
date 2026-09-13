"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail01Icon,
  LockPasswordIcon,
  ViewIcon,
  ViewOffSlashIcon,
  ArrowRight03Icon,
  Wallet02Icon,
  Alert02Icon,
  UserIcon,
  MailOpen01Icon,
} from "hugeicons-react";
import { useRegister } from "@/hooks/mutation/auth/useRegister";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const { mutate: register, isPending, errorMessage, reset } = useRegister({
    onSuccess: (data) => {
      if (data.needsEmailConfirmation) {
        setRegisteredEmail(email.trim());
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    register({
      name: name.trim(),
      email: email.trim(),
      password,
    });
  };

  const handleFieldChange = () => {
    if (validationError) setValidationError(null);
    if (errorMessage) reset();
  };

  if (registeredEmail) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-xenia-forest-950">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-xenia-forest-950 via-xenia-forest-900 to-xenia-moss-600" />
        <div className="relative w-full max-w-md backdrop-blur-2xl bg-xenia-cream/90 border border-white/50 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-xenia-moss-600 text-xenia-canvas shadow-lg shadow-xenia-moss-600/30 mb-4">
            <MailOpen01Icon size={28} />
          </div>
          <h2 className="font-display text-2xl font-medium tracking-tight text-xenia-ink-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-sm text-xenia-stone-700 leading-relaxed">
            We sent a verification link to{" "}
            <span className="font-semibold text-xenia-ink-900">{registeredEmail}</span>.
            Please click the link in your email to activate your account and start managing your finances.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 py-3 rounded-xl bg-xenia-moss-600 hover:bg-xenia-moss-700 text-white font-semibold text-sm transition-all shadow-md"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeError = validationError || errorMessage;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-xenia-forest-950">
      {/* Dusk backdrop gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-xenia-forest-950 via-xenia-forest-900 to-xenia-moss-600" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-xenia-brass-500 opacity-30 blur-[120px]" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-xenia-moss-600 opacity-30 blur-[100px]" />

      <div className="relative w-full max-w-md backdrop-blur-2xl bg-xenia-cream/90 border border-white/50 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/30 p-5 sm:p-8 md:p-10">
        {/* Brand identity */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-xenia-moss-600 text-xenia-canvas shadow-lg shadow-xenia-moss-600/30 mb-3">
            <div className="absolute inset-0 rounded-xl bg-xenia-brass-500 opacity-25 blur-[8px]" />
            <Wallet02Icon size={24} className="relative" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-xenia-ink-900">
            Create an Account
          </h1>
          <p className="mt-1 text-sm text-xenia-stone-500">
            Start tracking finances and cloud sync with Supabase
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label
              htmlFor="name"
              className="flex items-center gap-1.5 text-sm font-medium text-xenia-stone-700 mb-1.5"
            >
              <UserIcon size={16} className="text-xenia-moss-600" />
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                handleFieldChange();
              }}
              placeholder="Alex Morgan"
              className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-xenia-border text-xenia-ink-900 placeholder:text-xenia-stone-400 outline-none focus:ring-2 focus:ring-xenia-brass-500/50 focus:border-xenia-brass-500 focus:bg-white/80 transition-all text-sm"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="flex items-center gap-1.5 text-sm font-medium text-xenia-stone-700 mb-1.5"
            >
              <Mail01Icon size={16} className="text-xenia-moss-600" />
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                handleFieldChange();
              }}
              placeholder="alex.morgan@finance.io"
              className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-xenia-border text-xenia-ink-900 placeholder:text-xenia-stone-400 outline-none focus:ring-2 focus:ring-xenia-brass-500/50 focus:border-xenia-brass-500 focus:bg-white/80 transition-all text-sm"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="flex items-center gap-1.5 text-sm font-medium text-xenia-stone-700 mb-1.5"
            >
              <LockPasswordIcon size={16} className="text-xenia-moss-600" />
              Password (min. 6 characters)
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  handleFieldChange();
                }}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-11 rounded-xl bg-white/60 border border-xenia-border text-xenia-ink-900 placeholder:text-xenia-stone-400 outline-none focus:ring-2 focus:ring-xenia-brass-500/50 focus:border-xenia-brass-500 focus:bg-white/80 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xenia-stone-500 hover:text-xenia-moss-600 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <ViewOffSlashIcon size={18} /> : <ViewIcon size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="flex items-center gap-1.5 text-sm font-medium text-xenia-stone-700 mb-1.5"
            >
              <LockPasswordIcon size={16} className="text-xenia-moss-600" />
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                handleFieldChange();
              }}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-xenia-border text-xenia-ink-900 placeholder:text-xenia-stone-400 outline-none focus:ring-2 focus:ring-xenia-brass-500/50 focus:border-xenia-brass-500 focus:bg-white/80 transition-all text-sm"
            />
          </div>

          {/* Error notice */}
          {activeError && (
            <div
              role="alert"
              className="flex items-start gap-2 px-4 py-3 rounded-xl bg-xenia-danger-soft border border-xenia-danger-line"
            >
              <Alert02Icon size={18} className="mt-0.5 shrink-0 text-xenia-danger" />
              <span className="text-sm text-xenia-danger-ink">{activeError}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-xenia-moss-600 hover:bg-xenia-moss-700 text-white font-semibold tracking-wide shadow-lg shadow-xenia-moss-600/30 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 text-sm"
          >
            {isPending ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            {!isPending && <ArrowRight03Icon size={18} />}
          </button>
        </form>

        {/* Link back to login */}
        <div className="mt-6 text-center text-xs text-xenia-stone-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-xenia-moss-600 hover:text-xenia-moss-700 underline transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
