"use client";

import React, { Suspense } from "react";
import { Add01Icon, Coins01Icon } from "hugeicons-react";

import { PageShell } from "@/components/molecules/dashboard/pageShell";
import { Heading } from "@/components/molecules/dashboard/head";
import { Buttons } from "@/components/atoms/buttons";
import { StatCard } from "@/components/molecules/dashboard/statCard";

const BUDGETS = [
  {
    category: "Housing & Rent",
    allocated: 1800,
    spent: 1600,
    period: "Monthly",
  },
  {
    category: "Groceries & Food",
    allocated: 800,
    spent: 642,
    period: "Monthly",
  },
  {
    category: "Utilities & Bills",
    allocated: 350,
    spent: 285,
    period: "Monthly",
  },
  {
    category: "Transportation & Gas",
    allocated: 400,
    spent: 240,
    period: "Monthly",
  },
  {
    category: "Dining Out & Entertainment",
    allocated: 350,
    spent: 310,
    period: "Monthly",
  },
  {
    category: "Healthcare & Wellness",
    allocated: 200,
    spent: 95,
    period: "Monthly",
  },
];

function BudgetsContent() {
  const totalAllocated = BUDGETS.reduce((acc, b) => acc + b.allocated, 0);
  const totalSpent = BUDGETS.reduce((acc, b) => acc + b.spent, 0);
  const remaining = totalAllocated - totalSpent;

  return (
    <PageShell width="default" spacing="md">
      <Heading
        title="Budgets"
        subtitle="Set limits, track category spending, and prevent overspending."
        noIcon
        actions={
          <Buttons style="main" icon={<Add01Icon size={16} />}>
            Create Budget
          </Buttons>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          eyebrow="Monthly Allowance"
          title="Total Budget"
          value={`$${totalAllocated.toLocaleString()}`}
          valueAccent="stone"
          delta="6 Categories"
          deltaTone="idle"
          icon={<Coins01Icon size={18} />}
          subtext="Budget for September 2026"
        />
        <StatCard
          eyebrow="Utilized"
          title="Total Spent"
          value={`$${totalSpent.toLocaleString()}`}
          valueAccent="brass"
          delta={`${Math.round((totalSpent / totalAllocated) * 100)}% Used`}
          deltaTone="warn"
          icon={<Coins01Icon size={18} />}
          subtext="8 days remaining"
        />
        <StatCard
          eyebrow="Available"
          title="Remaining"
          value={`$${remaining.toLocaleString()}`}
          valueAccent="moss"
          delta="On Track"
          deltaTone="ok"
          icon={<Coins01Icon size={18} />}
          subtext="Safe to spend"
        />
      </div>

      <div className="rounded-xl border border-xenia-border bg-white p-5">
        <h2 className="font-display text-lg font-medium text-xenia-ink-900">
          Category Budgets
        </h2>
        <p className="text-xs text-xenia-stone-500">
          Monthly expenditure versus assigned targets
        </p>

        <div className="mt-6 space-y-6">
          {BUDGETS.map((b) => {
            const pct = Math.min(100, Math.round((b.spent / b.allocated) * 100));
            const isNearLimit = pct >= 90;
            return (
              <div key={b.category} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-xenia-ink-900">
                      {b.category}
                    </span>
                    <span className="ml-2 text-xs text-xenia-stone-500">
                      ({b.period})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-medium text-xenia-ink-900">
                      ${b.spent.toLocaleString()}
                    </span>
                    <span className="text-xs text-xenia-stone-500 font-mono">
                      {" "}
                      / ${b.allocated.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-xenia-sand-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isNearLimit ? "bg-xenia-warn-ink" : "bg-xenia-moss-600"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}

export default function BudgetsPage() {
  return (
    <Suspense>
      <BudgetsContent />
    </Suspense>
  );
}
