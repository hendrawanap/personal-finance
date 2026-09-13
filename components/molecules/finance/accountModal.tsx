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
import { Account, AccountType } from "@/types/finance";

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  accountToEdit?: Account | null;
}

export function AccountModal({
  open,
  onClose,
  accountToEdit,
}: AccountModalProps) {
  const isEditing = Boolean(accountToEdit);

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Account" : "Link / Add Account"}
      description={
        isEditing
          ? "Update the configuration or details of this financial account."
          : "Add a bank, credit card, investment brokerage, or cash wallet."
      }
      size="md"
    >
      <AccountForm
        key={open ? (accountToEdit?.id ?? "new-account") : "closed"}
        accountToEdit={accountToEdit}
        onClose={onClose}
      />
    </DialogShell>
  );
}

function AccountForm({
  accountToEdit,
  onClose,
}: {
  accountToEdit?: Account | null;
  onClose: () => void;
}) {
  const addAccount = useFinanceStore((s) => s.addAccount);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const profile = useFinanceStore((s) => s.profile);

  const isEditing = Boolean(accountToEdit);

  const [name, setName] = useState(() => accountToEdit?.name ?? "");
  const [institution, setInstitution] = useState(
    () => accountToEdit?.institution ?? "",
  );
  const [type, setType] = useState<AccountType>(
    () => accountToEdit?.type ?? "checking",
  );
  const [accountNumber, setAccountNumber] = useState(
    () => accountToEdit?.accountNumber ?? "•••• " + Math.floor(1000 + Math.random() * 9000),
  );
  const [balance, setBalance] = useState(
    () => (accountToEdit ? String(accountToEdit.balance) : "0.00"),
  );
  const [currency, setCurrency] = useState(
    () => accountToEdit?.currency ?? profile?.currencyCode ?? "USD",
  );
  const [accent, setAccent] = useState<"moss" | "brass" | "info" | "stone">(
    () => accountToEdit?.accent ?? "moss",
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Account name is required";
    if (!institution.trim()) newErrors.institution = "Financial institution is required";
    const numBalance = parseFloat(balance);
    if (isNaN(numBalance)) newErrors.balance = "Please enter a valid balance";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (isEditing && accountToEdit) {
      updateAccount(accountToEdit.id, {
        name: name.trim(),
        institution: institution.trim(),
        type,
        accountNumber: accountNumber.trim(),
        balance: numBalance,
        currency,
        accent,
      });
      toast.success("Account updated successfully");
    } else {
      addAccount({
        name: name.trim(),
        institution: institution.trim(),
        type,
        accountNumber: accountNumber.trim(),
        balance: numBalance,
        currency,
        accent,
      });
      toast.success("Account added successfully");
    }

    onClose();
  };

  return (
    <form id="account-form" onSubmit={handleSubmit} className="space-y-4">
      <Field label="Account Name" required error={errors.name}>
        <TextInput
          placeholder="e.g. Primary Checking, Emergency Savings"
          value={name}
          onChange={(e) => setName(e.target.value)}
          invalid={Boolean(errors.name)}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Financial Institution" required error={errors.institution}>
          <TextInput
            placeholder="e.g. Chase, Bank of America, Vanguard"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            invalid={Boolean(errors.institution)}
          />
        </Field>

        <Field label="Account Type" required>
          <NativeSelect
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
          >
            <option value="checking">Checking</option>
            <option value="savings">High-Yield Savings</option>
            <option value="credit">Credit Card</option>
            <option value="investment">Brokerage / Investment</option>
            <option value="cash">Cash / Physical Wallet</option>
          </NativeSelect>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Current Balance"
          required
          error={errors.balance}
          hint="Negative for credit card debt"
        >
          <TextInput
            type="number"
            step="0.01"
            placeholder="0.00"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            invalid={Boolean(errors.balance)}
          />
        </Field>

        <Field label="Currency" required>
          <NativeSelect
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="IDR">IDR - Indonesian Rupiah (Rp)</option>
            <option value="USD">USD - US Dollar ($)</option>
            <option value="EUR">EUR - Euro (€)</option>
            <option value="GBP">GBP - British Pound (£)</option>
            <option value="SGD">SGD - Singapore Dollar (S$)</option>
            <option value="JPY">JPY - Japanese Yen (¥)</option>
            <option value="AUD">AUD - Australian Dollar (A$)</option>
          </NativeSelect>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Account Number / Mask">
          <TextInput
            placeholder="e.g. •••• 4821"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Card Accent Tone">
        <NativeSelect
          value={accent}
          onChange={(e) =>
            setAccent(e.target.value as "moss" | "brass" | "info" | "stone")
          }
        >
          <option value="moss">Moss Green (Default)</option>
          <option value="brass">Brass / Warm Gold</option>
          <option value="info">Ocean Blue</option>
          <option value="stone">Stone Gray</option>
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
          {isEditing ? "Update Account" : "Save Account"}
        </Buttons>
      </div>
    </form>
  );
}
