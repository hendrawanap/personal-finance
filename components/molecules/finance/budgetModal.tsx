"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";

import { DialogShell } from "@/components/molecules/dashboard/unit/dialogShell";
import {
  Field,
  NativeSelect,
  TextInput,
} from "@/components/molecules/inputs/form";
import { Buttons } from "@/components/atoms/buttons";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Budget, BudgetPeriod, EXPENSE_CATEGORIES } from "@/types/finance";
import { useCurrency } from "@/lib/currency";

interface BudgetModalProps {
  open: boolean;
  onClose: () => void;
  budgetToEdit?: Budget | null;
}

export function BudgetModal({
  open,
  onClose,
  budgetToEdit,
}: BudgetModalProps) {
  const isEditing = Boolean(budgetToEdit);

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Category Budget" : "Create Budget Target"}
      description={
        isEditing
          ? "Modify the spending allowance for this category."
          : "Assign a target allowance to prevent overspending in this category."
      }
      size="sm"
    >
      <BudgetForm
        key={open ? (budgetToEdit?.id ?? "new-budget") : "closed"}
        budgetToEdit={budgetToEdit}
        onClose={onClose}
      />
    </DialogShell>
  );
}

function BudgetForm({
  budgetToEdit,
  onClose,
}: {
  budgetToEdit?: Budget | null;
  onClose: () => void;
}) {
  const addBudget = useFinanceStore((s) => s.addBudget);
  const updateBudget = useFinanceStore((s) => s.updateBudget);
  const existingBudgets = useFinanceStore((s) => s.budgets);

  const isEditing = Boolean(budgetToEdit);
  const { symbol } = useCurrency();

  const [category, setCategory] = useState<string>(() => {
    if (budgetToEdit) return budgetToEdit.category;
    const usedCategories = new Set(existingBudgets.map((b) => b.category));
    const available = EXPENSE_CATEGORIES.find((c) => !usedCategories.has(c));
    return available ?? EXPENSE_CATEGORIES[0];
  });
  const [allocated, setAllocated] = useState<string>(() =>
    budgetToEdit ? String(budgetToEdit.allocated) : "500",
  );
  const [period, setPeriod] = useState<BudgetPeriod>(
    () => budgetToEdit?.period ?? "Monthly",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!category.trim()) newErrors.category = "Category is required";
    const numAllocated = parseFloat(allocated);
    if (isNaN(numAllocated) || numAllocated <= 0) {
      newErrors.allocated = "Please enter an allowance greater than 0";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (isEditing && budgetToEdit) {
      updateBudget(budgetToEdit.id, {
        category,
        allocated: numAllocated,
        period,
      });
      toast.success("Budget updated successfully");
    } else {
      addBudget({
        category,
        allocated: numAllocated,
        period,
        color: "bg-xenia-moss-600",
      });
      toast.success("Budget created successfully");
    }

    onClose();
  };

  return (
    <form id="budget-form" onSubmit={handleSubmit} className="space-y-4">
      <Field label="Category" required error={errors.category}>
        <NativeSelect
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field
        label={`Budget Allowance (${symbol})`}
        required
        error={errors.allocated}
        hint="Maximum desired expenditure per period"
      >
        <TextInput
          type="number"
          step="10"
          min="1"
          placeholder="500"
          value={allocated}
          onChange={(e) => setAllocated(e.target.value)}
          invalid={Boolean(errors.allocated)}
        />
      </Field>

      <Field label="Budget Period" required>
        <NativeSelect
          value={period}
          onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
        >
          <option value="Monthly">Monthly</option>
          <option value="Weekly">Weekly</option>
          <option value="Yearly">Yearly</option>
        </NativeSelect>
      </Field>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-4 border-t border-xenia-divider">
        <Buttons
          style="second"
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto justify-center"
        >
          Cancel
        </Buttons>
        <Buttons
          style="main"
          type="submit"
          className="w-full sm:w-auto justify-center"
        >
          {isEditing ? "Update Budget" : "Save Budget"}
        </Buttons>
      </div>
    </form>
  );
}
