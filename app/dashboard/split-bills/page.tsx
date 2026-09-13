"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { useQueryStates } from "nuqs";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Coins01Icon,
  Delete02Icon,
  Download01Icon,
  Edit01Icon,
  Invoice01Icon,
  ReceiptDollarIcon,
  UserAdd01Icon,
  UserGroupIcon,
  UserIcon,
} from "hugeicons-react";
import type { ColumnDef, OnChangeFn, PaginationState, SortingState } from "@tanstack/react-table";
import toast from "react-hot-toast";

import {
  searchParser,
  enumParser,
  pageParser,
  tabEnumParser,
  sortParser,
  sortToSortingState,
  sortingStateToSort,
} from "@/lib/urlState";
import { PageShell } from "@/components/molecules/dashboard/pageShell";
import { Heading } from "@/components/molecules/dashboard/head";
import { SearchBars } from "@/components/atoms/searchBar";
import { Selects } from "@/components/atoms/selects";
import { Buttons } from "@/components/atoms/buttons";
import { PillTabs } from "@/components/atoms/pillTabs";
import { StatCard } from "@/components/molecules/dashboard/statCard";
import { StatusBadge } from "@/components/atoms/statusBadge";
import DataTable from "@/components/organisms/table";
import { Pagination } from "@/components/molecules/dashboard/unit/pagination";
import { useFinanceStore, useFinanceHydrated } from "@/store/useFinanceStore";
import { SplitBillModal } from "@/components/molecules/finance/splitBillModal";
import { SplitBillDetailModal } from "@/components/molecules/finance/splitBillDetailModal";
import { ParticipantDebtCard } from "@/components/molecules/finance/participantDebtCard";
import { ParticipantDetailModal } from "@/components/molecules/finance/participantDetailModal";
import { FriendModal } from "@/components/molecules/finance/friendModal";
import ConfirmDialog from "@/components/molecules/dashboard/unit/confirmDialog";
import { exportExcel } from "@/lib/exportExcel";
import { SplitBill, ParticipantSummary, Friend } from "@/types/finance";
import { useCurrency } from "@/lib/currency";
import { computeParticipantSummaries } from "@/lib/splitBillCalculations";

