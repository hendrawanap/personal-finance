"use client";

import React, { Suspense, useMemo, useState } from "react";
import {
  Add01Icon,
  CreditCardIcon,
  Coins01Icon,
  Wallet02Icon,
  Invoice01Icon,
  Edit01Icon,
  Delete02Icon,
} from "hugeicons-react";
import toast from "react-hot-toast";

import { PageShell } from "@/components/molecules/dashboard/pageShell";
import { Heading } from "@/components/molecules/dashboard/head";
import { Buttons } from "@/components/atoms/buttons";
import { StatCard } from "@/components/molecules/dashboard/statCard";
import { useFinanceStore, useFinanceHydrated } from "@/store/useFinanceStore";
import { AccountModal } from "@/components/molecules/finance/accountModal";
import ConfirmDialog from "@/components/molecules/dashboard/unit/confirmDialog";
import { Account } from "@/types/finance";
import { useCurrency } from "@/lib/currency";

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

function AccountsContent() {
  const hydrated = useFinanceHydrated();
  const { format } = useCurrency();
  const accounts = useFinanceStore((s) => s.accounts);
  const deleteAccount = useFinanceStore((s) => s.deleteAccount);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Computed account categories metrics
  const { cashAndLiquid, liabilities, investments, liquidCount } = useMemo(() => {
    let liquid = 0;
    let debts = 0;
    let portfolio = 0;
    let liquidAccounts = 0;

    for (const acc of accounts) {
      if (acc.type === "checking" || acc.type === "savings" || acc.type === "cash") {
        if (acc.balance > 0) liquid += acc.balance;
        liquidAccounts++;
      } else if (acc.type === "credit") {
        debts += Math.abs(acc.balance);
      } else if (acc.type === "investment") {
        portfolio += acc.balance;
      }
    }

    return {
      cashAndLiquid: liquid,
      liabilities: debts,
      investments: portfolio,
      liquidCount: liquidAccounts,
    };
  }, [accounts]);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      deleteAccount(deletingId);
      toast.success("Account deleted successfully");
      setDeletingId(null);
    }
  };

  return (
    <PageShell width="default" spacing="md">
      <Heading
        title="Accounts"
        subtitle="Manage linked banks, credit lines, cash wallets, and investment portfolios."
        noIcon
        actions={
          <Buttons
            style="main"
            icon={<Add01Icon size={16} />}
            onClick={handleOpenAdd}
            className="w-full sm:w-auto"
          >
            Link Account
          </Buttons>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          eyebrow="Cash & Liquid"
          title="Bank Balances"
          value={hydrated ? format(cashAndLiquid) : format(0)}
          valueAccent="moss"
          delta={`${liquidCount} Accounts`}
          deltaTone="ok"
          icon={<Wallet02Icon size={18} />}
          subtext="Checking, Savings, and Cash"
        />
        <StatCard
          eyebrow="Liabilities"
          title="Credit & Loans"
          value={hydrated ? format(liabilities) : format(0)}
          valueAccent="brass"
          delta="Total Debt"
          deltaTone={liabilities > 0 ? "warn" : "ok"}
          icon={<CreditCardIcon size={18} />}
          subtext="Credit cards and obligations"
        />
        <StatCard
          eyebrow="Investments"
          title="Portfolio Assets"
          value={hydrated ? format(investments) : format(0)}
          valueAccent="info"
          delta="Brokerage & Index"
          deltaTone="ok"
          icon={<Coins01Icon size={18} />}
          subtext="Equities, ETFs, and Retirement"
        />
      </div>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-xenia-border bg-white/50 p-8 sm:p-12 text-center">
          <p className="font-display text-base font-medium text-xenia-ink-900">
            No accounts configured
          </p>
          <p className="mt-1 text-xs text-xenia-stone-500">
            Click &quot;Link Account&quot; to add your first bank account or wallet.
          </p>
          <div className="mt-4">
            <Buttons style="main" onClick={handleOpenAdd} icon={<Add01Icon size={16} />} className="w-full sm:w-auto">
              Link Account
            </Buttons>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {accounts.map((account) => {
            const Icon = getAccountIcon(account.type);
            const isNegative = account.balance < 0;

            return (
              <div
                key={account.id}
                className="group relative rounded-xl border border-xenia-border bg-white p-4 sm:p-5 transition-shadow hover:shadow-sm"
              >
                <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-xenia-sand-100 text-xenia-moss-600">
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-xenia-ink-900 truncate">
                        {account.name}
                      </h3>
                      <p className="text-xs text-xenia-stone-500 truncate">
                        {account.institution} · {account.accountNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-start">
                    <span className="rounded-md bg-xenia-sand-100 px-2 py-0.5 text-xs text-xenia-stone-700 capitalize">
                      {account.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(account)}
                      title="Edit Account"
                      className="rounded p-1 text-xenia-stone-400 hover:bg-xenia-sand-100 hover:text-xenia-ink-900 transition-colors cursor-pointer"
                    >
                      <Edit01Icon size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(account.id)}
                      title="Delete Account"
                      className="rounded p-1 text-xenia-stone-400 hover:bg-xenia-danger-soft hover:text-xenia-danger transition-colors cursor-pointer"
                    >
                      <Delete02Icon size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex items-baseline justify-between border-t border-xenia-divider pt-4">
                  <span className="text-xs text-xenia-stone-500">
                    Current Balance
                  </span>
                  <span
                    className={`font-mono text-lg font-semibold ${
                      isNegative ? "text-xenia-danger" : "text-xenia-ink-900"
                    }`}
                  >
                    {format(account.balance)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Link / Edit Account Modal */}
      <AccountModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingAccount(null);
        }}
        accountToEdit={editingAccount}
      />

      {/* Delete Account Confirmation */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Delete Account"
        description="Are you sure you want to remove this account? Any transactions linked to this account will also be removed."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </PageShell>
  );
}

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsContent />
    </Suspense>
  );
}
