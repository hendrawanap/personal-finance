"use client";

import React, { useState } from "react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Invoice01Icon,
  UserIcon,
} from "hugeicons-react";
import toast from "react-hot-toast";

import { Buttons } from "@/components/atoms/buttons";
import { useCurrency } from "@/lib/currency";
import { useFinanceStore } from "@/store/useFinanceStore";
import { generateParticipantReminder } from "@/lib/splitBillCalculations";
import { ParticipantSummary } from "@/types/finance";

interface ParticipantDebtCardProps {
  participant: ParticipantSummary;
  onViewLedger: (participant: ParticipantSummary) => void;
  onFilterBills?: (participantName: string) => void;
}

export function ParticipantDebtCard({
  participant,
  onViewLedger,
  onFilterBills,
}: ParticipantDebtCardProps) {
  const { format } = useCurrency();
  const profile = useFinanceStore((s) => s.profile);
  const accounts = useFinanceStore((s) => s.accounts);
  const settleAllForParticipant = useFinanceStore(
    (s) => s.settleAllForParticipant,
  );

  const [expanded, setExpanded] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  // Initials for avatar
  const initials = participant.name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleCopyReminder = async () => {
    const text = generateParticipantReminder(participant, format, profile);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success(`Copied reminder for ${participant.name}`);
    } catch {
      toast.error("Failed to copy reminder");
    }
  };

  const handleSettleAll = () => {
    setIsSettling(true);
    try {
      // Pick default account if user wants reimbursement recorded
      const defaultAccount = accounts[0];
      settleAllForParticipant(
        participant.name,
        true,
        defaultAccount ? { accountId: defaultAccount.id } : undefined,
      );
      toast.success(`Settled all shares with ${participant.name}`);
    } catch {
      toast.error("Failed to settle shares");
    } finally {
      setIsSettling(false);
    }
  };

  const isOwed = participant.status === "owes_you";
  const isOwes = participant.status === "you_owe";
  const isSettled = participant.status === "settled";

  return (
    <div className="flex flex-col justify-between rounded-xl border border-xenia-border bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="space-y-4">
        {/* ── Header: Avatar, Name & Net Balance Status ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${
                isOwed
                  ? "bg-xenia-moss-600/10 text-xenia-moss-600"
                  : isOwes
                  ? "bg-xenia-danger-soft text-xenia-danger"
                  : "bg-xenia-sand-100 text-xenia-stone-600"
              }`}
            >
              {initials || <UserIcon size={18} />}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-semibold text-xenia-ink-900">
                {participant.name}
              </h3>
              {participant.email ? (
                <p className="truncate text-xs text-xenia-stone-500">
                  {participant.email}
                </p>
              ) : (
                <p className="text-xs text-xenia-stone-400">
                  {participant.billsCount} shared bill
                  {participant.billsCount === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0 text-right">
            {isOwed && (
              <div className="inline-flex flex-col items-end">
                <span className="rounded-full bg-xenia-moss-600/10 px-2.5 py-0.5 text-xs font-semibold text-xenia-moss-600 border border-xenia-moss-600/20 font-mono">
                  +{format(participant.netBalance)}
                </span>
                <span className="mt-0.5 text-[10px] font-medium text-xenia-moss-600">
                  Owes you
                </span>
              </div>
            )}
            {isOwes && (
              <div className="inline-flex flex-col items-end">
                <span className="rounded-full bg-xenia-danger-soft px-2.5 py-0.5 text-xs font-semibold text-xenia-danger border border-xenia-danger/20 font-mono">
                  -{format(Math.abs(participant.netBalance))}
                </span>
                <span className="mt-0.5 text-[10px] font-medium text-xenia-danger">
                  You owe
                </span>
              </div>
            )}
            {isSettled && (
              <div className="inline-flex flex-col items-end">
                <span className="rounded-full bg-xenia-sand-100 px-2.5 py-0.5 text-xs font-medium text-xenia-stone-600 border border-xenia-border">
                  Settled
                </span>
                <span className="mt-0.5 text-[10px] text-xenia-stone-400">
                  No debt
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Metric Snapshot ── */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-xenia-sand-50/70 p-2.5 text-xs">
          <div>
            <span className="flex items-center gap-1 text-[11px] text-xenia-stone-500">
              <ArrowUp01Icon size={12} className="text-xenia-moss-600" />
              Owed to you
            </span>
            <p className="mt-0.5 font-mono font-semibold text-xenia-ink-900">
              {format(participant.owedToYou)}
            </p>
          </div>
          <div>
            <span className="flex items-center gap-1 text-[11px] text-xenia-stone-500">
              <ArrowDown01Icon size={12} className="text-xenia-danger" />
              You owe
            </span>
            <p className="mt-0.5 font-mono font-semibold text-xenia-ink-900">
              {format(participant.youOweThem)}
            </p>
          </div>
        </div>

        {/* ── Contributing Bills Preview / Toggle ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-xenia-stone-500">
              Active Bills ({participant.bills.length})
            </span>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-medium text-xenia-moss-700 hover:text-xenia-moss-800 transition-colors cursor-pointer"
            >
              {expanded ? "Hide Bills" : "Show Breakdown"}
            </button>
          </div>

          {expanded && (
            <div className="divide-y divide-xenia-divider rounded-lg border border-xenia-border bg-white text-xs max-h-48 overflow-y-auto">
              {participant.bills.map((b) => {
                const isPaid = b.status === "paid";
                return (
                  <div
                    key={b.billId}
                    className="flex items-center justify-between p-2.5 hover:bg-xenia-sand-50/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate font-medium text-xenia-ink-900">
                        {b.billTitle}
                      </p>
                      <p className="text-[10px] text-xenia-stone-400">
                        {b.date} · {b.paidByCurrentUser ? "You paid" : `${b.paidBy} paid`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono text-xs font-semibold ${
                          b.direction === "they_owe_you"
                            ? isPaid
                              ? "text-xenia-stone-400 line-through"
                              : "text-xenia-moss-600"
                            : b.direction === "you_owe_them"
                            ? isPaid
                              ? "text-xenia-stone-400 line-through"
                              : "text-xenia-danger"
                            : "text-xenia-stone-500"
                        }`}
                      >
                        {b.direction === "they_owe_you"
                          ? `+${format(b.shareAmount)}`
                          : b.direction === "you_owe_them"
                          ? `-${format(b.shareAmount)}`
                          : format(b.shareAmount)}
                      </span>
                      <p className="text-[10px] text-xenia-stone-400">
                        {isPaid ? "Paid ✓" : "Pending"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Action Footer ── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-xenia-divider pt-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onViewLedger(participant)}
            className="flex items-center gap-1 text-xs font-medium text-xenia-stone-600 hover:text-xenia-ink-900 hover:bg-xenia-sand-100 rounded-md px-2 py-1 transition-colors cursor-pointer"
            title="View complete ledger history"
          >
            <Invoice01Icon size={14} />
            <span>Ledger</span>
          </button>

          {onFilterBills && (
            <button
              type="button"
              onClick={() => onFilterBills(participant.name)}
              className="text-xs font-medium text-xenia-stone-500 hover:text-xenia-ink-900 hover:bg-xenia-sand-100 rounded-md px-2 py-1 transition-colors cursor-pointer"
              title="Filter bills table for this person"
            >
              Filter Bills
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOwed && (
            <>
              <Buttons
                style="second"
                size="sm"
                icon={<Copy01Icon size={14} />}
                onClick={handleCopyReminder}
                title="Copy formatted WhatsApp/SMS reminder"
              >
                Remind
              </Buttons>
              <Buttons
                style="main"
                size="sm"
                icon={<CheckmarkCircle02Icon size={14} />}
                onClick={handleSettleAll}
                loading={isSettling}
                title="Mark all pending shares as settled"
              >
                Settle All
              </Buttons>
            </>
          )}

          {isOwes && (
            <Buttons
              style="main"
              size="sm"
              icon={<CheckmarkCircle02Icon size={14} />}
              onClick={handleSettleAll}
              loading={isSettling}
              title="Mark share paid to friend"
            >
              Mark Settled
            </Buttons>
          )}

          {isSettled && (
            <span className="text-xs text-xenia-stone-400 font-medium py-1">
              All Even ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
