"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { useQueryStates } from "nuqs";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  Coins01Icon,
  Delete02Icon,
  Download01Icon,
  Edit01Icon,
  Invoice01Icon,
  ReceiptDollarIcon,
  Search01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  UserIcon,
} from "hugeicons-react";
import toast from "react-hot-toast";

import {
  searchParser,
  enumParser,
  pageParser,
  tabEnumParser,
  sortParser,
} from "@/lib/urlState";
import { PageShell } from "@/components/molecules/dashboard/pageShell";
import { SearchBars } from "@/components/atoms/searchBar";
import { Buttons } from "@/components/atoms/buttons";
import { Pagination } from "@/components/molecules/dashboard/unit/pagination";
import { useFinanceStore, useFinanceHydrated } from "@/store/useFinanceStore";
import { SplitBillModal } from "@/components/molecules/finance/splitBillModal";
import { SplitBillDetailModal } from "@/components/molecules/finance/splitBillDetailModal";
import { ParticipantDebtCard } from "@/components/molecules/finance/participantDebtCard";
import { ParticipantDetailModal } from "@/components/molecules/finance/participantDetailModal";
import { FriendModal } from "@/components/molecules/finance/friendModal";
import { SplitBillCard } from "@/components/molecules/finance/splitBillCard";
import ConfirmDialog from "@/components/molecules/dashboard/unit/confirmDialog";
import { exportExcel } from "@/lib/exportExcel";
import { SplitBill, ParticipantSummary, Friend } from "@/types/finance";
import { useCurrency } from "@/lib/currency";
import { computeParticipantSummaries, matchesParticipant } from "@/lib/splitBillCalculations";
import { cn } from "@/lib/utils";

const splitBillFilterParsers = {
  tab: tabEnumParser(["bills", "participants", "friends"] as const, "bills"),
  q: searchParser,
  status: enumParser(["all", "pending", "partial", "settled"] as const, "all"),
  role: enumParser(["all", "owed_to_you", "you_owe"] as const, "all"),
  debtStatus: enumParser(["all", "owes_you", "you_owe", "settled"] as const, "all"),
  sort: sortParser,
  page: pageParser,
};

const PAGE_SIZE = 8;

