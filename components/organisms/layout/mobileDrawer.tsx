"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Cancel01Icon,
  CreditCardIcon,
  DashboardSquare01Icon,
  Invoice01Icon,
  Logout03Icon,
  ReceiptDollarIcon,
  Settings01Icon,
  Coins01Icon,
  Analytics01Icon,
  Wallet02Icon,
  UserGroupIcon,
  CheckmarkCircle02Icon,
} from "hugeicons-react";

import { usePermissions } from "@/hooks/usePermissions";
import { useLogout } from "@/hooks/mutation/auth/useLogout";
import { useAccountFilterStore } from "@/store/useAccountFilterStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { profile } = usePermissions();
  const storeProfile = useFinanceStore((s) => s.profile);
  const accounts = useFinanceStore((s) => s.accounts);
  const selectedAccountId = useAccountFilterStore((s) => s.selectedAccountId);
  const setSelectedAccountId = useAccountFilterStore((s) => s.setSelectedAccountId);
  const handleLogout = useLogout();

  const userName = profile?.name || storeProfile?.name || "User";
  const userEmail = profile?.email || storeProfile?.email || "user@finance.io";
  const initials = userName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navLinks = [
    { href: "/dashboard", label: "Overview", icon: DashboardSquare01Icon },
    { href: "/dashboard/transactions", label: "Transactions", icon: Invoice01Icon },
    { href: "/dashboard/split-bills", label: "Split Bills", icon: ReceiptDollarIcon },
    { href: "/dashboard/budgets", label: "Budgets", icon: Coins01Icon },
    { href: "/dashboard/accounts", label: "Accounts", icon: CreditCardIcon },
    { href: "/dashboard/analytics", label: "Analytics", icon: Analytics01Icon },
    { href: "/dashboard/settings", label: "Settings", icon: Settings01Icon },
  ];

  const isLinkActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : Boolean(pathname?.startsWith(href));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-xenia-forest-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-xenia-canvas text-xenia-ink-900 shadow-2xl transition-transform animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-xenia-border px-5 pt-[max(1rem,calc(0.5rem+env(safe-area-inset-top,0px)))] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-xenia-moss-600 text-white shadow-xs">
              <Wallet02Icon size={17} strokeWidth={2} />
            </div>
            <span className="font-display text-base font-semibold text-xenia-ink-900">
              Personal Finance
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xenia-stone-500 hover:bg-xenia-sand-100 hover:text-xenia-ink-900 transition-colors cursor-pointer"
          >
            <Cancel01Icon size={18} />
          </button>
        </div>

        {/* User Card */}
        <div className="border-b border-xenia-border bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-xenia-sage-100 text-sm font-semibold text-xenia-moss-700 ring-2 ring-xenia-moss-600/30">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-xenia-ink-900">
                {userName}
              </p>
              <p className="truncate text-xs text-xenia-stone-500">{userEmail}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Account Filter Switcher */}
          <div>
            <p className="px-2 text-[11px] font-semibold tracking-wider text-xenia-stone-500 uppercase">
              Filter Account
            </p>
            <div className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => setSelectedAccountId("all")}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left",
                  selectedAccountId === "all"
                    ? "bg-xenia-moss-600/10 text-xenia-moss-700 font-semibold"
                    : "text-xenia-stone-700 hover:bg-xenia-sand-100",
                )}
              >
                <span>💳 All Accounts</span>
                {selectedAccountId === "all" && (
                  <CheckmarkCircle02Icon size={15} className="text-xenia-moss-600" />
                )}
              </button>

              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left",
                    selectedAccountId === acc.id
                      ? "bg-xenia-moss-600/10 text-xenia-moss-700 font-semibold"
                      : "text-xenia-stone-700 hover:bg-xenia-sand-100",
                  )}
                >
                  <span className="truncate">{acc.name} ({acc.institution})</span>
                  {selectedAccountId === acc.id && (
                    <CheckmarkCircle02Icon size={15} className="text-xenia-moss-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <p className="px-2 text-[11px] font-semibold tracking-wider text-xenia-stone-500 uppercase">
              Pages
            </p>
            <nav className="mt-2 space-y-1">
              {navLinks.map((link) => {
                const isActive = isLinkActive(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-xenia-moss-600 text-white shadow-xs font-semibold"
                        : "text-xenia-stone-700 hover:bg-xenia-sand-100 hover:text-xenia-ink-900",
                    )}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2 : 1.75} />
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer with Logout */}
        <div className="border-t border-xenia-border bg-white px-5 pt-4 pb-[max(1rem,calc(0.5rem+env(safe-area-inset-bottom,0px)))]">
          <button
            type="button"
            onClick={() => {
              onClose();
              handleLogout();
            }}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-xenia-danger-soft px-4 py-2.5 text-sm font-medium text-xenia-danger hover:bg-xenia-danger-soft/80 transition-colors active:scale-98"
          >
            <Logout03Icon size={17} strokeWidth={2} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
