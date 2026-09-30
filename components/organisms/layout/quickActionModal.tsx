"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Cancel01Icon,
  Coins01Icon,
  Invoice01Icon,
  ReceiptDollarIcon,
  UserAdd01Icon,
} from "hugeicons-react";

interface QuickActionModalProps {
  open: boolean;
  onClose: () => void;
  onOpenSplitBillModal?: () => void;
  onOpenFriendModal?: () => void;
}

export function QuickActionModal({
  open,
  onClose,
  onOpenSplitBillModal,
  onOpenFriendModal,
}: QuickActionModalProps) {
  const router = useRouter();

  if (!open) return null;

  const actions = [
    {
      title: "Split a Bill",
      description: "Divide an expense among friends & track balances",
      icon: ReceiptDollarIcon,
      color: "bg-xenia-moss-600 text-white",
      onClick: () => {
        onClose();
        if (onOpenSplitBillModal) {
          onOpenSplitBillModal();
        } else {
          router.push("/dashboard/split-bills?tab=bills");
        }
      },
    },
    {
      title: "New Transaction",
      description: "Log income or expense into your accounts",
      icon: Invoice01Icon,
      color: "bg-xenia-brass-500 text-white",
      onClick: () => {
        onClose();
        router.push("/dashboard/transactions");
      },
    },
    {
      title: "Add Budget",
      description: "Set a spending limit for a category",
      icon: Coins01Icon,
      color: "bg-xenia-forest-900 text-white",
      onClick: () => {
        onClose();
        router.push("/dashboard/budgets");
      },
    },
    {
      title: "Add Friend",
      description: "Connect with a friend to share future bills",
      icon: UserAdd01Icon,
      color: "bg-xenia-stone-700 text-white",
      onClick: () => {
        onClose();
        if (onOpenFriendModal) {
          onOpenFriendModal();
        } else {
          router.push("/dashboard/split-bills?tab=friends");
        }
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-xenia-forest-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet */}
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-xenia-border bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Mobile drag handle */}
        <div className="mx-auto -mt-1 mb-3 h-1 w-10 rounded-full bg-xenia-border sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-xenia-divider">
          <div>
            <h3 className="font-display text-lg font-semibold text-xenia-ink-900">
              Quick Actions
            </h3>
            <p className="text-xs text-xenia-stone-500">
              What would you like to create?
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xenia-stone-500 hover:bg-xenia-sand-100 hover:text-xenia-ink-900 transition-colors cursor-pointer"
          >
            <Cancel01Icon size={18} />
          </button>
        </div>

        {/* Action list */}
        <div className="mt-4 grid grid-cols-1 gap-2.5">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.title}
                type="button"
                onClick={act.onClick}
                className="group flex w-full items-center gap-3.5 rounded-2xl border border-xenia-border bg-xenia-canvas/40 p-3 text-left transition-all hover:bg-xenia-sand-100/70 hover:border-xenia-moss-600/40 active:scale-[0.99] cursor-pointer"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105 ${act.color}`}
                >
                  <Icon size={20} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-xenia-ink-900 group-hover:text-xenia-moss-700">
                    {act.title}
                  </p>
                  <p className="truncate text-xs text-xenia-stone-500">
                    {act.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
