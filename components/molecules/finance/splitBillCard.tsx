"use client";

import React from "react";
import {
  ArrowRight01Icon,
  Car01Icon,
  Coffee01Icon,
  Delete02Icon,
  Edit01Icon,
  Home01Icon,
  ReceiptDollarIcon,
  Restaurant01Icon,
  ShoppingBag01Icon,
  Ticket01Icon,
  UserGroupIcon,
} from "hugeicons-react";

import { StatusBadge } from "@/components/atoms/statusBadge";
import { useCurrency } from "@/lib/currency";
import { SplitBill } from "@/types/finance";
import { cn } from "@/lib/utils";

interface SplitBillCardProps {
  bill: SplitBill;
  onClick: (bill: SplitBill) => void;
  onEdit?: (bill: SplitBill) => void;
  onDelete?: (billId: string) => void;
}

function CategoryIcon({ category }: { category: string }) {
  const c = category.toLowerCase();
  if (
    c.includes("food") ||
    c.includes("dining") ||
    c.includes("restaurant") ||
    c.includes("lunch") ||
    c.includes("dinner")
  ) {
    return <Restaurant01Icon size={20} strokeWidth={1.8} />;
  }
  if (c.includes("coffee") || c.includes("cafe") || c.includes("drink")) {
    return <Coffee01Icon size={20} strokeWidth={1.8} />;
  }
  if (
    c.includes("travel") ||
    c.includes("transport") ||
    c.includes("flight") ||
    c.includes("car") ||
    c.includes("uber") ||
    c.includes("taxi")
  ) {
    return <Car01Icon size={20} strokeWidth={1.8} />;
  }
  if (c.includes("shop") || c.includes("grocer") || c.includes("market")) {
    return <ShoppingBag01Icon size={20} strokeWidth={1.8} />;
  }
  if (
    c.includes("home") ||
    c.includes("rent") ||
    c.includes("util") ||
    c.includes("housing")
  ) {
    return <Home01Icon size={20} strokeWidth={1.8} />;
  }
  if (
    c.includes("entertain") ||
    c.includes("movie") ||
    c.includes("concert") ||
    c.includes("game")
  ) {
    return <Ticket01Icon size={20} strokeWidth={1.8} />;
  }
  return <ReceiptDollarIcon size={20} strokeWidth={1.8} />;
}