function SplitBillsContent() {
  const [filters, setFilters] = useQueryStates(splitBillFilterParsers, {
    history: "replace",
  });

  const hydrated = useFinanceHydrated();
  const { format, symbol } = useCurrency();
  const splitBills = useFinanceStore((s) => s.splitBills);
  const friends = useFinanceStore((s) => s.friends);
  const deleteFriend = useFinanceStore((s) => s.deleteFriend);
  const profile = useFinanceStore((s) => s.profile);
  const deleteSplitBill = useFinanceStore((s) => s.deleteSplitBill);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<SplitBill | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBillForDetail, setSelectedBillForDetail] = useState<SplitBill | null>(null);
  const [selectedParticipantForLedger, setSelectedParticipantForLedger] =
    useState<ParticipantSummary | null>(null);
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [friendModalOpen, setFriendModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingFriendId, setDeletingFriendId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // ── Metrics Calculation ──
  const { totalOwedToYou, totalYouOwe, netBalance, activeBillsCount } = useMemo(() => {
    let owedToYou = 0;
    let youOwe = 0;
    let active = 0;

    for (const bill of splitBills) {
      if (bill.status !== "settled") {
        active++;
      }

      if (bill.paidByCurrentUser) {
        // You fronted the bill: others owe you their unpaid shares
        for (const p of bill.participants) {
          if (!p.isCurrentUser && p.status === "unpaid") {
            owedToYou += p.shareAmount;
          }
        }
      } else {
        // Someone else fronted: if you haven't paid your share, you owe it
        const myParticipant = bill.participants.find((p) => p.isCurrentUser);
        if (myParticipant && myParticipant.status === "unpaid") {
          youOwe += myParticipant.shareAmount;
        }
      }
    }

    return {
      totalOwedToYou: Math.round(owedToYou * 100) / 100,
      totalYouOwe: Math.round(youOwe * 100) / 100,
      netBalance: Math.round((owedToYou - youOwe) * 100) / 100,
      activeBillsCount: active,
    };
  }, [splitBills]);

  // ── Participant Summaries Calculation ──
  const participantSummaries = useMemo(() => {
    return computeParticipantSummaries(splitBills, profile.name, profile.email);
  }, [splitBills, profile.name, profile.email]);

  const { debtors, creditors, debtorsCount, creditorsCount, settledCount } =
    useMemo(() => {
      const d: ParticipantSummary[] = [];
      const c: ParticipantSummary[] = [];
      let s = 0;

      for (const p of participantSummaries) {
        if (p.status === "owes_you") d.push(p);
        else if (p.status === "you_owe") c.push(p);
        else s++;
      }

      return {
        debtors: d,
        creditors: c,
        debtorsCount: d.length,
        creditorsCount: c.length,
        settledCount: s,
      };
    }, [participantSummaries]);

  // ── Filtered Participants ──
  const filteredParticipants = useMemo(() => {
    return participantSummaries.filter((p) => {
      if (filters.q) {
        const query = filters.q.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchEmail = Boolean(p.email && p.email.toLowerCase().includes(query));
        if (!matchName && !matchEmail) return false;
      }

      if (filters.debtStatus !== "all" && p.status !== filters.debtStatus) {
        return false;
      }

      return true;
    });
  }, [participantSummaries, filters.q, filters.debtStatus]);

  // ── Filtered Split Bills ──
  const filteredBills = useMemo(() => {
    return splitBills.filter((bill) => {
      // Search
      if (filters.q) {
        const query = filters.q.toLowerCase();
        const matchesTitle = bill.title.toLowerCase().includes(query);
        const matchesCategory = bill.category.toLowerCase().includes(query);
        const matchesParticipants = bill.participants.some((p) =>
          p.name.toLowerCase().includes(query),
        );
        const matchesPayer = bill.paidBy.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCategory && !matchesParticipants && !matchesPayer) {
          return false;
        }
      }

      // Status
      if (filters.status !== "all" && bill.status !== filters.status) {
        return false;
      }

      // Role
      if (filters.role === "owed_to_you") {
        const hasUnpaidDebtors =
          bill.paidByCurrentUser &&
          bill.participants.some((p) => !p.isCurrentUser && p.status === "unpaid");
        if (!hasUnpaidDebtors) return false;
      } else if (filters.role === "you_owe") {
        const iOweUnpaid =
          !bill.paidByCurrentUser &&
          bill.participants.some((p) => p.isCurrentUser && p.status === "unpaid");
        if (!iOweUnpaid) return false;
      }

      return true;
    });
  }, [splitBills, filters]);

  // ── Filtered Friends ──
  const filteredFriends = useMemo(() => {
    return friends.filter((f) => {
      if (filters.q) {
        const query = filters.q.toLowerCase();
        const matchName = f.name.toLowerCase().includes(query);
        const matchEmail = Boolean(f.email && f.email.toLowerCase().includes(query));
        return matchName || matchEmail;
      }
      return true;
    });
  }, [friends, filters.q]);

  // ── Paginated slices ──
  const currentPage = filters.page || 1;
  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBills.slice(start, start + PAGE_SIZE);
  }, [filteredBills, currentPage]);

  const paginatedParticipants = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredParticipants.slice(start, start + PAGE_SIZE);
  }, [filteredParticipants, currentPage]);

  const paginatedFriends = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredFriends.slice(start, start + PAGE_SIZE);
  }, [filteredFriends, currentPage]);

  // ── Actions ──
  const handleOpenAdd = () => {
    setEditingBill(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (bill: SplitBill) => {
    setEditingBill(bill);
    setDetailModalOpen(false);
    setModalOpen(true);
  };

  const handleOpenDetail = (bill: SplitBill) => {
    setSelectedBillForDetail(bill);
    setDetailModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      deleteSplitBill(deletingId);
      toast.success("Split bill deleted successfully");
      setDeletingId(null);
      setDetailModalOpen(false);
    }
  };

  const handleConfirmDeleteFriend = () => {
    if (deletingFriendId) {
      deleteFriend(deletingFriendId);
      toast.success("Friend removed successfully");
      setDeletingFriendId(null);
    }
  };

  const handleExport = async () => {
    if (filters.tab === "participants") {
      if (filteredParticipants.length === 0) {
        toast.error("No participant balances to export");
        return;
      }
      setIsExporting(true);
      try {
        await exportExcel<ParticipantSummary>({
          fileName: `participant_balances_${new Date().toISOString().split("T")[0]}`,
          sheetName: "Participant Balances",
          columns: [
            { header: "Participant", key: "name", width: 22, value: (r) => r.name },
            { header: "Email", key: "email", width: 26, value: (r) => r.email || "—" },
            {
              header: "Status",
              key: "status",
              width: 14,
              value: (r) =>
                r.status === "owes_you"
                  ? "Owes You"
                  : r.status === "you_owe"
                  ? "You Owe"
                  : "Settled",
            },
            {
              header: `Owed to You (${symbol})`,
              key: "owedToYou",
              width: 18,
              numberFormat: `${symbol}#,##0.00`,
              value: (r) => r.owedToYou,
            },
            {
              header: `You Owe Them (${symbol})`,
              key: "youOweThem",
              width: 18,
              numberFormat: `${symbol}#,##0.00`,
              value: (r) => r.youOweThem,
            },
            {
              header: `Net Balance (${symbol})`,
              key: "netBalance",
              width: 18,
              numberFormat: `${symbol}#,##0.00`,
              value: (r) => r.netBalance,
            },
            {
              header: "Total Shared Bills",
              key: "billsCount",
              width: 18,
              value: (r) => r.billsCount,
            },
            {
              header: "Unpaid Bills",
              key: "unpaidBillsCount",
              width: 16,
              value: (r) => r.unpaidBillsCount,
            },
          ],
          rows: filteredParticipants,
        });
        toast.success("Exported participant balances to Excel");
      } catch (err) {
        console.error(err);
        toast.error("Failed to export Excel file");
      } finally {
        setIsExporting(false);
      }
      return;
    }

    if (filteredBills.length === 0) {
      toast.error("No split bills to export");
      return;
    }
    setIsExporting(true);
    try {
      await exportExcel<SplitBill>({
        fileName: `split_bills_${new Date().toISOString().split("T")[0]}`,
        sheetName: "Split Bills",
        columns: [
          { header: "Date", key: "date", width: 14, value: (r) => r.date },
          { header: "Title", key: "title", width: 28, value: (r) => r.title },
          { header: "Category", key: "category", width: 22, value: (r) => r.category },
          { header: "Paid By", key: "paidBy", width: 18, value: (r) => r.paidBy },
          {
            header: `Total Amount (${symbol})`,
            key: "totalAmount",
            width: 16,
            numberFormat: `${symbol}#,##0.00`,
            value: (r) => r.totalAmount,
          },
          {
            header: `Your Share (${symbol})`,
            key: "yourShare",
            width: 16,
            numberFormat: `${symbol}#,##0.00`,
            value: (r) =>
              r.participants.find((p) => p.isCurrentUser)?.shareAmount ?? 0,
          },
          {
            header: `Settled Amount (${symbol})`,
            key: "settledAmount",
            width: 18,
            numberFormat: `${symbol}#,##0.00`,
            value: (r) =>
              r.participants.reduce(
                (sum, p) => (p.status === "paid" ? sum + p.shareAmount : sum),
                0,
              ),
          },
          {
            header: "Split Method",
            key: "splitMethod",
            width: 14,
            value: (r) => r.splitMethod.toUpperCase(),
          },
          {
            header: "Status",
            key: "status",
            width: 12,
            value: (r) => r.status.toUpperCase(),
          },
          {
            header: "Participants",
            key: "participants",
            width: 36,
            value: (r) =>
              r.participants
                .map((p) => `${p.name}: ${format(p.shareAmount)} (${p.status})`)
                .join("; "),
          },
        ],
        rows: filteredBills,
      });
      toast.success("Exported split bills to Excel");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Excel file");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <PageShell width="default" spacing="sm">
      {/* ── Mobile Top Title & Actions Row ── */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-xenia-ink-900">
            Split Bills
          </h1>
          <p className="text-xs text-xenia-stone-500">
            Track expenses & balance debts
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            title="Export Excel"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-xenia-border bg-white text-xenia-stone-600 shadow-2xs hover:bg-xenia-sand-100 hover:text-xenia-ink-900 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Download01Icon size={16} />
          </button>

          <button
            type="button"
            onClick={() => setFriendModalOpen(true)}
            title="Add Friend"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-xenia-border bg-white text-xenia-stone-600 shadow-2xs hover:bg-xenia-sand-100 hover:text-xenia-ink-900 transition-colors active:scale-95 cursor-pointer"
          >
            <UserAdd01Icon size={16} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-xl bg-xenia-moss-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-xenia-moss-700 transition-all active:scale-95 cursor-pointer"
          >
            <Add01Icon size={15} strokeWidth={2.5} />
            <span>New Bill</span>
          </button>
        </div>
      </div>

      {/* ── Mobile Net Balance Hero Card ── */}
      <div className="rounded-3xl border border-xenia-border bg-gradient-to-b from-white via-white to-xenia-sand-50/70 p-4.5 shadow-sm space-y-4">
        {/* Top Net Position */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-xenia-stone-500 uppercase">
              Overall Balance
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={cn(
                  "font-display text-2xl sm:text-3xl font-bold tracking-tight tabular-nums",
                  netBalance > 0
                    ? "text-xenia-moss-700"
                    : netBalance < 0
                    ? "text-xenia-danger"
                    : "text-xenia-ink-900",
                )}
              >
                {hydrated
                  ? netBalance > 0
                    ? `+${format(netBalance)}`
                    : netBalance < 0
                    ? `-${format(Math.abs(netBalance))}`
                    : format(0)
                  : format(0)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-xenia-stone-500">
              {netBalance > 0
                ? "People owe you more than you owe"
                : netBalance < 0
                ? "You owe more than you are owed"
                : "All accounts are balanced & settled"}
            </p>
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 shadow-2xs",
              netBalance > 0
                ? "bg-xenia-moss-600/10 text-xenia-moss-700"
                : netBalance < 0
                ? "bg-xenia-danger-soft text-xenia-danger"
                : "bg-xenia-sand-100 text-xenia-stone-600",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                netBalance > 0
                  ? "bg-xenia-moss-600"
                  : netBalance < 0
                  ? "bg-xenia-danger"
                  : "bg-xenia-stone-400",
              )}
            />
            <span>
              {netBalance > 0
                ? "Surplus"
                : netBalance < 0
                ? "Payable"
                : "Settled"}
            </span>
          </div>
        </div>

        {/* Incoming & Outgoing Pill Tiles */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Incoming */}
          <div className="rounded-2xl border border-xenia-border/70 bg-xenia-canvas/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-xenia-moss-600/15 text-xenia-moss-700">
                <ArrowDown01Icon size={12} strokeWidth={2.5} />
              </div>
              <span className="text-[11px] font-medium text-xenia-stone-500">
                Owed to you
              </span>
            </div>
            <p className="font-mono text-base font-bold text-xenia-moss-700 tabular-nums">
              {hydrated ? format(totalOwedToYou) : format(0)}
            </p>
            <p className="text-[10px] text-xenia-stone-400">
              {debtorsCount} {debtorsCount === 1 ? "person" : "people"} pending
            </p>
          </div>

          {/* Outgoing */}
          <div className="rounded-2xl border border-xenia-border/70 bg-xenia-canvas/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-xenia-danger-soft text-xenia-danger">
                <ArrowUp01Icon size={12} strokeWidth={2.5} />
              </div>
              <span className="text-[11px] font-medium text-xenia-stone-500">
                You owe
              </span>
            </div>
            <p className="font-mono text-base font-bold text-xenia-danger tabular-nums">
              {hydrated ? format(totalYouOwe) : format(0)}
            </p>
            <p className="text-[10px] text-xenia-stone-400">
              {creditorsCount} {creditorsCount === 1 ? "person" : "people"} to pay
            </p>
          </div>
        </div>

        {/* Quick Action Strip */}
        <div className="flex items-center gap-2 pt-1 border-t border-xenia-divider">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-xenia-moss-600 px-3 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-xenia-moss-700 transition-colors active:scale-98 cursor-pointer"
          >
            <Add01Icon size={16} strokeWidth={2.5} />
            <span>Split New Bill</span>
          </button>

          <button
            type="button"
            onClick={() => setFriendModalOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-xenia-border bg-white px-3.5 py-2.5 text-xs font-semibold text-xenia-stone-700 shadow-2xs hover:bg-xenia-sand-100 transition-colors active:scale-98 cursor-pointer"
          >
            <UserAdd01Icon size={16} />
            <span>Add Friend</span>
          </button>
        </div>
      </div>

      {/* ── Mobile Segmented Tab Bar ── */}
      <div className="flex items-center rounded-2xl border border-xenia-border bg-xenia-sand-100/90 p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setFilters({ tab: "bills", page: 1 })}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-all cursor-pointer",
            filters.tab === "bills"
              ? "bg-white text-xenia-ink-900 shadow-xs font-semibold"
              : "text-xenia-stone-600 hover:text-xenia-ink-900",
          )}
        >
          <ReceiptDollarIcon size={15} />
          <span>Bills</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-semibold",
              filters.tab === "bills"
                ? "bg-xenia-moss-600 text-white"
                : "bg-xenia-sand-200 text-xenia-stone-600",
            )}
          >
            {splitBills.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilters({ tab: "participants", page: 1 })}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-all cursor-pointer",
            filters.tab === "participants"
              ? "bg-white text-xenia-ink-900 shadow-xs font-semibold"
              : "text-xenia-stone-600 hover:text-xenia-ink-900",
          )}
        >
          <UserIcon size={15} />
          <span>Balances</span>
          {debtorsCount + creditorsCount > 0 && (
            <span className="h-2 w-2 rounded-full bg-xenia-danger" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilters({ tab: "friends", page: 1 })}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-all cursor-pointer",
            filters.tab === "friends"
              ? "bg-white text-xenia-ink-900 shadow-xs font-semibold"
              : "text-xenia-stone-600 hover:text-xenia-ink-900",
          )}
        >
          <UserGroupIcon size={15} />
          <span>Friends</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-semibold",
              filters.tab === "friends"
                ? "bg-xenia-moss-600 text-white"
                : "bg-xenia-sand-200 text-xenia-stone-600",
            )}
          >
            {friends.length}
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════
          TAB 1: ALL BILLS FEED (MOBILE)
      ══════════════════════════════════════════════ */}
      {filters.tab === "bills" && (
        <div className="space-y-3 pt-1">
          {/* Quick Active Debts Ribbon (if any debts exist) */}
          {(debtors.length > 0 || creditors.length > 0) && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {debtors.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedParticipantForLedger(p);
                    setLedgerModalOpen(true);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-xenia-border bg-white px-3 py-1 text-xs font-medium text-xenia-moss-700 shadow-2xs hover:bg-xenia-sand-100 transition-colors cursor-pointer"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-xenia-moss-600" />
                  <span>
                    {p.name} owes {format(p.netBalance)}
                  </span>
                </button>
              ))}

              {creditors.slice(0, 2).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedParticipantForLedger(p);
                    setLedgerModalOpen(true);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-xenia-border bg-white px-3 py-1 text-xs font-medium text-xenia-danger shadow-2xs hover:bg-xenia-sand-100 transition-colors cursor-pointer"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-xenia-danger" />
                  <span>
                    You owe {p.name} {format(Math.abs(p.netBalance))}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Search Bar */}
          <div>
            <SearchBars
              placeholder="Search bills, categories, or friends..."
              value={filters.q}
              onChange={(val) => setFilters({ q: val, page: 1 })}
            />
          </div>

          {/* Mobile Filter Chips (Scrollable) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {/* Status Chips */}
            {[
              { val: "all", label: "All Status" },
              { val: "pending", label: "⏳ Pending" },
              { val: "partial", label: "⚡ Partial" },
              { val: "settled", label: "✓ Settled" },
            ].map((chip) => (
              <button
                key={chip.val}
                type="button"
                onClick={() =>
                  setFilters({
                    status: chip.val as "all" | "pending" | "partial" | "settled",
                    page: 1,
                  })
                }
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer shadow-2xs",
                  filters.status === chip.val
                    ? "bg-xenia-moss-600 text-white font-semibold"
                    : "bg-white border border-xenia-border text-xenia-stone-600 hover:bg-xenia-sand-100",
                )}
              >
                {chip.label}
              </button>
            ))}

            <div className="h-4 w-px bg-xenia-border shrink-0" />

            {/* Role Chips */}
            {[
              { val: "all", label: "All Bills" },
              { val: "owed_to_you", label: "📥 You are owed" },
              { val: "you_owe", label: "📤 You owe" },
            ].map((chip) => (
              <button
                key={chip.val}
                type="button"
                onClick={() =>
                  setFilters({
                    role: chip.val as "all" | "owed_to_you" | "you_owe",
                    page: 1,
                  })
                }
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer shadow-2xs",
                  filters.role === chip.val
                    ? "bg-xenia-moss-600 text-white font-semibold"
                    : "bg-white border border-xenia-border text-xenia-stone-600 hover:bg-xenia-sand-100",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Bills Card Feed */}
          {filteredBills.length === 0 ? (
            <div className="rounded-3xl border border-xenia-border bg-white p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-xenia-sand-100 text-xenia-stone-500">
                <ReceiptDollarIcon size={24} />
              </div>
              <h3 className="font-display text-base font-semibold text-xenia-ink-900">
                No split bills found
              </h3>
              <p className="text-xs text-xenia-stone-500 max-w-xs mx-auto">
                {filters.q || filters.status !== "all" || filters.role !== "all"
                  ? "Try resetting your search or filters to see more bills."
                  : "Start sharing expenses with friends by creating your first bill."}
              </p>
              <div className="pt-2">
                {filters.q || filters.status !== "all" || filters.role !== "all" ? (
                  <Buttons
                    style="second"
                    size="sm"
                    onClick={() =>
                      setFilters({ q: "", status: "all", role: "all", page: 1 })
                    }
                  >
                    Reset Filters
                  </Buttons>
                ) : (
                  <Buttons
                    style="main"
                    size="sm"
                    icon={<Add01Icon size={16} strokeWidth={2} />}
                    onClick={handleOpenAdd}
                  >
                    Create Split Bill
                  </Buttons>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedBills.map((bill) => (
                <SplitBillCard
                  key={bill.id}
                  bill={bill}
                  onClick={handleOpenDetail}
                  onEdit={handleOpenEdit}
                  onDelete={(id) => setDeletingId(id)}
                />
              ))}

              {/* Mobile Pagination */}
              {filteredBills.length > PAGE_SIZE && (
                <div className="rounded-2xl border border-xenia-border bg-white px-4 py-2.5">
                  <Pagination
                    page={currentPage}
                    pageCount={Math.max(1, Math.ceil(filteredBills.length / PAGE_SIZE))}
                    totalItems={filteredBills.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={(p) => setFilters({ page: p })}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB 2: PARTICIPANT BALANCES (PEOPLE)
      ══════════════════════════════════════════════ */}
      {filters.tab === "participants" && (
        <div className="space-y-3 pt-1">
          {/* Search Bar */}
          <div>
            <SearchBars
              placeholder="Search people by name or email..."
              value={filters.q}
              onChange={(val) => setFilters({ q: val, page: 1 })}
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              {
                val: "all",
                label: `All People (${participantSummaries.length})`,
              },
              {
                val: "owes_you",
                label: `Owes You (${debtorsCount})`,
              },
              {
                val: "you_owe",
                label: `You Owe (${creditorsCount})`,
              },
              {
                val: "settled",
                label: `All Settled (${settledCount})`,
              },
            ].map((chip) => (
              <button
                key={chip.val}
                type="button"
                onClick={() =>
                  setFilters({
                    debtStatus: chip.val as "all" | "owes_you" | "you_owe" | "settled",
                    page: 1,
                  })
                }
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer shadow-2xs",
                  filters.debtStatus === chip.val
                    ? "bg-xenia-moss-600 text-white font-semibold"
                    : "bg-white border border-xenia-border text-xenia-stone-600 hover:bg-xenia-sand-100",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* People Balances Feed */}
          {filteredParticipants.length === 0 ? (
            <div className="rounded-3xl border border-xenia-border bg-white p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-xenia-sand-100 text-xenia-stone-500">
                <UserIcon size={24} />
              </div>
              <h3 className="font-display text-base font-semibold text-xenia-ink-900">
                No participant balances match
              </h3>
              <p className="text-xs text-xenia-stone-500 max-w-xs mx-auto">
                Try clearing your search query or debt status filter.
              </p>
              <div className="pt-2">
                <Buttons
                  style="second"
                  size="sm"
                  onClick={() => setFilters({ q: "", debtStatus: "all", page: 1 })}
                >
                  Reset Filters
                </Buttons>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedParticipants.map((p) => (
                <ParticipantDebtCard
                  key={p.id}
                  participant={p}
                  onViewLedger={(part) => {
                    setSelectedParticipantForLedger(part);
                    setLedgerModalOpen(true);
                  }}
                  onFilterBills={(name) => {
                    setFilters({ tab: "bills", q: name, page: 1 });
                  }}
                />
              ))}

              {/* Mobile Pagination */}
              {filteredParticipants.length > PAGE_SIZE && (
                <div className="rounded-2xl border border-xenia-border bg-white px-4 py-2.5">
                  <Pagination
                    page={currentPage}
                    pageCount={Math.max(
                      1,
                      Math.ceil(filteredParticipants.length / PAGE_SIZE),
                    )}
                    totalItems={filteredParticipants.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={(p) => setFilters({ page: p })}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB 3: FRIENDS MANAGEMENT (MOBILE)
      ══════════════════════════════════════════════ */}
      {filters.tab === "friends" && (
        <div className="space-y-3 pt-1">
          {/* Search Bar & Add Button */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchBars
                placeholder="Search friends by name or email..."
                value={filters.q}
                onChange={(val) => setFilters({ q: val, page: 1 })}
              />
            </div>
            <button
              type="button"
              onClick={() => setFriendModalOpen(true)}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-xenia-moss-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-xenia-moss-700 transition-colors active:scale-95 shrink-0 cursor-pointer"
            >
              <UserAdd01Icon size={16} />
              <span>Add</span>
            </button>
          </div>

          {/* Friends Feed */}
          {friends.length === 0 ? (
            <div className="rounded-3xl border border-xenia-border bg-white p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-xenia-sand-100 text-xenia-stone-500">
                <UserGroupIcon size={24} />
              </div>
              <h3 className="font-display text-base font-semibold text-xenia-ink-900">
                No friends added yet
              </h3>
              <p className="text-xs text-xenia-stone-500 max-w-xs mx-auto">
                Add friends by searching registered users or adding contacts to easily select them in split bills.
              </p>
              <div className="pt-2">
                <Buttons
                  style="main"
                  size="sm"
                  icon={<UserAdd01Icon size={16} />}
                  onClick={() => setFriendModalOpen(true)}
                >
                  Add Your First Friend
                </Buttons>
              </div>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="rounded-3xl border border-xenia-border bg-white p-8 text-center space-y-3">
              <h3 className="font-display text-base font-semibold text-xenia-ink-900">
                No friends match your search
              </h3>
              <p className="text-xs text-xenia-stone-500">
                Try searching with a different name or email address.
              </p>
              <div className="pt-2">
                <Buttons
                  style="second"
                  size="sm"
                  onClick={() => setFilters({ q: "", page: 1 })}
                >
                  Reset Search
                </Buttons>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedFriends.map((friend) => {
                const summary = participantSummaries.find((p) =>
                  matchesParticipant(
                    { name: p.name, email: p.email },
                    { name: friend.name, email: friend.email, userId: friend.userId },
                  ),
                );

                return (
                  <div
                    key={friend.id}
                    className="flex flex-col justify-between rounded-2xl border border-xenia-border bg-white p-4 shadow-2xs transition-all hover:border-xenia-moss-600/40"
                  >
                    {/* Header: Avatar, Name & Delete */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-xenia-sand-100 text-sm font-semibold text-xenia-ink-900 ring-2 ring-white">
                          {friend.avatarUrl ? (
                            <img
                              src={friend.avatarUrl}
                              alt={friend.name}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            friend.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-xenia-ink-900 truncate">
                            {friend.name}
                          </h3>
                          {friend.email && (
                            <p className="text-xs text-xenia-stone-500 truncate">
                              {friend.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeletingFriendId(friend.id)}
                        title="Remove Friend"
                        className="rounded-lg p-1.5 text-xenia-stone-400 hover:bg-xenia-danger-soft hover:text-xenia-danger transition-colors cursor-pointer shrink-0"
                      >
                        <Delete02Icon size={16} />
                      </button>
                    </div>

                    {/* Badge & Debt Status */}
                    <div className="mt-3 pt-2.5 border-t border-xenia-divider/70 flex items-center justify-between text-xs">
                      <div>
                        {friend.userId ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-xenia-moss-600/10 px-2 py-0.5 text-[11px] font-medium text-xenia-moss-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-xenia-moss-600" />
                            Connected User
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-xenia-sand-100 px-2 py-0.5 text-[11px] font-medium text-xenia-stone-600">
                            Manual Contact
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-right text-xs">
                        {summary ? (
                          summary.status === "owes_you" ? (
                            <span className="font-semibold text-xenia-moss-600">
                              Owes you {format(summary.netBalance)}
                            </span>
                          ) : summary.status === "you_owe" ? (
                            <span className="font-semibold text-xenia-danger">
                              You owe {format(Math.abs(summary.netBalance))}
                            </span>
                          ) : (
                            <span className="text-xenia-stone-400">
                              Settled up ✓
                            </span>
                          )
                        ) : (
                          <span className="text-xenia-stone-400">
                            No shared bills
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 pt-2.5 border-t border-xenia-divider/70 flex items-center gap-2">
                      {summary && summary.billsCount > 0 && (
                        <Buttons
                          style="second"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedParticipantForLedger(summary);
                            setLedgerModalOpen(true);
                          }}
                        >
                          Ledger ({summary.billsCount})
                        </Buttons>
                      )}
                      <Buttons
                        style="second"
                        size="sm"
                        className="flex-1"
                        icon={<Invoice01Icon size={14} />}
                        onClick={handleOpenAdd}
                      >
                        Split Bill
                      </Buttons>
                    </div>
                  </div>
                );
              })}

              {/* Mobile Pagination */}
              {filteredFriends.length > PAGE_SIZE && (
                <div className="rounded-2xl border border-xenia-border bg-white px-4 py-2.5">
                  <Pagination
                    page={currentPage}
                    pageCount={Math.max(
                      1,
                      Math.ceil(filteredFriends.length / PAGE_SIZE),
                    )}
                    totalItems={filteredFriends.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={(p) => setFilters({ page: p })}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Modals & Dialogs ── */}
      <SplitBillModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingBill(null);
        }}
        billToEdit={editingBill}
      />

      <SplitBillDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedBillForDetail(null);
        }}
        bill={selectedBillForDetail}
        onEdit={handleOpenEdit}
        onDelete={(id) => {
          setDeletingId(id);
        }}
      />

      <ParticipantDetailModal
        open={ledgerModalOpen}
        onClose={() => {
          setLedgerModalOpen(false);
          setSelectedParticipantForLedger(null);
        }}
        participant={selectedParticipantForLedger}
      />

      <FriendModal
        open={friendModalOpen}
        onClose={() => setFriendModalOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Delete Split Bill"
        description="Are you sure you want to delete this split bill? Past recorded transactions will not be altered."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />

      <ConfirmDialog
        open={Boolean(deletingFriendId)}
        title="Remove Friend"
        description="Are you sure you want to remove this friend? Past split bills with this friend will remain intact."
        confirmLabel="Remove"
        onConfirm={handleConfirmDeleteFriend}
        onCancel={() => setDeletingFriendId(null)}
      />
    </PageShell>
  );
}

export default function SplitBillsPage() {
  return (
    <Suspense>
      <SplitBillsContent />
    </Suspense>
  );
}
