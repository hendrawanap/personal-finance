"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CreditCardIcon,
  Menu01Icon,
  Search01Icon,
  Wallet02Icon,
  CheckmarkCircle02Icon,
  ArrowDown01Icon,
} from "hugeicons-react";

import GlobalSearch from "@/components/organisms/layout/globalSearch";
import { useProfile } from "@/hooks/query/auth/profile";
import { useAccountFilterStore } from "@/store/useAccountFilterStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  onOpenDrawer: () => void;
}

function useSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen]);
}

export function MobileHeader({ onOpenDrawer }: MobileHeaderProps) {
  const pathname = usePathname();
  const { data: profile } = useProfile();
  const storeProfile = useFinanceStore((s) => s.profile);
  const accounts = useFinanceStore((s) => s.accounts);
  const selectedAccountId = useAccountFilterStore((s) => s.selectedAccountId);
  const setSelectedAccountId = useAccountFilterStore((s) => s.setSelectedAccountId);

  const [searchOpen, setSearchOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  useSearchShortcut(openSearch);

  // Close account dropdown on outside click
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  const userName = profile?.name || storeProfile?.name || "User";
  const firstName = userName.trim().split(/\s+/)[0];
  const initials = userName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Active account label
  const activeAccount = useMemo(() => {
    if (selectedAccountId === "all") return "All Accounts";
    const found = accounts.find((a) => a.id === selectedAccountId);
    return found ? found.name : "All Accounts";
  }, [selectedAccountId, accounts]);

  // Context-aware title
  const pageTitle = useMemo(() => {
    if (pathname === "/dashboard") return `Hi, ${firstName} 👋`;
    if (pathname.startsWith("/dashboard/split-bills") || pathname.startsWith("/dashboard/split-bill"))
      return "Split Bills";
    if (pathname.startsWith("/dashboard/transactions")) return "Transactions";
    if (pathname.startsWith("/dashboard/budgets")) return "Budgets";
    if (pathname.startsWith("/dashboard/accounts")) return "Accounts";
    if (pathname.startsWith("/dashboard/analytics")) return "Analytics";
    if (pathname.startsWith("/dashboard/settings")) return "Settings";
    return "Personal Finance";
  }, [pathname, firstName]);

  const pageSubtitle = useMemo(() => {
    if (pathname === "/dashboard") return "Overview";
    if (pathname.startsWith("/dashboard/split-bills") || pathname.startsWith("/dashboard/split-bill"))
      return "Shared expenses";
    if (pathname.startsWith("/dashboard/transactions")) return "Activity feed";
    if (pathname.startsWith("/dashboard/budgets")) return "Spending limits";
    if (pathname.startsWith("/dashboard/accounts")) return "Wallets & cards";
    if (pathname.startsWith("/dashboard/analytics")) return "Insights";
    if (pathname.startsWith("/dashboard/settings")) return "Preferences";
    return "";
  }, [pathname]);

  return (
    <>
      <header className="shrink-0 sticky top-0 z-30 w-full border-b border-xenia-border/80 bg-xenia-canvas/90 px-4 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] pb-2.5 backdrop-blur-md sm:pt-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: User Avatar & Context Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onOpenDrawer}
              title="Open profile menu"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-xenia-sage-100 text-xs font-semibold text-xenia-moss-700 ring-2 ring-xenia-moss-600/30 transition-transform active:scale-95 cursor-pointer shadow-2xs"
            >
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-xenia-moss-600" />
            </button>

            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold leading-tight text-xenia-ink-900 truncate">
                {pageTitle}
              </h2>
              {pageSubtitle && (
                <p className="text-[11px] font-medium text-xenia-stone-500 leading-none mt-0.5 truncate">
                  {pageSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Account filter chip, Search, & Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Account Quick Switcher */}
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-full border border-xenia-border bg-white/80 px-2.5 py-1 text-xs font-medium text-xenia-stone-700 shadow-2xs transition-colors hover:border-xenia-moss-600 hover:bg-white active:scale-95 cursor-pointer"
              >
                <CreditCardIcon size={13} className="text-xenia-moss-600 shrink-0" />
                <span className="max-w-[70px] sm:max-w-[100px] truncate text-[11px]">
                  {activeAccount}
                </span>
                <ArrowDown01Icon
                  size={12}
                  className={cn(
                    "text-xenia-stone-400 transition-transform",
                    accountMenuOpen && "rotate-180",
                  )}
                />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-48 rounded-2xl border border-xenia-border bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-xenia-stone-400">
                    Filter Account
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAccountId("all");
                      setAccountMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors text-left cursor-pointer",
                      selectedAccountId === "all"
                        ? "bg-xenia-moss-600/10 text-xenia-moss-700 font-semibold"
                        : "text-xenia-stone-700 hover:bg-xenia-sand-100",
                    )}
                  >
                    <span>All Accounts</span>
                    {selectedAccountId === "all" && (
                      <CheckmarkCircle02Icon size={14} className="text-xenia-moss-600" />
                    )}
                  </button>

                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccountId(acc.id);
                        setAccountMenuOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors text-left cursor-pointer",
                        selectedAccountId === acc.id
                          ? "bg-xenia-moss-600/10 text-xenia-moss-700 font-semibold"
                          : "text-xenia-stone-700 hover:bg-xenia-sand-100",
                      )}
                    >
                      <span className="truncate">{acc.name}</span>
                      {selectedAccountId === acc.id && (
                        <CheckmarkCircle02Icon size={14} className="text-xenia-moss-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Global Search Button */}
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search"
              title="Search (⌘K)"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-xenia-border bg-white/80 text-xenia-stone-600 shadow-2xs transition-colors hover:border-xenia-moss-600 hover:bg-white active:scale-95 cursor-pointer"
            >
              <Search01Icon size={15} strokeWidth={2} />
            </button>

            {/* Menu Drawer Toggle */}
            <button
              type="button"
              onClick={onOpenDrawer}
              aria-label="Open menu"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-xenia-border bg-white/80 text-xenia-stone-600 shadow-2xs transition-colors hover:border-xenia-moss-600 hover:bg-white active:scale-95 cursor-pointer"
            >
              <Menu01Icon size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearch open={searchOpen} onClose={closeSearch} />
    </>
  );
}
