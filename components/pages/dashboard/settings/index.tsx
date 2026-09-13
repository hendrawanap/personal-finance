"use client";

import React, { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Download01Icon,
  Upload01Icon,
  RefreshIcon,
  Delete02Icon,
  UserIcon,
  DatabaseIcon,
  FloppyDiskIcon,
  CloudIcon,
} from "hugeicons-react";

import { Heading } from "@/components/molecules/dashboard/head";
import { PageShell } from "@/components/molecules/dashboard/pageShell";
import { Buttons } from "@/components/atoms/buttons";
import {
  Field,
  FormSection,
  NativeSelect,
  TextInput,
} from "@/components/molecules/inputs/form";
import ConfirmDialog from "@/components/molecules/dashboard/unit/confirmDialog";
import { useFinanceStore, useFinanceHydrated } from "@/store/useFinanceStore";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  exportFinanceDataAsJson,
  importFinanceDataFromJson,
  STORAGE_KEY,
} from "@/lib/storage/financeStorage";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

export default function SettingsPage() {
  const hydrated = useFinanceHydrated();
  const profile = useFinanceStore((s) => s.profile);
  const updateProfile = useFinanceStore((s) => s.updateProfile);
  const resetToDefaults = useFinanceStore((s) => s.resetToDefaults);
  const clearAll = useFinanceStore((s) => s.clearAll);

  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.transactions);
  const budgets = useFinanceStore((s) => s.budgets);
  const splitBills = useFinanceStore((s) => s.splitBills);
  const syncToSupabase = useFinanceStore((s) => s.syncToSupabase);
  const syncFromSupabase = useFinanceStore((s) => s.syncFromSupabase);

  const [isSyncingToSupabase, setIsSyncingToSupabase] = useState(false);
  const [isSyncingFromSupabase, setIsSyncingFromSupabase] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();

  const handlePushToSupabase = async () => {
    if (!supabaseConfigured) {
      toast.error("Please configure NEXT_PUBLIC_SUPABASE_URL in .env");
      return;
    }
    setIsSyncingToSupabase(true);
    try {
      const res = await syncToSupabase();
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      toast.error(msg);
    } finally {
      setIsSyncingToSupabase(false);
    }
  };

  const handlePullFromSupabase = async () => {
    if (!supabaseConfigured) {
      toast.error("Please configure NEXT_PUBLIC_SUPABASE_URL in .env");
      return;
    }
    setIsSyncingFromSupabase(true);
    try {
      const ok = await syncFromSupabase();
      if (ok) {
        toast.success("Loaded latest finance records from Supabase");
      } else {
        toast.error("No records found or failed to fetch from Supabase");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fetch failed";
      toast.error(msg);
    } finally {
      setIsSyncingFromSupabase(false);
    }
  };

  // Form states for profile
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [currencySymbol, setCurrencySymbol] = useState(profile.currencySymbol);
  const [currencyCode, setCurrencyCode] = useState(profile.currencyCode);
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState(
    String(profile.monthlySavingsTarget || 3000),
  );

  // Dialog states
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: name.trim() || "User",
      email: email.trim(),
      currencySymbol,
      currencyCode,
      monthlySavingsTarget: parseFloat(monthlySavingsTarget) || 0,
    });
    toast.success("Preferences saved to LocalStorage");
  };

  const handleExportBackup = () => {
    try {
      const json = exportFinanceDataAsJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `personal_finance_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded successfully");
    } catch {
      toast.error("Failed to export backup");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        importFinanceDataFromJson(content);
        // Sync local store
        const parsed = JSON.parse(content);
        useFinanceStore.getState().importData(parsed);
        toast.success("Data restored successfully from backup");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Invalid backup JSON file";
        toast.error(message);
      }
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = "";
  };

  const handleConfirmReset = () => {
    resetToDefaults();
    setName("Alex Morgan");
    setEmail("alex.morgan@finance.io");
    setCurrencySymbol("$");
    setCurrencyCode("USD");
    setMonthlySavingsTarget("3000");
    setResetConfirmOpen(false);
    toast.success("Reset all data to default sample data");
  };

  const handleConfirmClear = () => {
    clearAll();
    setClearConfirmOpen(false);
    toast.success("Cleared all accounts, transactions, and budgets");
  };

  const storageSizeEstimate = useMemo(() => {
    void accounts.length;
    void transactions.length;
    void budgets.length;
    if (typeof window === "undefined") return "0 KB";
    try {
      const item = window.localStorage.getItem(STORAGE_KEY) || "";
      const kb = Math.round((item.length * 2) / 1024);
      return `${kb} KB`;
    } catch {
      return "N/A";
    }
  }, [accounts.length, transactions.length, budgets.length]);

  return (
    <PageShell width="narrow" spacing="md">
      <Heading
        title="Settings & Preferences"
        subtitle="Manage user preferences, currency standards, and LocalStorage data."
        noIcon
      />

      {/* Hidden file input for backup restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Profile & Currency Preferences Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <FormSection
          title="User Profile & Currency"
          description="Personalize your identity and default currency representation."
          icon={<UserIcon size={18} />}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" required>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
              />
            </Field>

            <Field label="Email Address">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@domain.com"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Currency Standard">
              <NativeSelect
                value={currencyCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setCurrencyCode(code);
                  const matched = SUPPORTED_CURRENCIES.find((c) => c.code === code);
                  if (matched) {
                    setCurrencySymbol(matched.symbol);
                  }
                }}
              >
                {SUPPORTED_CURRENCIES.map((cur) => (
                  <option key={cur.code} value={cur.code}>
                    {cur.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Currency Symbol">
              <TextInput
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="$ or Rp"
              />
            </Field>

            <Field label={`Monthly Savings Target (${currencySymbol})`}>
              <TextInput
                type="number"
                step="100"
                value={monthlySavingsTarget}
                onChange={(e) => setMonthlySavingsTarget(e.target.value)}
                placeholder="3000"
              />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <Buttons
              style="main"
              type="submit"
              icon={<FloppyDiskIcon size={16} />}
              className="w-full sm:w-auto justify-center"
            >
              Save Preferences
            </Buttons>
          </div>
        </FormSection>
      </form>

      {/* Supabase Cloud Database Section */}
      <FormSection
        title="Supabase Cloud Storage"
        description="Connect and synchronize your accounts, transactions, and split bills with your remote PostgreSQL database."
        icon={<CloudIcon size={18} />}
      >
        <div className="rounded-xl border border-xenia-border bg-white p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-xenia-ink-900">
                  Supabase Status:
                </span>
                {supabaseConfigured ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-xenia-moss-50 px-2.5 py-0.5 text-xs font-semibold text-xenia-moss-700 border border-xenia-moss-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-xenia-moss-600 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-xenia-brass-50 px-2.5 py-0.5 text-xs font-semibold text-xenia-brass-700 border border-xenia-brass-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-xenia-brass-500" />
                    Waiting for Project URL
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-xenia-stone-500">
                Schema: <code className="font-mono font-semibold text-xenia-moss-700">personal_finance</code>
                {" • "}
                Publishable Key: <code className="font-mono text-[11px] text-xenia-stone-600">sb_publishable_qa7P...</code>
              </p>
              {!supabaseConfigured && (
                <p className="mt-2 text-xs text-xenia-brass-700 bg-xenia-brass-50/80 p-2.5 rounded-xl border border-xenia-brass-200">
                  Publishable key is set. To complete connection, add your <code className="font-semibold">NEXT_PUBLIC_SUPABASE_URL</code> to <code className="font-semibold">.env</code>.
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Buttons
                style="second"
                size="sm"
                loading={isSyncingFromSupabase}
                onClick={handlePullFromSupabase}
                disabled={!supabaseConfigured}
                className="w-full sm:w-auto justify-center"
              >
                Pull from Supabase
              </Buttons>
              <Buttons
                style="main"
                size="sm"
                loading={isSyncingToSupabase}
                onClick={handlePushToSupabase}
                disabled={!supabaseConfigured}
                className="w-full sm:w-auto justify-center"
              >
                Sync Local to Supabase
              </Buttons>
            </div>
          </div>
        </div>
      </FormSection>

      {/* LocalStorage Data Management Section */}
      <FormSection
        title="LocalStorage Data Management"
        description="All application data is securely kept in your browser's LocalStorage."
        icon={<DatabaseIcon size={18} />}
      >
        {/* Storage stats */}
        <div className="rounded-xl border border-xenia-divider bg-xenia-sand-100/40 p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 text-center">
            <div>
              <p className="text-[11px] text-xenia-stone-500 uppercase">Accounts</p>
              <p className="font-mono text-base font-semibold text-xenia-ink-900">
                {hydrated ? accounts.length : 0}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-xenia-stone-500 uppercase">Transactions</p>
              <p className="font-mono text-base font-semibold text-xenia-ink-900">
                {hydrated ? transactions.length : 0}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-xenia-stone-500 uppercase">Budgets</p>
              <p className="font-mono text-base font-semibold text-xenia-ink-900">
                {hydrated ? budgets.length : 0}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-xenia-stone-500 uppercase">Split Bills</p>
              <p className="font-mono text-base font-semibold text-xenia-ink-900">
                {hydrated ? splitBills.length : 0}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[11px] text-xenia-stone-500 uppercase">Storage Size</p>
              <p className="font-mono text-base font-semibold text-xenia-moss-600">
                {storageSizeEstimate}
              </p>
            </div>
          </div>
        </div>

        {/* Data Actions */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-xenia-border bg-white p-4">
            <h3 className="text-sm font-medium text-xenia-ink-900">
              Backup & Export
            </h3>
            <p className="mt-0.5 text-xs text-xenia-stone-500">
              Download your complete accounts, transactions, and budgets as a JSON file.
            </p>
            <div className="mt-3">
              <Buttons
                style="second"
                size="sm"
                icon={<Download01Icon size={15} />}
                onClick={handleExportBackup}
                className="w-full sm:w-auto justify-center"
              >
                Export JSON Backup
              </Buttons>
            </div>
          </div>

          <div className="rounded-xl border border-xenia-border bg-white p-4">
            <h3 className="text-sm font-medium text-xenia-ink-900">
              Restore from Backup
            </h3>
            <p className="mt-0.5 text-xs text-xenia-stone-500">
              Upload a previously exported JSON file to restore your finance records.
            </p>
            <div className="mt-3">
              <Buttons
                style="second"
                size="sm"
                icon={<Upload01Icon size={15} />}
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto justify-center"
              >
                Choose Backup File
              </Buttons>
            </div>
          </div>
        </div>

        {/* Danger zone actions */}
        <div className="mt-4 border-t border-xenia-divider pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-xenia-ink-900">
                Reset to Default Sample Data
              </p>
              <p className="text-xs text-xenia-stone-500">
                Overwrites current records with the initial demo dataset.
              </p>
            </div>
            <Buttons
              style="second"
              size="sm"
              icon={<RefreshIcon size={15} />}
              onClick={() => setResetConfirmOpen(true)}
              className="w-full sm:w-auto justify-center"
            >
              Reset to Defaults
            </Buttons>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <p className="text-sm font-medium text-xenia-danger">
                Clear All Data
              </p>
              <p className="text-xs text-xenia-stone-500">
                Permanently wipes all accounts, transactions, and budgets from LocalStorage.
              </p>
            </div>
            <Buttons
              style="fourth"
              size="sm"
              icon={<Delete02Icon size={15} />}
              onClick={() => setClearConfirmOpen(true)}
              className="w-full sm:w-auto justify-center"
            >
              Clear Everything
            </Buttons>
          </div>
        </div>
      </FormSection>

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset to Sample Data"
        description="This will overwrite any newly created transactions or accounts with the original demo dataset. Continue?"
        confirmLabel="Reset Data"
        tone="default"
        onConfirm={handleConfirmReset}
        onCancel={() => setResetConfirmOpen(false)}
      />

      {/* Confirm Clear Dialog */}
      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear All LocalStorage Data"
        description="Are you sure you want to permanently delete all financial records from this browser? This action cannot be undone."
        confirmLabel="Clear All Data"
        tone="danger"
        typedConfirmation="DELETE ALL"
        onConfirm={handleConfirmClear}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </PageShell>
  );
}
