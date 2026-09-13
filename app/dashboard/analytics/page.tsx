"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useQueryStates } from "nuqs";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ChartLineData02Icon,
  Download01Icon,
} from "hugeicons-react";
import toast from "react-hot-toast";

import { enumParser } from "@/lib/urlState";
import { PageShell } from "@/components/molecules/dashboard/pageShell";
import { Heading } from "@/components/molecules/dashboard/head";
import { StatCard } from "@/components/molecules/dashboard/statCard";
import { PillTabs } from "@/components/atoms/pillTabs";
import { Buttons } from "@/components/atoms/buttons";
import { useFinanceStore, useFinanceHydrated } from "@/store/useFinanceStore";
import { exportExcel } from "@/lib/exportExcel";
import { useCurrency } from "@/lib/currency";

const analyticsParsers = {
  view: enumParser(["monthly", "quarterly", "yearly"] as const, "monthly"),
};

const FIXED_CATEGORIES = new Set([
  "Housing & Rent",
  "Groceries & Food",
  "Utilities & Bills",
  "Healthcare & Wellness",
  "Transportation & Gas",
]);

function AnalyticsContent() {
  const [{ view }, setFilters] = useQueryStates(analyticsParsers, {
    history: "replace",
  });

  const hydrated = useFinanceHydrated();
  const { format, symbol } = useCurrency();
  const transactions = useFinanceStore((s) => s.transactions);
  const [isExporting, setIsExporting] = useState(false);

  // Group transactions by month
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expense: number }>();

    // Process all transactions
    for (const tx of transactions) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleString("en-US", { month: "short", year: "numeric" });

      if (!map.has(key)) {
        map.set(key, { month: monthLabel, income: 0, expense: 0 });
      }

      const entry = map.get(key)!;
      if (tx.type === "income") {
        entry.income += tx.amount;
      } else {
        entry.expense += tx.amount;
      }
    }

    // Sort chronologically
    const sortedKeys = Array.from(map.keys()).sort();
    return sortedKeys.map((k) => map.get(k)!);
  }, [transactions]);

  // Aggregate metrics
  const { avgMonthlySavings, fixedRatio, discretionaryRatio, projectedAnnual } =
    useMemo(() => {
      if (monthlyData.length === 0) {
        return {
          avgMonthlySavings: 0,
          fixedRatio: 50,
          discretionaryRatio: 50,
          projectedAnnual: 0,
        };
      }

      let totalNetSavings = 0;
      for (const m of monthlyData) {
        totalNetSavings += m.income - m.expense;
      }
      const avgSavings = Math.round(totalNetSavings / monthlyData.length);
      const projected = avgSavings * 12;

      // Fixed vs discretionary
      let fixedExpense = 0;
      let discretionaryExpense = 0;

      for (const tx of transactions) {
        if (tx.type === "expense") {
          if (FIXED_CATEGORIES.has(tx.category)) {
            fixedExpense += tx.amount;
          } else {
            discretionaryExpense += tx.amount;
          }
        }
      }

      const totalExp = fixedExpense + discretionaryExpense;
      const fRatio = totalExp > 0 ? Math.round((fixedExpense / totalExp) * 100) : 50;
      const dRatio = totalExp > 0 ? 100 - fRatio : 50;

      return {
        avgMonthlySavings: avgSavings,
        fixedRatio: fRatio,
        discretionaryRatio: dRatio,
        projectedAnnual: projected,
      };
    }, [monthlyData, transactions]);

  // Find max value for relative bar scaling
  const maxFlow = useMemo(() => {
    let m = 1000;
    for (const d of monthlyData) {
      if (d.income > m) m = d.income;
      if (d.expense > m) m = d.expense;
    }
    return m;
  }, [monthlyData]);

  const handleExportReport = async () => {
    if (monthlyData.length === 0) {
      toast.error("No analytics data available to export");
      return;
    }
    setIsExporting(true);
    try {
      type CashFlowRow = { month: string; income: number; expense: number };
      await exportExcel<CashFlowRow>({
        fileName: `financial_analytics_${new Date().toISOString().split("T")[0]}`,
        sheetName: "Cash Flow",
        columns: [
          { header: "Period", key: "month", width: 18, value: (r) => r.month },
          {
            header: `Total Income (${symbol})`,
            key: "income",
            width: 18,
            numberFormat: `${symbol}#,##0.00`,
            value: (r) => r.income,
          },
          {
            header: `Total Expense (${symbol})`,
            key: "expense",
            width: 18,
            numberFormat: `${symbol}#,##0.00`,
            value: (r) => r.expense,
          },
          {
            header: `Net Savings (${symbol})`,
            key: "savings",
            width: 18,
            numberFormat: `${symbol}#,##0.00`,
            value: (r) => r.income - r.expense,
          },
        ],
        rows: monthlyData,
      });
      toast.success("Analytics report downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate analytics report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <PageShell width="default" spacing="md">
      <Heading
        title="Analytics & Reports"
        subtitle="Insights into cash velocity, expenditure distribution, and wealth trajectories."
        noIcon
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PillTabs
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "yearly", label: "Yearly" },
              ]}
              value={view}
              onChange={(val) => setFilters({ view: val })}
            />
            <Buttons
              style="second"
              icon={<Download01Icon size={16} />}
              onClick={handleExportReport}
              loading={isExporting}
              className="w-full sm:w-auto"
            >
              Download Report
            </Buttons>
          </div>
        }
      />

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          eyebrow="Cash Velocity"
          title="Avg Monthly Savings"
          value={hydrated ? format(avgMonthlySavings) : format(0)}
          valueAccent={avgMonthlySavings >= 0 ? "moss" : "stone"}
          delta={`${monthlyData.length} Periods Recorded`}
          deltaTone="ok"
          icon={<ChartLineData02Icon size={18} />}
          subtext="Net income retention rate"
        />
        <StatCard
          eyebrow="Expense Ratio"
          title="Fixed vs Discretionary"
          value={hydrated ? `${fixedRatio}% / ${discretionaryRatio}%` : "0% / 0%"}
          valueAccent="stone"
          delta={fixedRatio <= 65 ? "Balanced" : "High Fixed"}
          deltaTone={fixedRatio <= 65 ? "ok" : "idle"}
          icon={<ArrowDown01Icon size={18} />}
          subtext="Essential living vs flexible spend"
        />
        <StatCard
          eyebrow="Wealth Trajectory"
          title="Projected Annual Net"
          value={hydrated ? format(projectedAnnual) : format(0)}
          valueAccent="brass"
          delta="Annual Run Rate"
          deltaTone="ok"
          icon={<ArrowUp01Icon size={18} />}
          subtext="Based on current savings velocity"
        />
      </div>

      {/* Monthly Cash Flow Comparison */}
      <div className="rounded-xl border border-xenia-border bg-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-medium text-xenia-ink-900">
              Cash Flow Evolution
            </h2>
            <p className="text-xs text-xenia-stone-500">
              Income versus expenses across historical recorded periods
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium self-start sm:self-auto">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-xenia-moss-600" />
              Income
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-xenia-brass-500" />
              Expenses
            </span>
          </div>
        </div>

        {monthlyData.length === 0 ? (
          <div className="py-12 text-center text-xs text-xenia-stone-500">
            No transactions found to compute cash flow analysis.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {monthlyData.map((item) => {
              const incPct = Math.round((item.income / maxFlow) * 100);
              const expPct = Math.round((item.expense / maxFlow) * 100);

              return (
                <div key={item.month} className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                    <span className="font-medium text-xenia-ink-900">
                      {item.month}
                    </span>
                    <div className="flex items-center gap-4 font-mono text-[11px]">
                      <span className="text-xenia-moss-600">
                        Income: {format(item.income, 0)}
                      </span>
                      <span className="text-xenia-stone-500">
                        Expense: {format(item.expense, 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex h-3 w-full gap-1 overflow-hidden rounded-full bg-xenia-sand-100 p-0.5">
                    <div
                      className="h-full rounded-full bg-xenia-moss-600 transition-all duration-300"
                      style={{ width: `${Math.max(2, incPct * 0.6)}%` }}
                      title={`Income: ${format(item.income, 0)}`}
                    />
                    <div
                      className="h-full rounded-full bg-xenia-brass-500 transition-all duration-300"
                      style={{ width: `${Math.max(2, expPct * 0.4)}%` }}
                      title={`Expense: ${format(item.expense, 0)}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
