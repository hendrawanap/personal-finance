"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert01Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  MailOpen01Icon,
  Tick02Icon,
} from "hugeicons-react";
import { Buttons } from "@/components/atoms/buttons";
import { Links } from "@/components/atoms/links";
import { useVerifyInvite } from "@/hooks/query/auth/useInvite";

function InviteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const { data, isPending, isError } = useVerifyInvite(token);

  function handleContinue() {
    router.push(`/set-password?token=${encodeURIComponent(token ?? "")}`);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-xenia-canvas px-4 py-10">
      <Backdrop />

      <div className="relative w-full max-w-[440px]">
        <BrandMark />

        <div className="overflow-hidden rounded-2xl border border-xenia-border bg-white shadow-[0_1px_2px_rgba(20,28,22,0.04),0_20px_44px_-28px_rgba(20,28,22,0.35)]">
          <div className="h-1 w-full bg-gradient-to-r from-xenia-moss-600 via-[#8CA87C] to-[#D6E0D3]" />
          <div className="p-5 sm:p-8">
            {!token ? (
              <Missing />
            ) : isPending ? (
              <Checking />
            ) : isError ? (
              <Expired />
            ) : (
              <Valid
                name={data.name}
                email={data.email}
                onContinue={handleContinue}
              />
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-xenia-border" />
          <p className="text-[13px] text-xenia-stone-500">
            Already have a password?{" "}
            <Link
              href="/login"
              className="font-medium text-xenia-moss-600 underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
          <span className="h-px w-8 bg-xenia-border" />
        </div>
      </div>
    </main>
  );
}

function Checking() {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-[#EEF2ED]" />
        <span className="absolute inset-0 animate-ping rounded-full bg-[#D6E0D3] opacity-60 motion-reduce:animate-none" />
        <Loading03Icon
          className="relative h-7 w-7 animate-spin text-xenia-moss-600 motion-reduce:animate-none"
          strokeWidth={1.6}
        />
      </div>

      <p className="mt-5 text-sm text-xenia-stone-500">
        Checking your invitation…
      </p>

      <div className="mt-6 w-full space-y-2.5">
        <div className="mx-auto h-3 w-2/3 animate-pulse rounded-full bg-[#EEF0EC] motion-reduce:animate-none" />
        <div className="mx-auto h-3 w-1/2 animate-pulse rounded-full bg-[#EEF0EC] motion-reduce:animate-none" />
      </div>
    </div>
  );
}

function Valid({
  name,
  email,
  onContinue,
}: {
  name: string;
  email: string;
  onContinue: () => void;
}) {
  return (
    <div className="text-center">
      <IconBadge tone="moss">
        <CheckmarkCircle02Icon className="h-6 w-6" strokeWidth={1.6} />
      </IconBadge>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-xenia-moss-600">
        Invitation verified
      </p>
      <h1 className="mt-2 text-xl font-medium tracking-tight text-xenia-ink-900">
        Welcome, {name}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-xenia-stone-500">
        Set a password to activate your account.
      </p>

      <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-xenia-border bg-xenia-canvas px-3.5 py-1.5">
        <MailOpen01Icon
          className="h-4 w-4 flex-shrink-0 text-xenia-moss-600"
          strokeWidth={1.6}
        />
        <span className="truncate text-[13px] font-medium text-xenia-stone-700">
          {email}
        </span>
      </div>

      <ul className="mt-6 space-y-2 rounded-xl border border-[#D6E0D3] bg-[#EEF2ED] px-4 py-3.5 text-left">
        <Step done>Invitation verified</Step>
        <Step>Choose your password</Step>
        <Step>Sign in and you are ready</Step>
      </ul>

      <div className="mt-6">
        <Buttons
          type="button"
          style="main"
          onClick={onContinue}
          className="w-full justify-center"
        >
          Set my password
        </Buttons>
      </div>
    </div>
  );
}

function Expired() {
  return (
    <div className="text-center">
      <IconBadge tone="amber">
        <Alert01Icon className="h-6 w-6" strokeWidth={1.6} />
      </IconBadge>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A87B22]">
        Link inactive
      </p>
      <h1 className="mt-2 text-xl font-medium tracking-tight text-xenia-ink-900">
        This link no longer works
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-xenia-stone-500">
        Ask the front desk to send you a new invitation.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Chip tone="amber">Valid for 72 hours</Chip>
        <Chip tone="amber">Single use only</Chip>
      </div>

      <div className="mt-6 flex justify-center">
        <Links path="/login" style="second" className="w-full sm:w-auto justify-center">
          Go to sign in
        </Links>
      </div>
    </div>
  );
}

function Missing() {
  return (
    <div className="text-center">
      <IconBadge tone="stone">
        <MailOpen01Icon className="h-6 w-6" strokeWidth={1.6} />
      </IconBadge>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-xenia-stone-500">
        No code in this link
      </p>
      <h1 className="mt-2 text-xl font-medium tracking-tight text-xenia-ink-900">
        No invitation found
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-xenia-stone-500">
        Open this page from the button in your invitation email — that link
        carries the code that identifies your account.
      </p>

      <div className="mt-6 flex justify-center">
        <Links path="/login" style="second" className="w-full sm:w-auto justify-center">
          Go to sign in
        </Links>
      </div>
    </div>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(20,28,22,0.05)_1px,transparent_0)] [background-size:22px_22px]" />
      <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#DCE7D7] opacity-60 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-[#EFE7D5] opacity-50 blur-3xl" />
    </div>
  );
}

function BrandMark() {
  return (
    <div className="mb-6 flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-xenia-moss-600 text-[15px] font-semibold leading-none text-white shadow-[0_6px_14px_-6px_rgba(20,28,22,0.6)]">
        X
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-xenia-ink-900">
        Xenia
      </span>
    </div>
  );
}

function IconBadge({
  tone,
  children,
}: {
  tone: "moss" | "amber" | "stone";
  children: React.ReactNode;
}) {
  const halo = {
    moss: "bg-[#EEF2ED]",
    amber: "bg-[#FAF4E8]",
    stone: "bg-xenia-canvas",
  } as const;

  const core = {
    moss: "border-[#D6E0D3] text-xenia-moss-600",
    amber: "border-[#EADFC8] text-[#A87B22]",
    stone: "border-xenia-border text-xenia-stone-500",
  } as const;

  return (
    <div
      className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${halo[tone]}`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full border bg-white ${core[tone]}`}
      >
        {children}
      </div>
    </div>
  );
}

function Step({
  done,
  children,
}: {
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5 text-[13px] leading-relaxed">
      <span
        className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border ${
          done
            ? "border-xenia-moss-600 bg-xenia-moss-600 text-white"
            : "border-[#C7D6C1] bg-white text-[#8CA87C]"
        }`}
      >
        {done ? (
          <Tick02Icon className="h-3 w-3" strokeWidth={2.4} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </span>
      <span
        className={done ? "text-xenia-moss-700" : "text-xenia-stone-700"}
      >
        {children}
      </span>
    </li>
  );
}

function Chip({
  tone,
  children,
}: {
  tone: "amber" | "stone";
  children: React.ReactNode;
}) {
  const tones = {
    amber: "border-[#EADFC8] bg-[#FAF4E8] text-[#A87B22]",
    stone: "border-xenia-border bg-xenia-canvas text-xenia-stone-500",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-xenia-canvas">
          <Loading03Icon
            className="h-7 w-7 animate-spin text-xenia-moss-600 motion-reduce:animate-none"
            strokeWidth={1.6}
          />
        </main>
      }
    >
      <InviteContent />
    </Suspense>
  );
}