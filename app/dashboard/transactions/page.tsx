"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { useQueryStates } from "nuqs";
import { Add01Icon, Download01Icon, Edit01Icon, Delete02Icon } from "hugeicons-react";
import type { ColumnDef, OnChangeFn, PaginationState, SortingState } from "@tanstack/react-table";
import toast from "react-hot-toast";

import {
  searchParser,
  enumParser,
  pageParser,
  sortParser,
  sortToSortingState,
  sortingStateToSort,
} from "@/lib/urlState";
import { PageShell } from "@/components/molecules/dashboard/pageShell";
import { Heading } from "@/components/molecules/dashboard/head";
import { SearchBars } from "@/components/atoms/searchBar";
import { Selects } from "@/components/atoms/selects";
import { Buttons } from "@/components/atoms/buttons";
import { StatusBadge } from "@/components/atoms/statusBadge";
import DataTable from "@/components/organisms/table";
import { useFinanceStore, useFinanceHydrated } from "@/store/useFinanceStore";
import { useAccountFilterStore } from "@/store/useAccountFilterStore";
import { TransactionModal } from "@/components/molecules/finance/transactionModal";
import ConfirmDialog from "@/components/molecules/dashboard/unit/confirmDialog";
import { exportExcel } from "@/lib/exportExcel";
import { Transaction } from "@/types/finance";
import { useCurrency } from "@/lib/currency";

const transactionFilterParsers = {
  q: searchParser,
  type: enumParser(["all", "income", "expense"] as const, "all"),
  status: enumParser(["all", "paid", "pending"] as const, "all"),
  sort: sortParser,
  page: pageParser,
};

function TransactionsContent() {
  const [filters, setFilters] = useQueryStates(transactionFilterParsers, {
    history: "replace",
  });

  const hydrated = useFinanceHydrated();
  const { format, symbol } = useCurrency();
  const transactions = useFinanceStore((s) => s.transactions);
  const accounts = useFinanceStore((s) => s.accounts);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const selectedAccountId = useAccountFilterStore((s) => s.selectedAccountId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: Math.max(0, (filters.page || 1) - 1), pageSize: 10 }),
    [filters.page],
  );

  const sorting = useMemo(() => sortToSortingState(filters.sort), [filters.sort]);

  const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      setFilters({ page: next.pageIndex + 1 });
    },
    [pagination, setFilters],
  );

  const onSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setFilters({ sort: sortingStateToSort(next) || null, page: 1 });
    },
    [sorting, setFilters],
  );

  const tableProps = useMemo(
    () => ({
      pagination,
      onPaginationChange,
      sorting,
      onSortingChange,
    }),
    [pagination, onPaginationChange, sorting, onSortingChange],
  );

  const accountMap = useMemo(() => {
    return new Map(accounts.map((a) => [a.id, a]));
  }, [accounts]);

  const filteredData = useMemo(() => {
    return transactions.filter((item) => {
      // Sidebar account filter
      if (selectedAccountId !== "all" && item.accountId !== selectedAccountId) {
        return false;
      }
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
  }, [transactions, selectedAccountId, filters]);

  const handleOpenAdd = () => {
    setEditingTransaction(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      deleteTransaction(deletingId);
      toast.success("Transaction deleted successfully");
      setDeletingId(null);
    }
  };

  const handleExport = async () => {
    if (filteredData.length === 0) {
      toast.error("No transactions to export");
      return;
    }
    setIsExporting(true);
    try {
      await exportExcel<Transaction>({
        fileName: `transactions_${new Date().toISOString().split("T")[0]}`,
        sheetName: "Transactions",
        columns: [
          { header: "Date", key: "date", width: 14, value: (r) => r.date },
          { header: "Description", key: "description", width: 28, value: (r) => r.description },
          { header: "Category", key: "category", width: 22, value: (r) => r.category },
          {
            header: "Account",
            key: "account",
            width: 20,
            value: (r) => accountMap.get(r.accountId)?.name ?? r.accountId,
          },
          {
            header: "Type",
            key: "type",
            width: 12,
            value: (r) => r.type.toUpperCase(),
          },
          {
            header: `Amount (${symbol})`,
            key: "amount",
            width: 14,
            numberFormat: `${symbol}#,##0.00`,
            value: (r) => (r.type === "income" ? r.amount : -r.amount),
          },
          {
            header: "Status",
            key: "status",
            width: 12,
            value: (r) => r.status.toUpperCase(),
          },
          { header: "Notes", key: "notes", width: 30, value: (r) => r.notes ?? "" },
        ],
        rows: filteredData,
      });
      toast.success("Exported transactions to Excel");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Excel file");
    } finally {
      setIsExporting(false);
    }
  };

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
          <div>
            <p className="font-medium text-xenia-ink-900">
              {String(info.getValue())}
            </p>
            {info.row.original.notes && (
              <p className="text-[11px] text-xenia-stone-400 truncate max-w-xs">
                {info.row.original.notes}
              </p>
            )}
          </div>
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
      {
        id: "actions",
        header: "Actions",
        cell: (info) => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenEdit(info.row.original)}
              title="Edit Transaction"
              className="rounded p-1 text-xenia-stone-500 transition-colors hover:bg-xenia-sand-100 hover:text-xenia-ink-900"
            >
              <Edit01Icon size={15} />
            </button>
            <button
              type="button"
              onClick={() => setDeletingId(info.row.original.id)}
              title="Delete Transaction"
              className="rounded p-1 text-xenia-stone-500 transition-colors hover:bg-xenia-danger-soft hover:text-xenia-danger"
            >
              <Delete02Icon size={15} />
            </button>
          </div>
        ),
      },
    ],
    [accountMap, format],
  );

  return (
    <PageShell width="default" spacing="md">
      <Heading
        title="Transactions"
        subtitle="Manage personal cash flow, income records, and expense entries."
        noIcon
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Buttons
              style="second"
              icon={<Download01Icon size={16} />}
              onClick={handleExport}
              loading={isExporting}
              className="flex-1 sm:flex-initial"
            >
              Export
            </Buttons>
            <Buttons
              style="main"
              icon={<Add01Icon size={16} />}
              onClick={handleOpenAdd}
              className="flex-1 sm:flex-initial"
            >
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
        <div className="grid grid-cols-2 gap-2.5 w-full sm:flex sm:w-auto">
          <div className="w-full sm:w-40">
            <Selects
              variant="filter"
              value={filters.type}
              onChange={(val) =>
                setFilters({
                  type: val as "all" | "income" | "expense",
                  page: 1,
                })
              }
              options={[
                { value: "all", label: "All Types" },
                { value: "income", label: "Income" },
                { value: "expense", label: "Expense" },
              ]}
            />
          </div>
          <div className="w-full sm:w-40">
            <Selects
              variant="filter"
              value={filters.status}
              onChange={(val) =>
                setFilters({
                  status: val as "all" | "paid" | "pending",
                  page: 1,
                })
              }
              options={[
                { value: "all", label: "All Status" },
                { value: "paid", label: "Paid" },
                { value: "pending", label: "Pending" },
              ]}
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={hydrated ? filteredData : []}
        totalItems={filteredData.length}
        pageSize={10}
        {...tableProps}
      />

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTransaction(null);
        }}
        transactionToEdit={editingTransaction}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? The account balance will be automatically adjusted."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
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
