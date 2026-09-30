"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Add01Icon,
  DashboardSquare01Icon,
  Invoice01Icon,
  Menu01Icon,
  ReceiptDollarIcon,
} from "hugeicons-react";

import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onOpenQuickAction: () => void;
  onOpenDrawer: () => void;
}

export function MobileBottomNav({
  onOpenQuickAction,
  onOpenDrawer,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  const isHome = pathname === "/dashboard";
  const isTransactions = pathname.startsWith("/dashboard/transactions");
  const isSplitBills =
    pathname.startsWith("/dashboard/split-bills") ||
    pathname.startsWith("/dashboard/split-bill");

  return (
    <nav
      aria-label="Mobile Navigation"
      className="shrink-0 sticky bottom-0 z-40 w-full border-t border-xenia-border bg-white/95 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center justify-around">
        {/* 1. Home */}
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors group cursor-pointer",
            isHome ? "text-xenia-moss-700" : "text-xenia-stone-500 hover:text-xenia-ink-900",
          )}
        >
          <div className="relative">
            <DashboardSquare01Icon
              size={20}
              strokeWidth={isHome ? 2.25 : 1.75}
              className={cn("transition-transform group-active:scale-90", isHome && "scale-105")}
            />
          </div>
          <span
            className={cn(
              "mt-1 text-[10px] tracking-tight transition-all",
              isHome ? "font-semibold text-xenia-moss-700" : "font-medium text-xenia-stone-500",
            )}
          >
            Home
          </span>
          {isHome && (
            <span className="mt-0.5 h-1 w-1 rounded-full bg-xenia-moss-600 shadow-[0_0_6px_rgba(79,107,82,0.8)]" />
          )}
        </Link>

        {/* 2. Transactions */}
        <Link
          href="/dashboard/transactions"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors group cursor-pointer",
            isTransactions
              ? "text-xenia-moss-700"
              : "text-xenia-stone-500 hover:text-xenia-ink-900",
          )}
        >
          <div className="relative">
            <Invoice01Icon
              size={20}
              strokeWidth={isTransactions ? 2.25 : 1.75}
              className={cn(
                "transition-transform group-active:scale-90",
                isTransactions && "scale-105",
              )}
            />
          </div>
          <span
            className={cn(
              "mt-1 text-[10px] tracking-tight transition-all",
              isTransactions
                ? "font-semibold text-xenia-moss-700"
                : "font-medium text-xenia-stone-500",
            )}
          >
            Activity
          </span>
          {isTransactions && (
            <span className="mt-0.5 h-1 w-1 rounded-full bg-xenia-moss-600 shadow-[0_0_6px_rgba(79,107,82,0.8)]" />
          )}
        </Link>

        {/* 3. Center Raised (+) FAB */}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={onOpenQuickAction}
            aria-label="Quick Actions"
            className="group relative -mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-xenia-moss-600 text-white shadow-lg shadow-xenia-moss-600/35 ring-4 ring-xenia-canvas transition-all hover:bg-xenia-moss-700 active:scale-90 cursor-pointer"
          >
            <Add01Icon
              size={24}
              strokeWidth={2.5}
              className="transition-transform group-hover:rotate-90 duration-200"
            />
          </button>
        </div>

        {/* 4. Split Bills */}
        <Link
          href="/dashboard/split-bills"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors group cursor-pointer",
            isSplitBills
              ? "text-xenia-moss-700"
              : "text-xenia-stone-500 hover:text-xenia-ink-900",
          )}
        >
          <div className="relative">
            <ReceiptDollarIcon
              size={20}
              strokeWidth={isSplitBills ? 2.25 : 1.75}
              className={cn(
                "transition-transform group-active:scale-90",
                isSplitBills && "scale-105",
              )}
            />
          </div>
          <span
            className={cn(
              "mt-1 text-[10px] tracking-tight transition-all",
              isSplitBills
                ? "font-semibold text-xenia-moss-700"
                : "font-medium text-xenia-stone-500",
            )}
          >
            Split Bills
          </span>
          {isSplitBills && (
            <span className="mt-0.5 h-1 w-1 rounded-full bg-xenia-moss-600 shadow-[0_0_6px_rgba(79,107,82,0.8)]" />
          )}
        </Link>

        {/* 5. More / Menu */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex flex-1 flex-col items-center justify-center py-1 text-xenia-stone-500 hover:text-xenia-ink-900 transition-colors group cursor-pointer"
        >
          <div className="relative">
            <Menu01Icon
              size={20}
              strokeWidth={1.75}
              className="transition-transform group-active:scale-90"
            />
          </div>
          <span className="mt-1 text-[10px] font-medium tracking-tight text-xenia-stone-500">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
}
