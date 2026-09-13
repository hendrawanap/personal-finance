"use client";

import React, { Suspense } from "react";
import { Add01Icon, CreditCardIcon, Coins01Icon, Wallet02Icon, Invoice01Icon } from "hugeicons-react";

import { PageShell } from "@/components/molecules/dashboard/pageShell";
import { Heading } from "@/components/molecules/dashboard/head";
import { Buttons } from "@/components/atoms/buttons";
import { StatCard } from "@/components/molecules/dashboard/statCard";

const ACCOUNTS = [
  {
    id: "acc-1",
    name: "Main Checking",
    institution: "Bank of America",
    type: "Checking",
    accountNumber: "•••• 4821",
    balance: 12450.0,
    currency: "USD",
    icon: Wallet02Icon,
    accent: "moss" as const,
  },
  {
    id: "acc-2",
    name: "Emergency Fund",
    institution: "Marcus by Goldman Sachs",
    type: "High-Yield Savings",
    accountNumber: "•••• 9102",
    balance: 24800.0,
    currency: "USD",
    icon: Coins01Icon,
    accent: "moss" as const,
  },
  {
    id: "acc-3",
    name: "Sapphire Preferred",
    institution: "Chase",
    type: "Credit Card",
    accountNumber: "•••• 7319",
    balance: -1250.0,
    currency: "USD",
    icon: CreditCardIcon,
    accent: "brass" as const,
  },
  {
    id: "acc-4",
    name: "Retirement & Index Fund",
    institution: "Vanguard",
    type: "Brokerage",
    accountNumber: "•••• 3042",
    balance: 12250.0,
    currency: "USD",
    icon: Invoice01Icon,
    accent: "info" as const,
  },
];

function AccountsContent() {
  return (
    <PageShell width="default" spacing="md">
      <Heading
        title="Accounts"
        subtitle="Manage linked banks, cards, wallets, and investments."
        noIcon
        actions={
          <Buttons style="main" icon={<Add01Icon size={16} />}>
            Link Account
          </Buttons>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          eyebrow="Cash & Liquid"
          title="Bank Balances"
          value="$37,250.00"
          valueAccent="moss"
          delta="2 Accounts"
          deltaTone="ok"
          icon={<Wallet02Icon size={18} />}
          subtext="Checking & High-yield savings"
        />
        <StatCard
          eyebrow="Liabilities"
          title="Credit & Loans"
          value="$1,250.00"
          valueAccent="brass"
          delta="Current Due"
          deltaTone="warn"
          icon={<CreditCardIcon size={18} />}
          subtext="Due in 18 days"
        />
        <StatCard
          eyebrow="Investments"
          title="Portfolio Assets"
          value="$12,250.00"
          valueAccent="info"
          delta="+14.2% YTD"
          deltaTone="ok"
          icon={<Coins01Icon size={18} />}
          subtext="Equities & Index ETFs"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACCOUNTS.map((account) => {
          const Icon = account.icon;
          const isNegative = account.balance < 0;
          return (
            <div
              key={account.id}
              className="rounded-xl border border-xenia-border bg-white p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-xenia-sand-100 text-xenia-moss-600">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-xenia-ink-900">
                      {account.name}
                    </h3>
                    <p className="text-xs text-xenia-stone-500">
                      {account.institution} · {account.accountNumber}
                    </p>
                  </div>
                </div>
                <span className="rounded-md bg-xenia-sand-100 px-2 py-0.5 text-xs text-xenia-stone-700">
                  {account.type}
                </span>
              </div>

              <div className="mt-6 flex items-baseline justify-between border-t border-xenia-divider pt-4">
                <span className="text-xs text-xenia-stone-500">Current Balance</span>
                <span
                  className={`font-mono text-lg font-semibold ${
                    isNegative ? "text-xenia-danger" : "text-xenia-ink-900"
                  }`}
                >
                  {isNegative ? "-" : ""}$
                  {Math.abs(account.balance).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsContent />
    </Suspense>
  );
}
