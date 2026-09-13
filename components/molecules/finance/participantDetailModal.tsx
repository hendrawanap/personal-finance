"use client";

import React, { useState } from "react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  UserIcon,
} from "hugeicons-react";
import toast from "react-hot-toast";

import { DialogShell } from "@/components/molecules/dashboard/unit/dialogShell";
import { Buttons } from "@/components/atoms/buttons";
import { StatusBadge } from "@/components/atoms/statusBadge";
import { useCurrency } from "@/lib/currency";
import { useFinanceStore } from "@/store/useFinanceStore";
import {
  generateParticipantReminder,
  matchesParticipant,
  matchesPayer,
} from "@/lib/splitBillCalculations";
import { ParticipantSummary } from "@/types/finance";

interface ParticipantDetailModalProps {
  open: boolean;
  onClose: () => void;
  participant: ParticipantSummary | null;
}

export function ParticipantDetailModal({
  open,
  onClose,
  participant,
}: ParticipantDetailModalProps) {
  const { format } = useCurrency();
  const profile = useFinanceStore((s) => s.profile);
  const accounts = useFinanceStore((s) => s.accounts);
  const splitBills = useFinanceStore((s) => s.splitBills);
  const settleParticipant = useFinanceStore((s) => s.settleParticipant);
  const settleAllForParticipant = useFinanceStore(
    (s) => s.settleAllForParticipant,
  );

  const [isSettlingAll, setIsSettlingAll] = useState(false);

  if (!participant) return null;

  // Re-fetch current live participant status from splitBills
  const liveUnpaidOwedToYou = splitBills.reduce((sum, b) => {
    if (!b.paidByCurrentUser) return sum;
    const p = b.participants.find((part) => matchesParticipant(part, participant));
    return p && p.status === "unpaid" ? sum + p.shareAmount : sum;
  }, 0);

  const liveUnpaidYouOwe = splitBills.reduce((sum, b) => {
    if (b.paidByCurrentUser) return sum;
    const isPayer = matchesPayer(b, participant);
    if (!isPayer) return sum;
    const myP = b.participants.find((part) => part.isCurrentUser);
    return myP && myP.status === "unpaid" ? sum + myP.shareAmount : sum;
  }, 0);

  const liveNet = liveUnpaidOwedToYou - liveUnpaidYouOwe;

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
    setIsSettlingAll(true);
    try {
      const defaultAccount = accounts[0];
      settleAllForParticipant(
        participant.email || participant.name,
        true,
        defaultAccount ? { accountId: defaultAccount.id } : undefined,
      );
      toast.success(`Settled all shares with ${participant.name}`);
    } catch {
      toast.error("Failed to settle shares");
    } finally {
      setIsSettlingAll(false);
    }
  };

  const handleToggleBillStatus = (billId: string) => {
    const targetBill = splitBills.find((b) => b.id === billId);
    if (!targetBill) return;

    if (targetBill.paidByCurrentUser) {
      // Participant owes user
      const targetP = targetBill.participants.find((p) =>
        matchesParticipant(p, participant),
      );
      if (!targetP) return;

      const nextPaid = targetP.status !== "paid";
      settleParticipant(billId, targetP.id, nextPaid);
      toast.success(
        `Marked ${participant.name} as ${nextPaid ? "paid" : "unpaid"} for ${targetBill.title}`,
      );
    } else {
      // User owes payer
      const myP = targetBill.participants.find((p) => p.isCurrentUser);
      if (!myP) return;

      const nextPaid = myP.status !== "paid";
      settleParticipant(billId, myP.id, nextPaid);
      toast.success(
        `Marked your share as ${nextPaid ? "paid" : "unpaid"} for ${targetBill.title}`,
      );
    }
  };

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={`Shared Ledger: ${participant.name}`}
      description="Detailed historical breakdown of all shared expenses and pending settlements."
      size="lg"
    >
      <div className="space-y-6">
        {/* ── Top Hero Card ── */}
        <div className="rounded-2xl border border-xenia-border bg-xenia-sand-50 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xenia-moss-700 shadow-xs border border-xenia-border font-display text-base font-semibold">
                {initials || <UserIcon size={20} />}
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-xenia-ink-900">
                  {participant.name}
                </h3>
                {participant.email ? (
                  <p className="text-xs text-xenia-stone-500">
                    {participant.email}
                  </p>
                ) : (
                  <p className="text-xs text-xenia-stone-400">
                    Participant in {participant.bills.length} bills
                  </p>
                )}
              </div>
            </div>

            {/* Net Position */}
            <div className="text-right">
              <span className="text-[11px] font-medium tracking-wide uppercase text-xenia-stone-500">
                Net Position
              </span>
              <p
                className={`font-mono text-2xl font-semibold tracking-tight ${
                  liveNet > 0.005
                    ? "text-xenia-moss-600"
                    : liveNet < -0.005
                    ? "text-xenia-danger"
                    : "text-xenia-ink-900"
                }`}
              >
                {liveNet > 0.005
                  ? `+${format(liveNet)}`
                  : liveNet < -0.005
                  ? `-${format(Math.abs(liveNet))}`
                  : format(0)}
              </p>
              <p className="text-[11px] text-xenia-stone-400">
                {liveNet > 0.005
                  ? "They owe you overall"
                  : liveNet < -0.005
                  ? "You owe them overall"
                  : "All settled up ✓"}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-3 border-t border-xenia-divider">
            <div className="rounded-lg bg-white p-3 border border-xenia-divider">
              <span className="flex items-center gap-1 text-[11px] text-xenia-stone-500">
                <ArrowUp01Icon size={13} className="text-xenia-moss-600" />
                They owe you
              </span>
              <p className="mt-0.5 font-mono text-base font-semibold text-xenia-ink-900">
                {format(liveUnpaidOwedToYou)}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 border border-xenia-divider">
              <span className="flex items-center gap-1 text-[11px] text-xenia-stone-500">
                <ArrowDown01Icon size={13} className="text-xenia-danger" />
                You owe them
              </span>
              <p className="mt-0.5 font-mono text-base font-semibold text-xenia-ink-900">
                {format(liveUnpaidYouOwe)}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 border border-xenia-divider">
              <span className="text-[11px] text-xenia-stone-500">
                Total Shared Spent
              </span>
              <p className="mt-0.5 font-mono text-base font-semibold text-xenia-ink-900">
                {format(participant.totalHistoricalSpent)}
              </p>
            </div>
          </div>

          {/* Action Row */}
          {(liveUnpaidOwedToYou > 0 || liveUnpaidYouOwe > 0) && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              {liveUnpaidOwedToYou > 0 && (
                <Buttons
                  style="second"
                  size="sm"
                  icon={<Copy01Icon size={14} />}
                  onClick={handleCopyReminder}
                  className="w-full sm:w-auto justify-center"
                >
                  Copy Reminder
                </Buttons>
              )}
              <Buttons
                style="main"
                size="sm"
                icon={<CheckmarkCircle02Icon size={14} />}
                onClick={handleSettleAll}
                loading={isSettlingAll}
                className="w-full sm:w-auto justify-center"
              >
                {liveUnpaidOwedToYou > 0 ? "Settle All Owed" : "Mark Paid"}
              </Buttons>
            </div>
          )}
        </div>

        {/* ── Complete Ledger Breakdown Table ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-medium text-xenia-ink-900">
              Shared Bills History ({participant.bills.length})
            </h4>
            <span className="text-xs text-xenia-stone-500">
              Click action to toggle settlement
            </span>
          </div>

          <div className="divide-y divide-xenia-divider rounded-xl border border-xenia-border bg-white overflow-hidden text-xs">
            {participant.bills.map((b) => {
              // Get current live status of this bill and participant
              const liveBill = splitBills.find((sb) => sb.id === b.billId);
              const liveP = liveBill?.participants.find((p) =>
                matchesParticipant(p, participant),
              );
              const myP = liveBill?.participants.find((p) => p.isCurrentUser);

              const isUserFronted = liveBill?.paidByCurrentUser;
              const isPayerThisParticipant = liveBill
                ? matchesPayer(liveBill, participant)
                : false;

              const currentStatus = isUserFronted
                ? liveP?.status ?? b.status
                : isPayerThisParticipant
                ? myP?.status ?? b.status
                : b.status;

              const isPaid = currentStatus === "paid";

              return (
                <div
                  key={b.billId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3.5 hover:bg-xenia-sand-50/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xenia-ink-900 text-sm">
                      {b.billTitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-xenia-stone-500">
                      <span>{b.date}</span>
                      <span>·</span>
                      <span>{b.category}</span>
                      <span>·</span>
                      <span className="font-medium text-xenia-ink-800">
                        Paid by {b.paidByCurrentUser ? "You" : b.paidBy}
                      </span>
                    </div>
                  </div>

                  {/* Share Amount & Status */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-xenia-divider/60 sm:border-0">
                    <div className="text-left sm:text-right">
                      <span
                        className={`font-mono text-sm font-semibold ${
                          b.direction === "they_owe_you"
                            ? isPaid
                              ? "text-xenia-stone-400 line-through"
                              : "text-xenia-moss-600"
                            : b.direction === "you_owe_them"
                            ? isPaid
                              ? "text-xenia-stone-400 line-through"
                              : "text-xenia-danger"
                            : "text-xenia-stone-600"
                        }`}
                      >
                        {b.direction === "they_owe_you"
                          ? `+${format(b.shareAmount)}`
                          : b.direction === "you_owe_them"
                          ? `-${format(b.shareAmount)}`
                          : format(b.shareAmount)}
                      </span>
                      <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
                        <StatusBadge status={currentStatus} size="sm" />
                      </div>
                    </div>

                    {/* Toggle Button */}
                    {(b.direction === "they_owe_you" ||
                      b.direction === "you_owe_them") && (
                      <button
                        type="button"
                        onClick={() => handleToggleBillStatus(b.billId)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                          isPaid
                            ? "bg-white text-xenia-stone-600 border-xenia-border hover:bg-xenia-sand-50"
                            : "bg-xenia-moss-600 text-white border-xenia-moss-600 hover:bg-xenia-moss-700"
                        }`}
                      >
                        <CheckmarkCircle02Icon size={14} />
                        <span>{isPaid ? "Mark Unpaid" : "Mark Paid"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
