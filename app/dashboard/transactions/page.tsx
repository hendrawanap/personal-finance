"use client";

import React, { Suspense, useMemo } from "react";
import { useQueryStates } from "nuqs";
import { Add01Icon, Download01Icon } from "hugeicons-react";
import type { ColumnDef } from "@tanstack/react-table";

import { searchParser, enumParser, pageParser } from "@/lib/urlState";
import { PageShell } from "@/components/molecules/dashboard/pageShell";
import { Heading } from "@/components/molecules/dashboard/head";
import { SearchBars } from "@/components/atoms/searchBar";
import { Selects } from "@/components/atoms/selects";
import { Buttons } from "@/components/atoms/buttons";
import { StatusBadge } from "@/components/atoms/statusBadge";
import DataTable from "@/components/organisms/table";
import { useDataTableUrlProps } from "@/hooks/useTableUrlState";

const transactionFilterParsers = {
  q: searchParser,
  type: enumParser(["all", "income", "expense"] as const, "all"),
  status: enumParser(["all", "paid", "pending"] as const, "all"),
  page: pageParser,
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

const ALL_TRANSACTIONS: Transaction[] = [
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
  {
    id: "tx-6",
    date: "2026-09-07",
    description: "Coffee & Bakery",
    category: "Food & Dining",
    account: "Credit Card",
    amount: -14.5,
    type: "expense",
    status: "paid",
  },
  {
    id: "tx-7",
    date: "2026-09-05",
    description: "Netflix Subscription",
    category: "Entertainment",
    account: "Credit Card",
    amount: -19.99,
    type: "expense",
    status: "paid",
  },
  {
    id: "tx-8",
    date: "2026-09-03",
    description: "Dividend Payout",
    category: "Investment",
    account: "Investment Portfolio",
    amount: 84.6,
    type: "income",
    status: "paid",
  },
];

function TransactionsContent() {
  const [filters, setFilters] = useQueryStates(transactionFilterParsers, {
    history: "replace",
  });

  const { tableProps } = useDataTableUrlProps(10);

  const filteredData = useMemo(() => {
    return ALL_TRANSACTIONS.filter((item) => {
      if (
        filters.q &&
        !item.description.toLowerCase().includes(filters.q.toLowerCase()) &&
        !item.category.toLowerCase().includes(filters.q.toLowerCase())
      ) {
        return false;
      }
      if (filters.type !== "all" && item.type !== filters.type) {
        return false;
      }
      if (filters.status !== "all" && item.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [filters]);

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: (info) => (
          <span className="font-mono text-xs text-xenia-stone-700">
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
      <Heading
        title="Transactions"
        subtitle="Manage your transactions, categorized cash flow, and receipts."
        noIcon
        actions={
          <div className="flex items-center gap-2">
            <Buttons style="second" icon={<Download01Icon size={16} />}>
              Export
            </Buttons>
            <Buttons style="main" icon={<Add01Icon size={16} />}>
              Add Transaction
            </Buttons>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <SearchBars
            placeholder="Search description or category..."
            value={filters.q}
            onChange={(val) => setFilters({ q: val, page: 1 })}
          />
        </div>
        <div className="w-40">
          <Selects
            variant="filter"
            value={filters.type}
            onChange={(val) => setFilters({ type: val as "all" | "income" | "expense", page: 1 })}
            options={[
              { value: "all", label: "All Types" },
              { value: "income", label: "Income" },
              { value: "expense", label: "Expense" },
            ]}
          />
        </div>
        <div className="w-40">
          <Selects
            variant="filter"
            value={filters.status}
            onChange={(val) => setFilters({ status: val as "all" | "paid" | "pending", page: 1 })}
            options={[
              { value: "all", label: "All Status" },
              { value: "paid", label: "Paid" },
              { value: "pending", label: "Pending" },
            ]}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        totalItems={filteredData.length}
        pageSize={10}
        {...tableProps}
      />
    </PageShell>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsContent />
    </Suspense>
  );
}
