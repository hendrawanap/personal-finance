"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";

import { DialogShell } from "@/components/molecules/dashboard/unit/dialogShell";
import {
  Field,
  NativeSelect,
  TextArea,
  TextInput,
} from "@/components/molecules/inputs/form";
import { Buttons } from "@/components/atoms/buttons";
import { useFinanceStore } from "@/store/useFinanceStore";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Transaction,
  TransactionStatus,
  TransactionType,
} from "@/types/finance";
import { useCurrency } from "@/lib/currency";

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

export function TransactionModal({
  open,
  onClose,
  transactionToEdit,
}: TransactionModalProps) {
  const isEditing = Boolean(transactionToEdit);

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Transaction" : "Add Transaction"}
      description={
        isEditing
          ? "Update details of this recorded transaction."
          : "Record an income or expense in your personal finance tracker."
      }
      size="md"
    >
      <TransactionForm
        key={open ? (transactionToEdit?.id ?? "new-transaction") : "closed"}
        transactionToEdit={transactionToEdit}
        onClose={onClose}
      />
    </DialogShell>
  );
}

function TransactionForm({
  transactionToEdit,
  onClose,
}: {
  transactionToEdit?: Transaction | null;
  onClose: () => void;
}) {
  const accounts = useFinanceStore((s) => s.accounts);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);

  const isEditing = Boolean(transactionToEdit);
  const { symbol } = useCurrency();

  const [date, setDate] = useState(
    () => transactionToEdit?.date ?? new Date().toISOString().split("T")[0],
  );
  const [description, setDescription] = useState(
    () => transactionToEdit?.description ?? "",
  );
  const [type, setType] = useState<TransactionType>(
    () => transactionToEdit?.type ?? "expense",
  );
  const [amount, setAmount] = useState(
    () => (transactionToEdit ? String(transactionToEdit.amount) : ""),
  );
  const [category, setCategory] = useState(
    () => transactionToEdit?.category ?? EXPENSE_CATEGORIES[0],
  );
  const [accountId, setAccountId] = useState(
    () => transactionToEdit?.accountId ?? (accounts[0]?.id || ""),
  );
  const [status, setStatus] = useState<TransactionStatus>(
    () => transactionToEdit?.status ?? "paid",
  );
  const [notes, setNotes] = useState(() => transactionToEdit?.notes ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories =
    type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const nextCategories =
      nextType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setCategory(nextCategories[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!description.trim()) {
      newErrors.description = "Description is required";
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = "Please enter a valid amount greater than 0";
    }
    if (!accountId) {
      newErrors.accountId = "Please select an account";
    }
    if (!date) {
      newErrors.date = "Date is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (isEditing && transactionToEdit) {
      updateTransaction(transactionToEdit.id, {
        date,
        description: description.trim(),
        type,
        amount: Math.abs(numAmount),
        category,
        accountId,
        status,
        notes: notes.trim() || undefined,
      });
      toast.success("Transaction updated successfully");
    } else {
      addTransaction({
        date,
        description: description.trim(),
        type,
        amount: Math.abs(numAmount),
        category,
        accountId,
        status,
        notes: notes.trim() || undefined,
      });
      toast.success("Transaction recorded successfully");
    }

    onClose();
  };

  return (
    <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Type & Date */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Transaction Type" required>
          <NativeSelect
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as TransactionType)}
          >
            <option value="expense">Expense (Money Out)</option>
            <option value="income">Income (Money In)</option>
          </NativeSelect>
        </Field>

        <Field label="Date" required error={errors.date}>
          <TextInput
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            invalid={Boolean(errors.date)}
          />
        </Field>
      </div>

      {/* Description */}
      <Field
        label="Description"
        required
        error={errors.description}
        hint="e.g. Grocery Store, Rent, Freelance Client"
      >
        <TextInput
          placeholder="What was this transaction for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          invalid={Boolean(errors.description)}
        />
      </Field>

      {/* Amount & Account */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label={`Amount (${symbol})`}
          required
          error={errors.amount}
          hint="Positive number"
        >
          <TextInput
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            invalid={Boolean(errors.amount)}
          />
        </Field>

        <Field label="Account" required error={errors.accountId}>
          <NativeSelect
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            invalid={Boolean(errors.accountId)}
          >
            <option value="">Select Account</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.institution})
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      {/* Category & Status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category" required>
          <NativeSelect
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="Payment Status" required>
          <NativeSelect
            value={status}
            onChange={(e) => setStatus(e.target.value as TransactionStatus)}
          >
            <option value="paid">Paid / Settled</option>
            <option value="pending">Pending</option>
          </NativeSelect>
        </Field>
      </div>

      {/* Notes */}
      <Field label="Notes (Optional)">
        <TextArea
          placeholder="Add any extra details, invoice numbers, or tags..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
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
          {isEditing ? "Update Transaction" : "Save Transaction"}
        </Buttons>
      </div>
    </form>
  );
}
