"use client";

import React, { useMemo, useState } from "react";
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
import type { ColumnDef } from "@tanstack/react-table";

import { enumParser } from "@/lib/urlState";
import { PageShell } from "@/components/molecules/dashboard/pageShell";
import { Heading } from "@/components/molecules/dashboard/head";
import { StatCard } from "@/components/molecules/dashboard/statCard";
import { PillTabs } from "@/components/atoms/pillTabs";
import { Buttons } from "@/components/atoms/buttons";
import { Links } from "@/components/atoms/links";
import { StatusBadge } from "@/components/atoms/statusBadge";
import DataTable from "@/components/organisms/table";
import { useFinanceStore, useFinanceHydrated } from "@/store/useFinanceStore";
import { useAccountFilterStore } from "@/store/useAccountFilterStore";
import { TransactionModal } from "@/components/molecules/finance/transactionModal";
import { Transaction } from "@/types/finance";
import { useCurrency } from "@/lib/currency";

const dashboardParsers = {
  timeRange: enumParser(["7D", "30D", "90D", "1Y"] as const, "30D"),
};

function getAccountIcon(type: string) {
  switch (type) {
    case "checking":
      return Wallet02Icon;
    case "savings":
      return Coins01Icon;
    case "credit":
      return CreditCardIcon;
    case "investment":
      return Invoice01Icon;
    default:
      return Wallet02Icon;
  }
}

