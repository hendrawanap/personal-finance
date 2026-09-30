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
      className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-xenia-border bg-white/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.04)] sm:sticky sm:bottom-0 sm:left-auto sm:right-auto sm:pb-2.5"
    >
      <div className="flex items-center justify-around">
        {/* 1. Home */}
        <Link
          href="/dashboard"
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center py-1 transition-colors group cursor-pointer",
            isHome ? "text-xenia-moss-700" : "text-xenia-stone-500 hover:text-xenia-ink-900",
          )}
        >
          {isHome && (
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-xenia-moss-600 shadow-[0_0_6px_rgba(79,107,82,0.8)]" />
          )}
          <div className="relative mt-0.5">
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
        </Link>

        {/* 2. Transactions */}
        <Link
          href="/dashboard/transactions"
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center py-1 transition-colors group cursor-pointer",
            isTransactions
              ? "text-xenia-moss-700"
              : "text-xenia-stone-500 hover:text-xenia-ink-900",
          )}
        >
          {isTransactions && (
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-xenia-moss-600 shadow-[0_0_6px_rgba(79,107,82,0.8)]" />
          )}
          <div className="relative mt-0.5">
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
            "relative flex flex-1 flex-col items-center justify-center py-1 transition-colors group cursor-pointer",
            isSplitBills
              ? "text-xenia-moss-700"
              : "text-xenia-stone-500 hover:text-xenia-ink-900",
          )}
        >
          {isSplitBills && (
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-xenia-moss-600 shadow-[0_0_6px_rgba(79,107,82,0.8)]" />
          )}
          <div className="relative mt-0.5">
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
        </Link>

        {/* 5. More / Menu */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex flex-1 flex-col items-center justify-center py-1 text-xenia-stone-500 hover:text-xenia-ink-900 transition-colors group cursor-pointer"
        >
          <div className="relative mt-0.5">
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
