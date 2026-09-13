"use client";

import React, { Suspense } from "react";
import { useQueryStates } from "nuqs";
import { ArrowDown01Icon, ArrowUp01Icon, ChartLineData02Icon, Download01Icon } from "hugeicons-react";

import { enumParser } from "@/lib/urlState";
import { PageShell } from "@/components/molecules/dashboard/pageShell";
import { Heading } from "@/components/molecules/dashboard/head";
import { StatCard } from "@/components/molecules/dashboard/statCard";
import { PillTabs } from "@/components/atoms/pillTabs";
import { Buttons } from "@/components/atoms/buttons";

const analyticsParsers = {
  view: enumParser(["monthly", "quarterly", "yearly"] as const, "monthly"),
};

function AnalyticsContent() {
  const [{ view }, setFilters] = useQueryStates(analyticsParsers, {
    history: "replace",
  });

  return (
    <PageShell width="default" spacing="md">
      <Heading
        title="Analytics & Reports"
        subtitle="Insights into income growth, expense distributions, and net worth evolution."
        noIcon
        actions={
          <div className="flex items-center gap-2">
            <PillTabs
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "yearly", label: "Yearly" },
              ]}
              value={view}
              onChange={(val) => setFilters({ view: val })}
            />
            <Buttons style="second" icon={<Download01Icon size={16} />}>
              Download Report
            </Buttons>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          eyebrow="Cash Velocity"
          title="Avg Monthly Savings"
          value="$2,850.00"
          valueAccent="moss"
          delta="+12.3% YoY"
          deltaTone="ok"
          icon={<ChartLineData02Icon size={18} />}
          subtext="Based on last 12 months"
        />
        <StatCard
          eyebrow="Expense Ratio"
          title="Fixed vs Discretionary"
          value="68% / 32%"
          valueAccent="stone"
          delta="Balanced"
          deltaTone="idle"
          icon={<ArrowDown01Icon size={18} />}
          subtext="Rent, utilities, essentials"
        />
        <StatCard
          eyebrow="Wealth Trajectory"
          title="Projected Annual Net"
          value="$34,200.00"
          valueAccent="brass"
          delta="On target"
          deltaTone="ok"
          icon={<ArrowUp01Icon size={18} />}
          subtext="Target $30k exceeded"
        />
      </div>

      <div className="rounded-xl border border-xenia-border bg-white p-5">
        <h2 className="font-display text-lg font-medium text-xenia-ink-900">
          Monthly Cash Flow Comparison
        </h2>
        <p className="text-xs text-xenia-stone-500">
          Income versus expenses over the past 6 months
        </p>

        <div className="mt-6 space-y-4">
          {[
            { month: "Apr 2026", income: 5800, expense: 3400 },
            { month: "May 2026", income: 6100, expense: 3200 },
            { month: "Jun 2026", income: 5900, expense: 3100 },
            { month: "Jul 2026", income: 6300, expense: 3600 },
            { month: "Aug 2026", income: 6200, expense: 3050 },
            { month: "Sep 2026", income: 6420, expense: 3180 },
          ].map((item) => {
            const max = 7000;
            const incPct = Math.round((item.income / max) * 100);
            const expPct = Math.round((item.expense / max) * 100);

            return (
              <div key={item.month} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-xenia-ink-900">
                    {item.month}
                  </span>
                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <span className="text-xenia-moss-600">
                      Income: ${item.income.toLocaleString()}
                    </span>
                    <span className="text-xenia-stone-500">
                      Expense: ${item.expense.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex h-3 w-full gap-1 overflow-hidden rounded-full bg-xenia-sand-100 p-0.5">
                  <div
                    className="h-full rounded-full bg-xenia-moss-600"
                    style={{ width: `${incPct * 0.6}%` }}
                    title={`Income $${item.income}`}
                  />
                  <div
                    className="h-full rounded-full bg-xenia-brass-500"
                    style={{ width: `${expPct * 0.4}%` }}
                    title={`Expense $${item.expense}`}
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

export default function AnalyticsPage() {
  return (
    <Suspense>
      <AnalyticsContent />
    </Suspense>
  );
}
