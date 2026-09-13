"use client";

import React, { useMemo } from "react";
import { useQueryStates } from "nuqs";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CreditCardIcon,
  Coins01Icon,
  Invoice01Icon,
  Wallet02Icon,
} from "hugeicons-react";

import { enumParser } from "@/lib/urlState";
import { PageShell } from "@/components/molecules/dashboard/pageShell";
import { Heading } from "@/components/molecules/dashboard/head";
import { StatCard } from "@/components/molecules/dashboard/statCard";
import { PillTabs } from "@/components/atoms/pillTabs";
import { Buttons } from "@/components/atoms/buttons";
import { Links } from "@/components/atoms/links";
import { StatusBadge } from "@/components/atoms/statusBadge";
import DataTable from "@/components/organisms/table";
import type { ColumnDef } from "@tanstack/react-table";

const dashboardParsers = {
  timeRange: enumParser(["7D", "30D", "90D", "1Y"] as const, "30D"),
};

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  account: string;
  amount: number;
  type: "income" | "expense";
  status: "paid" | "pending";
}

const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    date: "2026-09-12",
    description: "Monthly Salary Deposit",
    category: "Salary & Income",
    account: "Checking Account",
    amount: 5200.0,
    type: "income",
    status: "paid",
  },
  {
    id: "tx-2",
    date: "2026-09-11",
    description: "Whole Foods Market",
    category: "Groceries",
    account: "Credit Card",
    amount: -142.5,
    type: "expense",
    status: "paid",
  },
  {
    id: "tx-3",
    date: "2026-09-10",
    description: "Apartment Rent",
    category: "Housing",
    account: "Checking Account",
    amount: -1600.0,
    type: "expense",
    status: "paid",
  },
  {
    id: "tx-4",
    date: "2026-09-09",
    description: "Freelance Consulting",
    category: "Freelance",
    account: "Checking Account",
    amount: 1220.0,
    type: "income",
    status: "paid",
  },
  {
    id: "tx-5",
    date: "2026-09-08",
    description: "Utility Bill (Electric & Water)",
    category: "Utilities",
    account: "Credit Card",
    amount: -85.2,
    type: "expense",
    status: "pending",
  },
];

