"use client";

import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckmarkCircle02Icon,
  Copy01Icon,
  Delete02Icon,
  Edit01Icon,
  QrCodeIcon,
  UserIcon,
} from "hugeicons-react";

import { DialogShell } from "@/components/molecules/dashboard/unit/dialogShell";
import { Buttons } from "@/components/atoms/buttons";
import { StatusBadge } from "@/components/atoms/statusBadge";
import { NativeSelect } from "@/components/molecules/inputs/form";
import { useFinanceStore } from "@/store/useFinanceStore";
import { SplitBill, SplitParticipant } from "@/types/finance";
import { useCurrency } from "@/lib/currency";

interface SplitBillDetailModalProps {
  open: boolean;
  onClose: () => void;
  bill: SplitBill | null;
  onEdit: (bill: SplitBill) => void;
  onDelete: (billId: string) => void;
}

export function SplitBillDetailModal({
  open,
  onClose,
  bill,
  onEdit,
  onDelete,
}: SplitBillDetailModalProps) {
  const { format } = useCurrency();
  const accounts = useFinanceStore((s) => s.accounts);
  const profile = useFinanceStore((s) => s.profile);
  const friends = useFinanceStore((s) => s.friends);
  const settleParticipant = useFinanceStore((s) => s.settleParticipant);

  // QR Code view toggle
  const [showQrCode, setShowQrCode] = useState(false);
  const [reimbursementAccountId, setReimbursementAccountId] = useState(
    accounts[0]?.id || "",
  );
  const [autoRecordReimbursement, setAutoRecordReimbursement] = useState(false);

  // Sync bill from store if it changed
  const allBills = useFinanceStore((s) => s.splitBills);
  const currentBill = useMemo(() => {
    if (!bill) return null;
    return allBills.find((b) => b.id === bill.id) ?? bill;
  }, [allBills, bill]);

  if (!currentBill) return null;

  // Compute settlement metrics
  const totalAmount = currentBill.totalAmount;
  const payer = currentBill.paidBy;
  const isPaidByMe = currentBill.paidByCurrentUser;
  const isOwner = isPaidByMe || !currentBill.userId;

  const totalSettledAmount = currentBill.participants.reduce((sum, p) => {
    return p.status === "paid" ? sum + p.shareAmount : sum;
  }, 0);

  const settlementPercentage =
    totalAmount > 0
      ? Math.min(100, Math.round((totalSettledAmount / totalAmount) * 100))
      : 0;

  // Unpaid participants
  const unpaidCount = currentBill.participants.filter(
    (p) => p.status === "unpaid",
  ).length;

  const handleToggleParticipantStatus = (participant: SplitParticipant) => {
    // If not owner, can only settle own participant share
    if (!isOwner && !participant.isCurrentUser) {
      toast.error("You can only update your own settlement status");
      return;
    }

    const isNowPaid = participant.status !== "paid";
    settleParticipant(
      currentBill.id,
      participant.id,
      isNowPaid,
      isNowPaid && autoRecordReimbursement && isPaidByMe && reimbursementAccountId
        ? { accountId: reimbursementAccountId }
        : undefined,
    );

    if (isNowPaid) {
      if (autoRecordReimbursement && isPaidByMe && reimbursementAccountId) {
        toast.success(
          `Marked ${participant.name} as paid & recorded reimbursement in account`,
        );
      } else {
        toast.success(`Marked ${participant.name} as paid`);
      }
    } else {
      toast.success(`Marked ${participant.name} as unpaid`);
    }
  };

  const handleCopySummary = async () => {
    const lines = [
      `🧾 Split Bill: ${currentBill.title}`,
      `📅 Date: ${currentBill.date}`,
      `💰 Total: ${format(currentBill.totalAmount)} (Paid by ${currentBill.paidBy})`,
      `🏷️ Category: ${currentBill.category}`,
      "",
      "👥 Breakdown:",
      ...currentBill.participants.map((p) => {
        const statusEmoji = p.status === "paid" ? "✅ Paid" : "⏳ Pending";
        return `• ${p.name}: ${format(p.shareAmount)} (${statusEmoji})`;
      }),
    ];

    if (currentBill.notes) {
      lines.push("", `📝 Note: ${currentBill.notes}`);
    }

    if (profile.email) {
      lines.push("", `💳 Payment recipient: ${profile.name} (${profile.email})`);
    }

    const textToCopy = lines.join("\n");

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success("Summary copied to clipboard!");
    } catch {
      toast.error("Failed to copy summary");
    }
  };

  const qrPaymentPayload = `finance-split://${currentBill.id}?title=${encodeURIComponent(currentBill.title)}&total=${currentBill.totalAmount}&recipient=${encodeURIComponent(currentBill.paidBy)}`;

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={currentBill.title}
      description={`${currentBill.category} · ${currentBill.date} · Split Method: ${currentBill.splitMethod.toUpperCase()}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* ── Top Hero Card ── */}
        <div className="rounded-2xl border border-xenia-border bg-xenia-sand-50 p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-medium tracking-wide uppercase text-xenia-stone-500">
                Total Bill
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-3xl font-semibold tracking-tight text-xenia-ink-900">
                  {format(currentBill.totalAmount)}
                </span>
                <span className="text-xs text-xenia-stone-500">
                  Paid by{" "}
                  <strong className="font-medium text-xenia-ink-900">
                    {isPaidByMe ? "You" : payer}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={currentBill.status} size="md" />
              <button
                type="button"
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-xenia-border bg-white text-xs font-medium text-xenia-stone-700 hover:text-xenia-ink-900 hover:border-xenia-moss-600 transition-colors shadow-xs"
                title="Copy formatted text to share on chat"
              >
                <Copy01Icon size={14} />
                <span>Copy Summary</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQrCode((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shadow-xs ${
                  showQrCode
                    ? "bg-xenia-moss-600 text-white border-xenia-moss-600"
                    : "bg-white text-xenia-stone-700 border-xenia-border hover:border-xenia-moss-600"
                }`}
                title="View payment QR"
              >
                <QrCodeIcon size={14} />
                <span>QR Code</span>
              </button>
            </div>
          </div>

          {/* Settlement Progress */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-xenia-stone-500">
                Settled:{" "}
                <strong className="font-mono font-medium text-xenia-ink-900">
                  {format(totalSettledAmount)}
                </strong>{" "}
                of {format(totalAmount)} ({settlementPercentage}%)
              </span>
              <span className="text-xenia-stone-500">
                {unpaidCount === 0 ? (
                  <span className="text-xenia-moss-600 font-medium">
                    All participants settled ✓
                  </span>
                ) : (
                  <span>{unpaidCount} participant(s) pending</span>
                )}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-xenia-sand-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  currentBill.status === "settled"
                    ? "bg-xenia-moss-600"
                    : "bg-xenia-brass-500"
                }`}
                style={{ width: `${settlementPercentage}%` }}
              />
            </div>
          </div>

          {/* QR Code Section (Collapsible) */}
          {showQrCode && (
            <div className="mt-4 pt-4 border-t border-xenia-divider flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl">
              <div className="p-2 bg-white rounded-lg border border-xenia-border shadow-xs shrink-0">
                <QRCodeSVG
                  value={qrPaymentPayload}
                  size={120}
                  bgColor="#ffffff"
                  fgColor="#142219"
                  level="M"
                />
              </div>
              <div className="text-center sm:text-left space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-xenia-moss-700">
                  Payment QR Reference
                </p>
                <p className="text-sm font-medium text-xenia-ink-900">
                  Scan to reference bill: {currentBill.title}
                </p>
                <p className="text-xs text-xenia-stone-500">
                  Recipient: {currentBill.paidBy} ({profile.email || "Primary Account"})
                </p>
                <p className="text-[11px] text-xenia-stone-400">
                  Share this QR code with participants for quick settlement.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Auto Reimbursement Option (when user paid) ── */}
        {isPaidByMe && accounts.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border border-xenia-divider bg-white">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoReimbursement"
                checked={autoRecordReimbursement}
                onChange={(e) => setAutoRecordReimbursement(e.target.checked)}
                className="h-4 w-4 rounded text-xenia-moss-600 focus:ring-xenia-moss-600 border-xenia-border"
              />
              <label
                htmlFor="autoReimbursement"
                className="text-xs font-medium text-xenia-ink-900 cursor-pointer"
              >
                Automatically record income in account when marking a friend as paid
              </label>
            </div>

            {autoRecordReimbursement && (
              <div className="w-full sm:w-56">
                <NativeSelect
                  value={reimbursementAccountId}
                  onChange={(e) => setReimbursementAccountId(e.target.value)}
                  className="text-xs"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({format(acc.balance)})
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
          </div>
        )}

        {/* ── Participant Breakdown List ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-medium text-xenia-ink-900">
              Participants & Settlement
            </h3>
            <span className="text-xs text-xenia-stone-500">
              Click &quot;Mark Paid&quot; to update status
            </span>
          </div>

          <div className="divide-y divide-xenia-divider rounded-xl border border-xenia-border bg-white overflow-hidden">
            {currentBill.participants.map((p) => {
              const isPayer = isPaidByMe ? p.isCurrentUser : p.name === payer;
              const isPaid = p.status === "paid";
              const isFriend = friends.some(
                (f) =>
                  (p.userId && f.userId === p.userId) ||
                  (p.email && f.email.toLowerCase() === p.email.toLowerCase()) ||
                  f.name.toLowerCase() === p.name.toLowerCase(),
              );

              return (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3.5 hover:bg-xenia-sand-50/50 transition-colors"
                >
                  {/* Top section on mobile / Left + Middle on desktop */}
                  <div className="flex items-center justify-between gap-3 min-w-0 flex-1">
                    {/* Name & Role */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${
                          isPaid
                            ? "bg-xenia-moss-600/10 text-xenia-moss-600"
                            : "bg-xenia-sand-100 text-xenia-stone-600"
                        }`}
                      >
                        <UserIcon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-xenia-ink-900 truncate">
                            {p.name}
                          </span>
                          {p.isCurrentUser && (
                            <span className="rounded bg-xenia-sand-100 px-1.5 py-0.2 text-[10px] font-medium text-xenia-stone-600">
                              You
                            </span>
                          )}
                          {isPayer && (
                            <span className="rounded bg-xenia-brass-500/15 px-1.5 py-0.2 text-[10px] font-medium text-xenia-brass-600">
                              Payer
                            </span>
                          )}
                          {isFriend && !p.isCurrentUser && !isPayer && (
                            <span className="rounded bg-xenia-moss-50 px-1.5 py-0.2 text-[10px] font-medium text-xenia-moss-700">
                              Friend
                            </span>
                          )}
                        </div>
                        {p.email && (
                          <p className="text-[11px] text-xenia-stone-400 truncate">
                            {p.email}
                          </p>
                        )}
                        {p.settledAt && isPaid && (
                          <p className="text-[10px] text-xenia-moss-600">
                            Settled on {new Date(p.settledAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Share Amount */}
                    <div className="text-right shrink-0">
                      <span className="font-mono text-sm font-semibold text-xenia-ink-900">
                        {format(p.shareAmount)}
                      </span>
                      <p className="text-[10px] text-xenia-stone-400">
                        {isPayer
                          ? "Their portion"
                          : isPaidByMe
                          ? "Owes you"
                          : p.isCurrentUser
                          ? "You owe"
                          : "Owed to payer"}
                      </p>
                    </div>
                  </div>

                  {/* Bottom section on mobile / Right section on desktop: Status Badge & Action Toggle */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-xenia-divider/60 sm:border-0">
                    <StatusBadge status={p.status} size="sm" />
                    {!isPayer && (isOwner || p.isCurrentUser) && (
                      <button
                        type="button"
                        onClick={() => handleToggleParticipantStatus(p)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                          isPaid
                            ? "bg-white text-xenia-stone-600 border-xenia-border hover:bg-xenia-sand-50"
                            : "bg-xenia-moss-600 text-white border-xenia-moss-600 hover:bg-xenia-moss-700"
                        }`}
                      >
                        <CheckmarkCircle02Icon size={14} />
                        <span>{isPaid ? "Mark Unpaid" : p.isCurrentUser ? "Mark My Share Paid" : "Mark Paid"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Itemized Line Items (if itemized) ── */}
        {currentBill.splitMethod === "itemized" &&
          currentBill.items &&
          currentBill.items.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-display text-base font-medium text-xenia-ink-900">
                Itemized Receipt
              </h3>
              <div className="divide-y divide-xenia-divider rounded-xl border border-xenia-border bg-white overflow-hidden text-xs">
                {currentBill.items.map((it) => {
                  const assignedNames = it.assignedTo
                    .map(
                      (id) =>
                        currentBill.participants.find((p) => p.id === id)?.name ??
                        id,
                    )
                    .join(", ");
                  return (
                    <div
                      key={it.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div>
                        <p className="font-medium text-xenia-ink-900">{it.name}</p>
                        <p className="text-[11px] text-xenia-stone-500">
                          Shared by: {assignedNames || "None"}
                        </p>
                      </div>
                      <span className="font-mono font-medium text-xenia-ink-900">
                        {format(it.amount)}
                      </span>
                    </div>
                  );
                })}
                {(currentBill.tax || currentBill.tip) && (
                  <div className="p-3 bg-xenia-sand-50 space-y-1">
                    {currentBill.tax ? (
                      <div className="flex justify-between text-xenia-stone-600">
                        <span>Tax:</span>
                        <span className="font-mono">{format(currentBill.tax)}</span>
                      </div>
                    ) : null}
                    {currentBill.tip ? (
                      <div className="flex justify-between text-xenia-stone-600">
                        <span>Tip / Service:</span>
                        <span className="font-mono">{format(currentBill.tip)}</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}

        {/* ── Notes ── */}
        {currentBill.notes && (
          <div className="rounded-xl border border-xenia-border bg-white p-4 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-xenia-stone-500">
              Notes
            </span>
            <p className="text-xs text-xenia-ink-900 leading-relaxed">
              {currentBill.notes}
            </p>
          </div>
        )}

        {/* ── Modal Footer ── */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-xenia-divider">
          {isOwner ? (
            <button
              type="button"
              onClick={() => {
                onDelete(currentBill.id);
              }}
              className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-xenia-danger hover:underline cursor-pointer py-1"
            >
              <Delete02Icon size={14} />
              <span>Delete Bill</span>
            </button>
          ) : (
            <div className="text-xs text-xenia-stone-500 py-1">
              Shared bill fronted by <span className="font-medium text-xenia-ink-900">{currentBill.paidBy}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isOwner && (
              <Buttons
                style="second"
                icon={<Edit01Icon size={14} />}
                onClick={() => onEdit(currentBill)}
                className="flex-1 sm:flex-initial justify-center"
              >
                Edit Bill
              </Buttons>
            )}
            <Buttons
              style="main"
              onClick={onClose}
              className="flex-1 sm:flex-initial justify-center"
            >
              Close
            </Buttons>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