function getCategoryColor(category: string) {
  const c = category.toLowerCase();
  if (c.includes("food") || c.includes("dining") || c.includes("restaurant")) {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  if (c.includes("travel") || c.includes("transport")) {
    return "bg-sky-100 text-sky-800 border-sky-200";
  }
  if (c.includes("shop")) {
    return "bg-purple-100 text-purple-800 border-purple-200";
  }
  if (c.includes("home") || c.includes("rent")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (c.includes("entertain")) {
    return "bg-rose-100 text-rose-800 border-rose-200";
  }
  return "bg-xenia-sand-100 text-xenia-stone-700 border-xenia-border";
}

export function SplitBillCard({
  bill,
  onClick,
  onEdit,
  onDelete,
}: SplitBillCardProps) {
  const { format } = useCurrency();
  const colorClass = getCategoryColor(bill.category);

  // Settlement metrics
  const totalSettledAmount = bill.participants.reduce(
    (sum, p) => (p.status === "paid" ? sum + p.shareAmount : sum),
    0,
  );
  const progressPercent =
    bill.totalAmount > 0
      ? Math.min(100, Math.round((totalSettledAmount / bill.totalAmount) * 100))
      : 0;
  const paidCount = bill.participants.filter((p) => p.status === "paid").length;
  const totalParticipants = bill.participants.length;

  // Personal balance state for current user
  const isPaidByMe = bill.paidByCurrentUser;
  const myParticipant = bill.participants.find((p) => p.isCurrentUser);

  let impactType: "lent" | "borrowed" | "settled" | "none" = "none";
  let impactAmount = 0;

  if (isPaidByMe) {
    // You paid: others owe you their unpaid shares
    const unpaidFromOthers = bill.participants
      .filter((p) => !p.isCurrentUser && p.status === "unpaid")
      .reduce((sum, p) => sum + p.shareAmount, 0);

    if (unpaidFromOthers > 0) {
      impactType = "lent";
      impactAmount = unpaidFromOthers;
    } else {
      impactType = "settled";
    }
  } else if (myParticipant) {
    // Someone else paid: you owe your share if unpaid
    if (myParticipant.status === "unpaid") {
      impactType = "borrowed";
      impactAmount = myParticipant.shareAmount;
    } else {
      impactType = "settled";
    }
  }

  return (
    <div
      onClick={() => onClick(bill)}
      className="group relative flex flex-col justify-between rounded-2xl border border-xenia-border bg-white p-4 shadow-2xs transition-all hover:border-xenia-moss-600/50 hover:shadow-xs active:scale-[0.99] cursor-pointer"
    >
      <div>
        {/* Top Header: Category Icon, Title, Date & Impact Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-transform group-hover:scale-105",
                colorClass,
              )}
            >
              <CategoryIcon category={bill.category} />
            </div>

            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold text-xenia-ink-900 truncate group-hover:text-xenia-moss-700">
                {bill.title}
              </h3>
              <p className="text-xs text-xenia-stone-500 truncate">
                {bill.date} • {bill.category}
              </p>
            </div>
          </div>

          {/* User's Financial Impact */}
          <div className="text-right shrink-0">
            {impactType === "lent" && (
              <div>
                <p className="text-[11px] font-medium text-xenia-moss-600 leading-tight">
                  you lent
                </p>
                <p className="font-mono text-sm font-semibold text-xenia-moss-700">
                  +{format(impactAmount)}
                </p>
              </div>
            )}
            {impactType === "borrowed" && (
              <div>
                <p className="text-[11px] font-medium text-xenia-danger leading-tight">
                  you owe
                </p>
                <p className="font-mono text-sm font-semibold text-xenia-danger">
                  -{format(impactAmount)}
                </p>
              </div>
            )}
            {impactType === "settled" && (
              <span className="inline-flex items-center rounded-full bg-xenia-sand-100 px-2 py-0.5 text-[11px] font-medium text-xenia-stone-600">
                Settled ✓
              </span>
            )}
            {impactType === "none" && (
              <p className="font-mono text-xs font-medium text-xenia-stone-400">
                {format(bill.totalAmount)}
              </p>
            )}
          </div>
        </div>

        {/* Payer and Total Details */}
        <div className="mt-3 flex items-center justify-between text-xs border-t border-xenia-divider/70 pt-2.5">
          <div className="flex items-center gap-1.5 text-xenia-stone-600 truncate">
            <span className="text-xenia-stone-400">Paid by:</span>
            <span className="font-medium text-xenia-ink-900 truncate">
              {isPaidByMe ? "You" : bill.paidBy}
            </span>
          </div>

          <div className="font-mono text-xs text-xenia-stone-500">
            Total:{" "}
            <span className="font-semibold text-xenia-ink-900">
              {format(bill.totalAmount)}
            </span>
          </div>
        </div>

        {/* Participants & Mini Progress */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-xenia-stone-500">
            <div className="flex items-center gap-1 truncate">
              <UserGroupIcon size={13} className="text-xenia-stone-400 shrink-0" />
              <span className="truncate">
                {bill.participants
                  .map((p) => (p.isCurrentUser ? "You" : p.name))
                  .join(", ")}
              </span>
            </div>
            <span className="shrink-0 font-medium font-mono text-xenia-stone-600">
              {paidCount}/{totalParticipants} paid
            </span>
          </div>

          {/* Mini progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-xenia-sand-200">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                bill.status === "settled"
                  ? "bg-xenia-moss-600"
                  : progressPercent > 0
                  ? "bg-xenia-brass-500"
                  : "bg-xenia-stone-400",
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer: Status Badge, Quick Actions, Chevron */}
      <div className="mt-3 flex items-center justify-between border-t border-xenia-divider/70 pt-2.5">
        <StatusBadge status={bill.status} />

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(bill);
              }}
              title="Edit Bill"
              className="rounded-lg p-1 text-xenia-stone-400 hover:bg-xenia-sand-100 hover:text-xenia-ink-900 transition-colors cursor-pointer"
            >
              <Edit01Icon size={14} />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(bill.id);
              }}
              title="Delete Bill"
              className="rounded-lg p-1 text-xenia-stone-400 hover:bg-xenia-danger-soft hover:text-xenia-danger transition-colors cursor-pointer"
            >
              <Delete02Icon size={14} />
            </button>
          )}

          <div className="flex items-center gap-0.5 text-xs font-medium text-xenia-moss-700 pl-1">
            <span>Details</span>
            <ArrowRight01Icon size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