export default function PersonalFinanceDashboard() {
  const [{ timeRange }, setFilters] = useQueryStates(dashboardParsers, {
    history: "replace",
  });

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: (info) => (
          <span className="text-xenia-stone-700 text-xs font-mono">
            {String(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: (info) => (
          <span className="font-medium text-xenia-ink-900">
            {String(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: (info) => (
          <span className="inline-flex rounded-md bg-xenia-sand-100 px-2 py-0.5 text-xs text-xenia-stone-700">
            {String(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "account",
        header: "Account",
        cell: (info) => (
          <span className="text-xs text-xenia-stone-500">
            {String(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: (info) => {
          const row = info.row.original;
          const isIncome = row.type === "income";
          return (
            <span
              className={`font-mono text-xs font-semibold ${
                isIncome ? "text-xenia-moss-600" : "text-xenia-ink-900"
              }`}
            >
              {isIncome ? "+" : ""}$
              {Math.abs(row.amount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => (
          <StatusBadge status={String(info.getValue())} size="sm" />
        ),
      },
    ],
    [],
  );

  return (
    <PageShell width="default" spacing="md">
      {/* Top Header */}
      <Heading
        title="Financial Overview"
        subtitle="Track your cash flow, budget allocations, and net worth."
        noIcon
        actions={
          <div className="flex items-center gap-2">
            <PillTabs
              options={[
                { value: "7D", label: "7 Days" },
                { value: "30D", label: "30 Days" },
                { value: "90D", label: "90 Days" },
                { value: "1Y", label: "1 Year" },
              ]}
              value={timeRange}
              onChange={(val) => setFilters({ timeRange: val })}
            />
            <Buttons style="main" icon={<Add01Icon size={16} />}>
              Add Transaction
            </Buttons>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          eyebrow="Net Worth"
          title="Total Balance"
          value="$48,250.00"
          valueAccent="moss"
          delta="+8.4%"
          deltaTone="ok"
          icon={<Wallet02Icon size={18} />}
          subtext="Across 4 linked accounts"
        />
        <StatCard
          eyebrow="Cash Flow"
          title="Total Income"
          value="$6,420.00"
          valueAccent="moss"
          delta="+$520.00"
          deltaTone="ok"
          icon={<ArrowUp01Icon size={18} />}
          subtext="vs last period"
        />
        <StatCard
          eyebrow="Expenses"
          title="Total Spending"
          value="$3,180.00"
          valueAccent="stone"
          delta="-4.2%"
          deltaTone="ok"
          icon={<ArrowDown01Icon size={18} />}
          subtext="Under budget allowance"
        />
        <StatCard
          eyebrow="Savings"
          title="Net Savings"
          value="$3,240.00"
          valueAccent="brass"
          delta="50.5% rate"
          deltaTone="brass"
          icon={<Coins01Icon size={18} />}
          subtext="Target 45% achieved"
        />
      </div>

      {/* Middle Section: Budget Allocations & Accounts Breakdown */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Budget Progress */}
        <div className="rounded-xl border border-xenia-border bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-medium text-xenia-ink-900">
                Budget Allocation
              </h2>
              <p className="text-xs text-xenia-stone-500">
                Spending status by category for this period
              </p>
            </div>
            <Links path="/dashboard/budgets" style="second" size="sm">
              Manage Budgets
            </Links>
          </div>

          <div className="mt-5 space-y-4">
            {[
              {
                category: "Housing & Utilities",
                spent: 1685,
                budget: 1800,
                color: "bg-xenia-moss-600",
              },
              {
                category: "Groceries & Food",
                spent: 642,
                budget: 800,
                color: "bg-xenia-moss-700",
              },
              {
                category: "Transportation",
                spent: 240,
                budget: 400,
                color: "bg-xenia-brass-500",
              },
              {
                category: "Entertainment & Leisure",
                spent: 280,
                budget: 350,
                color: "bg-xenia-stone-700",
              },
            ].map((b) => {
              const pct = Math.min(100, Math.round((b.spent / b.budget) * 100));
              return (
                <div key={b.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-xenia-ink-900">
                      {b.category}
                    </span>
                    <span className="text-xenia-stone-500 font-mono">
                      ${b.spent.toLocaleString()} / ${b.budget.toLocaleString()}{" "}
                      <span className="text-xenia-stone-700 font-sans">
                        ({pct}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-xenia-sand-100">
                    <div
                      className={`h-full rounded-full ${b.color} transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Linked Accounts */}
        <div className="rounded-xl border border-xenia-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-medium text-xenia-ink-900">
              Accounts
            </h2>
            <Links path="/dashboard/accounts" style="second" size="sm">
              View All
            </Links>
          </div>
          <div className="mt-4 divide-y divide-xenia-divider">
            {[
              {
                name: "Main Checking",
                type: "Bank of America",
                balance: "$12,450.00",
                icon: Wallet02Icon,
              },
              {
                name: "High-Yield Savings",
                type: "Marcus by Goldman",
                balance: "$24,800.00",
                icon: Coins01Icon,
              },
              {
                name: "Credit Card (Sapphire)",
                type: "Chase",
                balance: "-$1,250.00",
                icon: CreditCardIcon,
              },
              {
                name: "Investment Portfolio",
                type: "Vanguard ETF",
                balance: "$12,250.00",
                icon: Invoice01Icon,
              },
            ].map((acc) => (
              <div
                key={acc.name}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-xenia-sand-100 text-xenia-stone-700">
                    <acc.icon size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-xenia-ink-900">
                      {acc.name}
                    </p>
                    <p className="text-[11px] text-xenia-stone-500">
                      {acc.type}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs font-medium text-xenia-ink-900">
                  {acc.balance}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-medium text-xenia-ink-900">
              Recent Transactions
            </h2>
            <p className="text-xs text-xenia-stone-500">
              Latest financial activity and movements
            </p>
          </div>
          <Links path="/dashboard/transactions" style="second" size="sm">
            All Transactions
          </Links>
        </div>

        <DataTable
          columns={columns}
          data={SAMPLE_TRANSACTIONS}
          totalItems={SAMPLE_TRANSACTIONS.length}
        />
      </div>
    </PageShell>
  );
}