const splitBillFilterParsers = {
  tab: tabEnumParser(["bills", "participants", "friends"] as const, "bills"),
  q: searchParser,
  status: enumParser(["all", "pending", "partial", "settled"] as const, "all"),
  role: enumParser(["all", "owed_to_you", "you_owe"] as const, "all"),
  debtStatus: enumParser(["all", "owes_you", "you_owe", "settled"] as const, "all"),
  sort: sortParser,
  page: pageParser,
};

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

  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: Math.max(0, (filters.page || 1) - 1), pageSize: 10 }),
    [filters.page],
  );

  const sorting = useMemo(() => sortToSortingState(filters.sort), [filters.sort]);

  const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      setFilters({ page: next.pageIndex + 1 });
    },
    [pagination, setFilters],
  );

  const onSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setFilters({ sort: sortingStateToSort(next) || null, page: 1 });
    },
    [sorting, setFilters],
  );

  const tableProps = useMemo(
    () => ({
      pagination,
      onPaginationChange,
      sorting,
      onSortingChange,
    }),
    [pagination, onPaginationChange, sorting, onSortingChange],
  );

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

  // ── Table Columns ──
  const columns = useMemo<ColumnDef<SplitBill>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: (info) => (
          <span className="font-mono text-xs text-xenia-stone-700">
            {String(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "title",
        header: "Bill & Details",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <button
                type="button"
                onClick={() => handleOpenDetail(row)}
                className="font-medium text-xenia-ink-900 hover:text-xenia-moss-600 hover:underline text-left cursor-pointer transition-colors"
              >
                {row.title}
              </button>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-xenia-stone-400 capitalize">
                  {row.splitMethod} split
                </span>
                <span className="text-[11px] text-xenia-stone-300">·</span>
                <span className="text-[11px] text-xenia-stone-400">
                  {row.participants.length} people
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: (info) => (
          <span className="inline-flex rounded-md bg-xenia-sand-100 px-2 py-0.5 text-xs text-xenia-stone-700">
            {String(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "paidBy",
        header: "Paid By",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-xenia-ink-900">
                {row.paidByCurrentUser ? "You" : row.paidBy}
              </span>
              {row.paidByCurrentUser && (
                <span className="rounded bg-xenia-moss-600/10 px-1.5 py-0.2 text-[10px] font-medium text-xenia-moss-600">
                  Fronted
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "totalAmount",
        header: "Total",
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-xenia-ink-900">
            {format(Number(info.getValue()))}
          </span>
        ),
      },
      {
        id: "yourShare",
        header: "Your Share",
        cell: (info) => {
          const row = info.row.original;
          const myParticipant = row.participants.find((p) => p.isCurrentUser);
          if (!myParticipant) {
            return <span className="text-xs text-xenia-stone-400">—</span>;
          }
          return (
            <span className="font-mono text-xs text-xenia-stone-700">
              {format(myParticipant.shareAmount)}
            </span>
          );
        },
      },
      {
        id: "progress",
        header: "Settled Progress",
        cell: (info) => {
          const row = info.row.original;
          const settled = row.participants.reduce(
            (sum, p) => (p.status === "paid" ? sum + p.shareAmount : sum),
            0,
          );
          const pct =
            row.totalAmount > 0
              ? Math.min(100, Math.round((settled / row.totalAmount) * 100))
              : 0;

          return (
            <div className="w-32 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-mono text-xenia-ink-900">
                  {format(settled, 0)} / {format(row.totalAmount, 0)}
                </span>
                <span className="text-xenia-stone-400">{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-xenia-sand-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    pct === 100 ? "bg-xenia-moss-600" : "bg-xenia-brass-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => (
          <StatusBadge status={String(info.getValue())} size="sm" />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleOpenDetail(row)}
                title="View & Settle Bill"
                className="rounded p-1 text-xenia-stone-500 transition-colors hover:bg-xenia-sand-100 hover:text-xenia-ink-900 cursor-pointer"
              >
                <Invoice01Icon size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleOpenEdit(row)}
                title="Edit Split Bill"
                className="rounded p-1 text-xenia-stone-500 transition-colors hover:bg-xenia-sand-100 hover:text-xenia-ink-900 cursor-pointer"
              >
                <Edit01Icon size={15} />
              </button>
              <button
                type="button"
                onClick={() => setDeletingId(row.id)}
                title="Delete Split Bill"
                className="rounded p-1 text-xenia-stone-500 transition-colors hover:bg-xenia-danger-soft hover:text-xenia-danger cursor-pointer"
              >
                <Delete02Icon size={15} />
              </button>
            </div>
          );
        },
      },
    ],
    [deleteSplitBill, format],
  );

  return (
    <PageShell width="default" spacing="md">
      <Heading
        title="Split Bills"
        subtitle="Manage group expenses, friend reimbursements, and settlement progress."
        noIcon
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PillTabs
              options={[
                { value: "bills", label: `Bills (${splitBills.length})` },
                {
                  value: "participants",
                  label: `People (${participantSummaries.length})`,
                },
                {
                  value: "friends",
                  label: `Friends (${friends.length})`,
                },
              ]}
              value={filters.tab}
              onChange={(val) =>
                setFilters({
                  tab: val as "bills" | "participants" | "friends",
                  page: 1,
                })
              }
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {filters.tab === "friends" ? (
                <>
                  <Buttons
                    style="second"
                    icon={<Add01Icon size={16} />}
                    onClick={handleOpenAdd}
                    className="flex-1 sm:flex-initial"
                  >
                    Split Bill
                  </Buttons>
                  <Buttons
                    style="main"
                    icon={<UserAdd01Icon size={16} />}
                    onClick={() => setFriendModalOpen(true)}
                    className="flex-1 sm:flex-initial"
                  >
                    Add Friend
                  </Buttons>
                </>
              ) : (
                <>
                  <Buttons
                    style="second"
                    icon={<Download01Icon size={16} />}
                    onClick={handleExport}
                    loading={isExporting}
                    className="flex-1 sm:flex-initial"
                  >
                    Export
                  </Buttons>
                  <Buttons
                    style="main"
                    icon={<Add01Icon size={16} />}
                    onClick={handleOpenAdd}
                    className="flex-1 sm:flex-initial"
                  >
                    Create Split Bill
                  </Buttons>
                </>
              )}
            </div>
          </div>
        }
      />

      {/* ── Top Summary KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          eyebrow="Receivables"
          title="You Are Owed"
          value={hydrated ? format(totalOwedToYou) : format(0)}
          valueAccent="moss"
          delta={totalOwedToYou > 0 ? "Pending collection" : "All collected"}
          deltaTone={totalOwedToYou > 0 ? "ok" : "idle"}
          icon={<ArrowUp01Icon size={18} />}
          subtext="Unpaid shares from friends"
        />

        <StatCard
          eyebrow="Payables"
          title="You Owe"
          value={hydrated ? format(totalYouOwe) : format(0)}
          valueAccent={totalYouOwe > 0 ? "stone" : "moss"}
          delta={totalYouOwe > 0 ? "Pending payment" : "All settled"}
          deltaTone={totalYouOwe > 0 ? "warn" : "ok"}
          icon={<ArrowDown01Icon size={18} />}
          subtext="Bills fronted by others"
        />

        <StatCard
          eyebrow="Net Position"
          title="Net Balance"
          value={hydrated ? format(netBalance) : format(0)}
          valueAccent={netBalance >= 0 ? "brass" : "stone"}
          delta={netBalance >= 0 ? "Positive surplus" : "Net payable"}
          deltaTone={netBalance >= 0 ? "ok" : "warn"}
          icon={<Coins01Icon size={18} />}
          subtext="Owed to you minus what you owe"
        />

        <StatCard
          eyebrow="Active Records"
          title="Active Bills"
          value={hydrated ? String(activeBillsCount) : "0"}
          valueAccent="stone"
          delta={`${splitBills.length} total bills`}
          deltaTone="idle"
          icon={<ReceiptDollarIcon size={18} />}
          subtext="Pending or partial settlements"
        />
      </div>

      {/* ── Tab View: All Bills ── */}
      {filters.tab === "bills" && (
        <div className="space-y-4">
          {/* Quick Active Debts Strip */}
          {(debtors.length > 0 || creditors.length > 0) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-xenia-border bg-xenia-sand-50/70 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-xenia-stone-700">
                  Participant Balances:
                </span>
                {debtors.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedParticipantForLedger(p);
                      setLedgerModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-xenia-moss-700 border border-xenia-border hover:bg-xenia-sand-100 transition-colors cursor-pointer shadow-2xs"
                    title={`Click to view ledger with ${p.name}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-xenia-moss-600" />
                    <span>
                      {p.name} owes you {format(p.netBalance)}
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-xenia-danger border border-xenia-border hover:bg-xenia-sand-100 transition-colors cursor-pointer shadow-2xs"
                    title={`Click to view ledger with ${p.name}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-xenia-danger" />
                    <span>
                      You owe {p.name} {format(Math.abs(p.netBalance))}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setFilters({ tab: "participants", page: 1 })}
                className="text-xs font-semibold text-xenia-moss-700 hover:text-xenia-moss-800 transition-colors cursor-pointer self-start sm:self-auto"
              >
                View All People ({participantSummaries.length}) →
              </button>
            </div>
          )}

          {/* Bills Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-full sm:w-72">
              <SearchBars
                placeholder="Search title, category, or friends..."
                value={filters.q}
                onChange={(val) => setFilters({ q: val, page: 1 })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full sm:flex sm:w-auto">
              <div className="w-full sm:w-40">
                <Selects
                  variant="filter"
                  value={filters.status}
                  onChange={(val) =>
                    setFilters({
                      status: val as "all" | "pending" | "partial" | "settled",
                      page: 1,
                    })
                  }
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "pending", label: "Pending" },
                    { value: "partial", label: "Partial" },
                    { value: "settled", label: "Settled" },
                  ]}
                />
              </div>

              <div className="w-full sm:w-44">
                <Selects
                  variant="filter"
                  value={filters.role}
                  onChange={(val) =>
                    setFilters({
                      role: val as "all" | "owed_to_you" | "you_owe",
                      page: 1,
                    })
                  }
                  options={[
                    { value: "all", label: "All Bills" },
                    { value: "owed_to_you", label: "You are owed" },
                    { value: "you_owe", label: "You owe" },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Bills Data Table */}
          <DataTable
            columns={columns}
            data={hydrated ? filteredBills : []}
            totalItems={filteredBills.length}
            pageSize={10}
            {...tableProps}
          />
        </div>
      )}

      {/* ── Tab View: Participant Balances ── */}
      {filters.tab === "participants" && (
        <div className="space-y-4">
          {/* Participant Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <div className="w-full sm:w-72">
                <SearchBars
                  placeholder="Search by name or email..."
                  value={filters.q}
                  onChange={(val) => setFilters({ q: val, page: 1 })}
                />
              </div>

              <div className="w-full sm:w-48">
                <Selects
                  variant="filter"
                  value={filters.debtStatus}
                  onChange={(val) =>
                    setFilters({
                      debtStatus: val as "all" | "owes_you" | "you_owe" | "settled",
                      page: 1,
                    })
                  }
                  options={[
                    {
                      value: "all",
                      label: `All People (${participantSummaries.length})`,
                    },
                    {
                      value: "owes_you",
                      label: `Owes You (${debtorsCount})`,
                    },
                    {
                      value: "you_owe",
                      label: `You Owe (${creditorsCount})`,
                    },
                    {
                      value: "settled",
                      label: `All Settled (${settledCount})`,
                    },
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-xenia-stone-500 font-mono">
              <span>{filteredParticipants.length} people shown</span>
            </div>
          </div>

          {/* Participants Cards Grid */}
          {filteredParticipants.length === 0 ? (
            <div className="rounded-xl border border-xenia-border bg-white p-12 text-center">
              <p className="text-sm font-medium text-xenia-ink-900">
                No participants match your filter
              </p>
              <p className="mt-1 text-xs text-xenia-stone-500">
                Try adjusting your search query or debt status filter.
              </p>
              <div className="mt-4">
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredParticipants
                  .slice(
                    Math.max(0, (filters.page || 1) - 1) * 6,
                    Math.max(0, (filters.page || 1) - 1) * 6 + 6,
                  )
                  .map((p) => (
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
              </div>

              <div className="rounded-2xl border border-xenia-border bg-white px-5 py-3">
                <Pagination
                  page={filters.page || 1}
                  pageCount={Math.max(1, Math.ceil(filteredParticipants.length / 6))}
                  totalItems={filteredParticipants.length}
                  pageSize={6}
                  onPageChange={(p) => setFilters({ page: p })}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab View: Friends Management ── */}
      {filters.tab === "friends" && (
        <div className="space-y-4">
          {/* Friends Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <div className="w-full sm:w-72">
                <SearchBars
                  placeholder="Search friends by name or email..."
                  value={filters.q}
                  onChange={(val) => setFilters({ q: val, page: 1 })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-xenia-stone-500 font-mono">
              <span>{filteredFriends.length} friends</span>
            </div>
          </div>

          {/* Friends Grid */}
          {friends.length === 0 ? (
            <div className="rounded-xl border border-xenia-border bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-xenia-sand-100 text-xenia-stone-500">
                <UserGroupIcon size={24} />
              </div>
              <p className="mt-3 text-sm font-semibold text-xenia-ink-900">
                No friends added yet
              </p>
              <p className="mt-1 text-xs text-xenia-stone-500 max-w-sm mx-auto">
                Add friends by searching registered users or adding contacts to easily select them when creating split bills and share expenses.
              </p>
              <div className="mt-5">
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
            <div className="rounded-xl border border-xenia-border bg-white p-12 text-center">
              <p className="text-sm font-medium text-xenia-ink-900">
                No friends match your search
              </p>
              <p className="mt-1 text-xs text-xenia-stone-500">
                Try searching with a different name or email.
              </p>
              <div className="mt-4">
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredFriends
                  .slice(
                    Math.max(0, (filters.page || 1) - 1) * 6,
                    Math.max(0, (filters.page || 1) - 1) * 6 + 6,
                  )
                  .map((friend) => {
                    const summary = participantSummaries.find((p) => {
                      if (friend.email && p.email && friend.email.toLowerCase() === p.email.toLowerCase()) {
                        return true;
                      }
                      return p.name.toLowerCase() === friend.name.toLowerCase();
                    });

                    return (
                      <div
                        key={friend.id}
                        className="rounded-2xl border border-xenia-border bg-white p-5 shadow-2xs transition-all hover:border-xenia-moss-600/30 flex flex-col justify-between"
                      >
                        <div>
                          {/* Header: Avatar, Name, Badges */}
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
                              className="rounded p-1 text-xenia-stone-400 hover:bg-xenia-danger-soft hover:text-xenia-danger transition-colors cursor-pointer shrink-0"
                            >
                              <Delete02Icon size={16} />
                            </button>
                          </div>

                          {/* Connection & Balance Status */}
                          <div className="mt-4 pt-3 border-t border-xenia-border/60 flex items-center justify-between text-xs">
                            <div>
                              {friend.friendUserId ? (
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

                            <div className="font-mono text-right">
                              {summary ? (
                                summary.status === "owes_you" ? (
                                  <span className="font-medium text-xenia-moss-600">
                                    Owes you {format(summary.netBalance)}
                                  </span>
                                ) : summary.status === "you_owe" ? (
                                  <span className="font-medium text-xenia-danger">
                                    You owe {format(Math.abs(summary.netBalance))}
                                  </span>
                                ) : (
                                  <span className="text-xenia-stone-400">
                                    Settled up
                                  </span>
                                )
                              ) : (
                                <span className="text-xenia-stone-400">
                                  No bills yet
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-3 border-t border-xenia-border/60 flex items-center gap-2">
                          {summary && summary.billsCount > 0 ? (
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
                          ) : (
                            <div className="flex-1" />
                          )}
                          <Buttons
                            style="second"
                            size="sm"
                            icon={<Invoice01Icon size={14} />}
                            onClick={handleOpenAdd}
                          >
                            Split Bill
                          </Buttons>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {filteredFriends.length > 6 && (
                <div className="rounded-2xl border border-xenia-border bg-white px-5 py-3">
                  <Pagination
                    page={filters.page || 1}
                    pageCount={Math.max(1, Math.ceil(filteredFriends.length / 6))}
                    totalItems={filteredFriends.length}
                    pageSize={6}
                    onPageChange={(p) => setFilters({ page: p })}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit Split Bill Modal ── */}
      <SplitBillModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingBill(null);
        }}
        billToEdit={editingBill}
      />

      {/* ── Detail & Settlement Modal ── */}
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

      {/* ── Participant Ledger History Modal ── */}
      <ParticipantDetailModal
        open={ledgerModalOpen}
        onClose={() => {
          setLedgerModalOpen(false);
          setSelectedParticipantForLedger(null);
        }}
        participant={selectedParticipantForLedger}
      />

      {/* ── Friend Modal ── */}
      <FriendModal
        open={friendModalOpen}
        onClose={() => setFriendModalOpen(false)}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Delete Split Bill"
        description="Are you sure you want to delete this split bill? Past recorded transactions will not be altered."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />

      {/* ── Delete Friend Confirmation Dialog ── */}
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