export default function PersonalFinanceDashboard() {
  const [{ timeRange }, setFilters] = useQueryStates(dashboardParsers, {
    history: "replace",
  });

  const hydrated = useFinanceHydrated();
  const { format } = useCurrency();
  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.transactions);
  const budgets = useFinanceStore((s) => s.budgets);
  const selectedAccountId = useAccountFilterStore((s) => s.selectedAccountId);

  const [transactionModalOpen, setTransactionModalOpen] = useState(false);

  // Filter transactions by selected account and timeRange
  const { totalIncome, totalSpending, netSavings, savingsRate } =
    useMemo(() => {
      const now = new Date();
      let days = 30;
      if (timeRange === "7D") days = 7;
      if (timeRange === "90D") days = 90;
      if (timeRange === "1Y") days = 365;

      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const txList = transactions.filter((tx) => {
        if (selectedAccountId !== "all" && tx.accountId !== selectedAccountId) {
          return false;
        }
        const txDate = new Date(tx.date);
        return txDate >= cutoff;
      });

      let income = 0;
      let spending = 0;

      for (const tx of txList) {
        if (tx.type === "income") {
          income += tx.amount;
        } else {
          spending += tx.amount;
        }
      }

      const savings = income - spending;
      const rate = income > 0 ? Math.round((savings / income) * 100) : 0;

      return {
        totalIncome: income,
        totalSpending: spending,
        netSavings: savings,
        savingsRate: rate,
      };
    }, [transactions, selectedAccountId, timeRange]);

  // Net worth calculation
  const totalNetWorth = useMemo(() => {
    if (selectedAccountId !== "all") {
      const acc = accounts.find((a) => a.id === selectedAccountId);
      return acc ? acc.balance : 0;
    }
    return accounts.reduce((acc, a) => acc + a.balance, 0);
  }, [accounts, selectedAccountId]);

  // Budget calculations based on transactions
  const budgetAllocations = useMemo(() => {
    return budgets.map((b) => {
      // Calculate spent for this category from current month transactions
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const spent = transactions
        .filter((tx) => {
          if (tx.type !== "expense") return false;
          if (tx.category !== b.category) return false;
          if (selectedAccountId !== "all" && tx.accountId !== selectedAccountId) return false;
          const d = new Date(tx.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);

      return {
        ...b,
        spent,
        percentage: Math.min(100, Math.round((spent / (b.allocated || 1)) * 100)),
      };
    });
  }, [budgets, transactions, selectedAccountId]);

  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  const accountMap = useMemo(() => {
    return new Map(accounts.map((a) => [a.id, a]));
  }, [accounts]);

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
        accessorKey: "accountId",
        header: "Account",
        cell: (info) => {
          const acc = accountMap.get(String(info.getValue()));
          return (
            <span className="text-xs text-xenia-stone-500">
              {acc ? acc.name : "Account"}
            </span>
          );
        },
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
              {isIncome ? "+" : "-"}{format(row.amount)}
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
    [accountMap, format],
  );

  return (
    <PageShell width="default" spacing="md">
      {/* Top Header */}
      <Heading
        title="Financial Overview"
        subtitle="Real-time personal finance dashboard stored in LocalStorage."
        noIcon
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
            <Buttons
              style="main"
              icon={<Add01Icon size={16} />}
              onClick={() => setTransactionModalOpen(true)}
              className="w-full sm:w-auto"
            >
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
          value={hydrated ? format(totalNetWorth) : format(0)}
          valueAccent="moss"
          delta={selectedAccountId === "all" ? `${accounts.length} Accounts` : "Filtered Account"}
          deltaTone="ok"
          icon={<Wallet02Icon size={18} />}
          subtext="Saved locally on this device"
        />
        <StatCard
          eyebrow="Cash Flow"
          title="Total Income"
          value={hydrated ? format(totalIncome) : format(0)}
          valueAccent="moss"
          delta={`Past ${timeRange}`}
          deltaTone="ok"
          icon={<ArrowUp01Icon size={18} />}
          subtext="Recorded income flow"
        />
        <StatCard
          eyebrow="Expenses"
          title="Total Spending"
          value={hydrated ? format(totalSpending) : format(0)}
          valueAccent="stone"
          delta={`Past ${timeRange}`}
          deltaTone={totalSpending > totalIncome ? "warn" : "ok"}
          icon={<ArrowDown01Icon size={18} />}
          subtext="Expense transactions"
        />
        <StatCard
          eyebrow="Savings"
          title="Net Savings"
          value={hydrated ? format(netSavings) : format(0)}
          valueAccent={netSavings >= 0 ? "brass" : "stone"}
          delta={`${savingsRate}% rate`}
          deltaTone={savingsRate >= 20 ? "brass" : "idle"}
          icon={<Coins01Icon size={18} />}
          subtext={netSavings >= 0 ? "Positive cash surplus" : "Deficit this period"}
        />
      </div>

      {/* Middle Section: Budget Allocations & Accounts Breakdown */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Budget Progress */}
        <div className="rounded-xl border border-xenia-border bg-white p-4 sm:p-5 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-medium text-xenia-ink-900">
                Budget Allocation
              </h2>
              <p className="text-xs text-xenia-stone-500">
                Current month expenditure vs assigned limits
              </p>
            </div>
            <div className="self-start sm:self-auto">
              <Links path="/dashboard/budgets" style="second" size="sm">
                Manage Budgets
              </Links>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {budgetAllocations.length === 0 ? (
              <p className="py-6 text-center text-xs text-xenia-stone-500">
                No budgets configured yet. Create one to track category spending.
              </p>
            ) : (
              budgetAllocations.map((b) => (
                <div key={b.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-xenia-ink-900">
                      {b.category}
                    </span>
                    <span className="text-xenia-stone-500 font-mono">
                      {format(b.spent)} / {format(b.allocated)}{" "}
                      <span className="text-xenia-stone-700 font-sans">
                        ({b.percentage}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-xenia-sand-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        b.percentage >= 90 ? "bg-xenia-warn-ink" : "bg-xenia-moss-600"
                      }`}
                      style={{ width: `${b.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Linked Accounts */}
        <div className="rounded-xl border border-xenia-border bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-medium text-xenia-ink-900">
              Accounts
            </h2>
            <Links path="/dashboard/accounts" style="second" size="sm">
              View All
            </Links>
          </div>
          <div className="mt-4 divide-y divide-xenia-divider">
            {accounts.length === 0 ? (
              <p className="py-6 text-center text-xs text-xenia-stone-500">
                No accounts found. Link an account to start tracking.
              </p>
            ) : (
              accounts.map((acc) => {
                const Icon = getAccountIcon(acc.type);
                const isNegative = acc.balance < 0;
                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-xenia-sand-100 text-xenia-stone-700">
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-xenia-ink-900">
                          {acc.name}
                        </p>
                        <p className="text-[11px] text-xenia-stone-500">
                          {acc.institution} · {acc.accountNumber}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-xs font-medium ${
                        isNegative ? "text-xenia-danger" : "text-xenia-ink-900"
                      }`}
                    >
                      {format(acc.balance)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-medium text-xenia-ink-900">
              Recent Transactions
            </h2>
            <p className="text-xs text-xenia-stone-500">
              Latest financial activity recorded in LocalStorage
            </p>
          </div>
          <div className="self-start sm:self-auto">
            <Links path="/dashboard/transactions" style="second" size="sm">
              All Transactions
            </Links>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={recentTransactions}
          totalItems={recentTransactions.length}
        />
      </div>

      {/* Add Transaction Modal */}
      <TransactionModal
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
      />
    </PageShell>
  );
}
