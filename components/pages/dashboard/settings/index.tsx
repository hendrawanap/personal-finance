"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  LockPasswordIcon,
  Logout03Icon,
  Copy01Icon,
  CheckmarkCircle02Icon,
  SecurityCheckIcon,
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
import { DialogShell } from "@/components/molecules/dashboard/unit/dialogShell";
import { useFinanceStore, useFinanceHydrated } from "@/store/useFinanceStore";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  exportFinanceDataAsJson,
  importFinanceDataFromJson,
  STORAGE_KEY,
} from "@/lib/storage/financeStorage";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { useProfile } from "@/hooks/query/auth/profile";
import { updatePassword } from "@/services/auth/passwordReset";
import { getCurrentSupabaseUser } from "@/services/supabase/auth.service";
import { persistProfile } from "@/services/finance/finance.service";
import { useLogout } from "@/hooks/mutation/auth/useLogout";
import { FinancialProfile } from "@/types/finance";

interface ProfilePreferencesProps {
  initialProfile: FinancialProfile;
  supabaseConfigured: boolean;
  onSave: (updated: FinancialProfile) => Promise<void>;
}

function ProfilePreferencesSection({
  initialProfile,
  onSave,
}: ProfilePreferencesProps) {
  const [name, setName] = useState(initialProfile.name);
  const [email, setEmail] = useState(initialProfile.email);
  const [currencySymbol, setCurrencySymbol] = useState(initialProfile.currencySymbol);
  const [currencyCode, setCurrencyCode] = useState(initialProfile.currencyCode);
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState(
    String(initialProfile.monthlySavingsTarget || 3000),
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim() || "User",
        email: email.trim(),
        currencySymbol,
        currencyCode,
        monthlySavingsTarget: parseFloat(monthlySavingsTarget) || 0,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection
        title="User Profile & Currency"
        description="Personalize your identity and default currency representation in your Supabase profile."
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
            loading={isSaving}
            icon={<FloppyDiskIcon size={16} />}
            className="w-full sm:w-auto justify-center"
          >
            Save Preferences
          </Buttons>
        </div>
      </FormSection>
    </form>
  );
}

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

  const { data: authProfile } = useProfile();
  const [supabaseUser, setSupabaseUser] = useState<{
    id: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      getCurrentSupabaseUser().then((u) => {
        if (u) {
          setSupabaseUser({
            id: u.id,
            email: u.email,
          });
        }
      });
    }
  }, []);

  const [isSyncingToSupabase, setIsSyncingToSupabase] = useState(false);
  const [isSyncingFromSupabase, setIsSyncingFromSupabase] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();

  // Password change modal state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handlePushToSupabase = async () => {
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
    setIsSyncingFromSupabase(true);
    try {
      const ok = await syncFromSupabase();
      if (ok) {
        toast.success("Loaded latest finance records from backend API");
      } else {
        toast.error("No records found or failed to fetch from backend API");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fetch failed";
      toast.error(msg);
    } finally {
      setIsSyncingFromSupabase(false);
    }
  };

  // Dialog states
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = async (updated: FinancialProfile) => {
    updateProfile(updated);
    const ok = await persistProfile(updated);
    if (ok) {
      toast.success("Preferences updated and synced to profile");
    } else {
      toast.success("Preferences saved to local store");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(newPassword);
      toast.success("Password updated successfully");
      setPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      toast.error(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleCopyUserId = () => {
    if (supabaseUser?.id) {
      navigator.clipboard.writeText(supabaseUser.id);
      toast.success("User ID copied to clipboard");
    }
  };

  const handleLogout = useLogout();

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
    e.target.value = "";
  };

  const handleConfirmReset = () => {
    resetToDefaults();
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

  const activeEmail = supabaseUser?.email || authProfile?.email || profile.email;
  const activeName = authProfile?.name || profile.name || "User";

  return (
    <PageShell width="narrow" spacing="md">
      <Heading
        title="Settings & Preferences"
        subtitle="Manage your Supabase user account, currency standards, and data synchronization."
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

      {/* Supabase User Account Section */}
      <FormSection
        title="Supabase User Account"
        description="Your cloud authentication profile and account security."
        icon={<SecurityCheckIcon size={18} />}
      >
        <div className="rounded-xl border border-xenia-border bg-white p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-xenia-moss-50 text-base font-semibold text-xenia-moss-700 ring-2 ring-xenia-brass-500/30">
                {activeName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-xenia-ink-900 truncate">
                    {activeName}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-xenia-moss-50 px-2 py-0.5 text-[11px] font-medium text-xenia-moss-700 border border-xenia-moss-200">
                    <CheckmarkCircle02Icon size={13} />
                    Supabase Authenticated
                  </span>
                </div>
                <p className="text-xs text-xenia-stone-500 truncate mt-0.5">
                  {activeEmail || "No email assigned"}
                </p>
                {supabaseUser?.id && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-xenia-stone-500">User ID:</span>
                    <code className="rounded bg-xenia-sand-100 px-1.5 py-0.5 font-mono text-[10px] text-xenia-stone-700">
                      {supabaseUser.id.substring(0, 13)}...
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyUserId}
                      title="Copy full User ID"
                      className="cursor-pointer text-xenia-stone-400 hover:text-xenia-stone-700 transition-colors"
                    >
                      <Copy01Icon size={13} />
                    </button>
                    <span className="text-[11px] text-xenia-moss-700 font-medium">
                      • Strict Owner Isolation Active
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2 sm:pt-0">
              <Buttons
                style="second"
                size="sm"
                icon={<LockPasswordIcon size={14} />}
                onClick={() => setPasswordDialogOpen(true)}
              >
                Change Password
              </Buttons>
              <Buttons
                style="fourth"
                size="sm"
                icon={<Logout03Icon size={14} />}
                onClick={handleLogout}
              >
                Sign Out
              </Buttons>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Profile & Currency Preferences Form */}
      <ProfilePreferencesSection
        key={`${profile.name}-${profile.email}-${profile.currencyCode}-${profile.currencySymbol}-${profile.monthlySavingsTarget}`}
        initialProfile={profile}
        supabaseConfigured={supabaseConfigured}
        onSave={handleSaveProfile}
      />

      {/* Supabase Cloud Database Section */}
      <FormSection
        title="Supabase Cloud Storage"
        description="Synchronize your personal accounts, transactions, and split bills with your remote PostgreSQL database."
        icon={<CloudIcon size={18} />}
      >
        <div className="rounded-xl border border-xenia-border bg-white p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-xenia-ink-900">
                  Cloud Backend Status:
                </span>
                {supabaseConfigured ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-xenia-moss-50 px-2.5 py-0.5 text-xs font-semibold text-xenia-moss-700 border border-xenia-moss-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-xenia-moss-600 animate-pulse" />
                    Connected via BFF
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-xenia-brass-50 px-2.5 py-0.5 text-xs font-semibold text-xenia-brass-700 border border-xenia-brass-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-xenia-brass-500" />
                    Local Offline Mode
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-xenia-stone-500">
                Schema: <code className="font-mono font-semibold text-xenia-moss-700">personal_finance</code>
                {" • "}
                Architecture: <span className="font-semibold text-xenia-moss-700">Next.js BFF (Pure DB Queries)</span>
              </p>
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
        description="Client-side storage provides rapid offline performance and local persistence."
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

      {/* Password Change Modal */}
      <DialogShell
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        title="Change Supabase Password"
        description="Enter a new password for your Supabase account."
        size="sm"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
          <Field label="New Password (min. 6 characters)" required>
            <TextInput
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>
          <Field label="Confirm New Password" required>
            <TextInput
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>
          <div className="flex justify-end gap-2 pt-4">
            <Buttons
              type="button"
              style="second"
              size="sm"
              onClick={() => setPasswordDialogOpen(false)}
            >
              Cancel
            </Buttons>
            <Buttons
              type="submit"
              style="main"
              size="sm"
              loading={isUpdatingPassword}
            >
              Update Password
            </Buttons>
          </div>
        </form>
      </DialogShell>

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
