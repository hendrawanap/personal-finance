"use client";

import React, { Suspense, useMemo, useState } from "react";
import { Add01Icon, Coins01Icon, Delete02Icon, Edit01Icon } from "hugeicons-react";
import toast from "react-hot-toast";

import { PageShell } from "@/components/molecules/dashboard/pageShell";
import { Heading } from "@/components/molecules/dashboard/head";
import { Buttons } from "@/components/atoms/buttons";
import { StatCard } from "@/components/molecules/dashboard/statCard";
import { useFinanceStore, useFinanceHydrated } from "@/store/useFinanceStore";
import { BudgetModal } from "@/components/molecules/finance/budgetModal";
import ConfirmDialog from "@/components/molecules/dashboard/unit/confirmDialog";
import { Budget } from "@/types/finance";
import { useCurrency } from "@/lib/currency";

function BudgetsContent() {
  const hydrated = useFinanceHydrated();
  const { format } = useCurrency();
  const budgets = useFinanceStore((s) => s.budgets);
  const transactions = useFinanceStore((s) => s.transactions);
  const deleteBudget = useFinanceStore((s) => s.deleteBudget);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Compute live spending for current month for each category
  const { categoryBudgets, totalAllocated, totalSpent, remaining } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const list = budgets.map((b) => {
      // Sum expense transactions in current month
      const catSpent = transactions
        .filter((tx) => {
          if (tx.type !== "expense") return false;
          if (tx.category !== b.category) return false;
          const d = new Date(tx.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);

      const pct = b.allocated > 0 ? Math.round((catSpent / b.allocated) * 100) : 0;
      return {
        ...b,
        spent: catSpent,
        percentage: Math.min(100, pct),
        rawPercentage: pct,
        isNearLimit: pct >= 90,
      };
    });

    const allocatedSum = list.reduce((sum, b) => sum + b.allocated, 0);
    const spentSum = list.reduce((sum, b) => sum + b.spent, 0);

    return {
      categoryBudgets: list,
      totalAllocated: allocatedSum,
      totalSpent: spentSum,
      remaining: allocatedSum - spentSum,
    };
  }, [budgets, transactions]);

  const handleOpenAdd = () => {
    setEditingBudget(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (b: Budget) => {
    setEditingBudget(b);
    setModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      deleteBudget(deletingId);
      toast.success("Budget removed successfully");
      setDeletingId(null);
    }
  };

  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
      new Date(),
    );
  }, []);

  return (
    <PageShell width="default" spacing="md">
      <Heading
        title="Budgets"
        subtitle="Set limits, track category spending, and prevent overspending."
        noIcon
        actions={
          <Buttons
            style="main"
            icon={<Add01Icon size={16} />}
            onClick={handleOpenAdd}
            className="w-full sm:w-auto"
          >
            Create Budget
          </Buttons>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          eyebrow="Monthly Allowance"
          title="Total Budget"
          value={hydrated ? format(totalAllocated, 0) : format(0, 0)}
          valueAccent="stone"
          delta={`${budgets.length} Categories`}
          deltaTone="idle"
          icon={<Coins01Icon size={18} />}
          subtext={`Budget targets for ${currentMonthName}`}
        />
        <StatCard
          eyebrow="Utilized"
          title="Total Spent"
          value={hydrated ? format(totalSpent, 0) : format(0, 0)}
          valueAccent="brass"
          delta={
            totalAllocated > 0
              ? `${Math.round((totalSpent / totalAllocated) * 100)}% Used`
              : "0% Used"
          }
          deltaTone={totalSpent > totalAllocated ? "warn" : "ok"}
          icon={<Coins01Icon size={18} />}
          subtext="Actual expenses this month"
        />
        <StatCard
          eyebrow="Available"
          title="Remaining"
          value={hydrated ? format(remaining, 0) : format(0, 0)}
          valueAccent={remaining >= 0 ? "moss" : "stone"}
          delta={remaining >= 0 ? "Under Limit" : "Over Budget"}
          deltaTone={remaining >= 0 ? "ok" : "warn"}
          icon={<Coins01Icon size={18} />}
          subtext={remaining >= 0 ? "Safe allowance remaining" : "Exceeded total budget"}
        />
      </div>

      {/* Budgets List Panel */}
      <div className="rounded-xl border border-xenia-border bg-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-medium text-xenia-ink-900">
              Category Budgets
            </h2>
            <p className="text-xs text-xenia-stone-500">
              Monthly expenditure derived dynamically from your transactions
            </p>
          </div>
          <div className="self-start sm:self-auto">
            <Buttons style="second" size="sm" onClick={handleOpenAdd}>
              + Add Target
            </Buttons>
          </div>
        </div>

        {categoryBudgets.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-xenia-ink-900">
              No category budgets set
            </p>
            <p className="mt-1 text-xs text-xenia-stone-500">
              Set monthly spending targets to visualize your progress.
            </p>
            <div className="mt-4">
              <Buttons style="main" onClick={handleOpenAdd} icon={<Add01Icon size={16} />} className="w-full sm:w-auto">
                Create Budget
              </Buttons>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {categoryBudgets.map((b) => (
              <div key={b.id} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-xenia-ink-900 truncate">
                      {b.category}
                    </span>
                    <span className="text-xs text-xenia-stone-500 shrink-0">
                      ({b.period})
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto sm:ml-0">
                    <div className="text-right">
                      <span className="font-mono font-medium text-xenia-ink-900">
                        {format(b.spent, 0)}
                      </span>
                      <span className="text-xs text-xenia-stone-500 font-mono">
                        {" "}
                        / {format(b.allocated, 0)} ({b.rawPercentage}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(b)}
                        title="Edit Budget"
                        className="rounded p-1 text-xenia-stone-400 hover:bg-xenia-sand-100 hover:text-xenia-ink-900 transition-colors cursor-pointer"
                      >
                        <Edit01Icon size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(b.id)}
                        title="Delete Budget"
                        className="rounded p-1 text-xenia-stone-400 hover:bg-xenia-danger-soft hover:text-xenia-danger transition-colors cursor-pointer"
                      >
                        <Delete02Icon size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-xenia-sand-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      b.isNearLimit ? "bg-xenia-warn-ink" : "bg-xenia-moss-600"
                    }`}
                    style={{ width: `${b.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Budget Modal */}
      <BudgetModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingBudget(null);
        }}
        budgetToEdit={editingBudget}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Delete Budget Target"
        description="Are you sure you want to remove this budget target? Past transactions in this category will not be deleted."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
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
