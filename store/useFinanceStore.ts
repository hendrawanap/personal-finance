"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import {
  INITIAL_ACCOUNTS,
  INITIAL_BUDGETS,
  INITIAL_FRIENDS,
  INITIAL_PROFILE,
  INITIAL_SPLIT_BILLS,
  INITIAL_TRANSACTIONS,
} from "@/constant/initialData";
import {
  Account,
  Budget,
  FinancialProfile,
  Friend,
  SplitBill,
  SplitBillStatus,
  SplitParticipantStatus,
  StoredFinanceData,
  Transaction,
} from "@/types/finance";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchAllFromSupabase,
  persistAccountToSupabase,
  removeAccountFromSupabase,
  persistTransactionToSupabase,
  removeTransactionFromSupabase,
  persistBudgetToSupabase,
  removeBudgetFromSupabase,
  persistSplitBillToSupabase,
  removeSplitBillFromSupabase,
  persistProfileToSupabase,
  persistFriendToSupabase,
  removeFriendFromSupabase,
  updateParticipantSettlementInSupabase,
  syncAllToSupabase,
} from "@/services/supabase/finance.service";
import { matchesPayer } from "@/lib/splitBillCalculations";

interface FinanceStoreState {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  profile: FinancialProfile;
  friends: Friend[];
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Account operations
  addAccount: (account: Omit<Account, "id" | "createdAt">) => Account;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  // Transaction operations (with automatic balance adjustments)
  addTransaction: (tx: Omit<Transaction, "id" | "createdAt">) => Transaction;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Budget operations
  addBudget: (budget: Omit<Budget, "id">) => Budget;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;

  // Profile operations
  updateProfile: (updates: Partial<FinancialProfile>) => void;

  // Friends operations
  addFriend: (friend: Omit<Friend, "id" | "createdAt">) => Friend;
  updateFriend: (id: string, updates: Partial<Friend>) => void;
  deleteFriend: (id: string) => void;

  // Split Bill operations
  splitBills: SplitBill[];
  addSplitBill: (
    bill: Omit<SplitBill, "id" | "createdAt">,
    recordExpense?: { accountId: string },
  ) => SplitBill;
  updateSplitBill: (id: string, updates: Partial<SplitBill>) => void;
  deleteSplitBill: (id: string) => void;
  settleParticipant: (
    billId: string,
    participantId: string,
    isPaid: boolean,
    recordReimbursement?: { accountId: string },
  ) => void;
  settleAllForParticipant: (
    participantNameOrEmail: string,
    isPaid: boolean,
    recordReimbursement?: { accountId: string },
  ) => void;

  // Data management
  resetToDefaults: () => void;
  clearAll: () => void;
  importData: (data: Partial<StoredFinanceData>) => void;
  syncFromSupabase: () => Promise<boolean>;
  syncToSupabase: () => Promise<{ success: boolean; message: string }>;
}

export const useFinanceStore = create<FinanceStoreState>()(
  persist(
    (set, get) => ({
      accounts: [],
      transactions: [],
      budgets: [],
      splitBills: [],
      friends: [],
      profile: {
        name: "User",
        email: "",
        currencySymbol: "Rp",
        currencyCode: "IDR",
        monthlySavingsTarget: 3000,
      },
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // ── Accounts ──
      addAccount: (data) => {
        const newAccount: Account = {
          ...data,
          id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ accounts: [newAccount, ...state.accounts] }));
        if (isSupabaseConfigured()) void persistAccountToSupabase(newAccount);
        return newAccount;
      },

      updateAccount: (id, updates) => {
        set((state) => {
          const updatedAccounts = state.accounts.map((acc) =>
            acc.id === id
              ? { ...acc, ...updates, updatedAt: new Date().toISOString() }
              : acc,
          );
          const target = updatedAccounts.find((acc) => acc.id === id);
          if (target && isSupabaseConfigured()) void persistAccountToSupabase(target);
          return { accounts: updatedAccounts };
        });
      },

      deleteAccount: (id) => {
        set((state) => ({
          accounts: state.accounts.filter((acc) => acc.id !== id),
          // Also optionally keep or reassign transactions
          transactions: state.transactions.filter((tx) => tx.accountId !== id),
        }));
        if (isSupabaseConfigured()) void removeAccountFromSupabase(id);
      },

      // ── Transactions ──
      addTransaction: (data) => {
        const newTx: Transaction = {
          ...data,
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          // Adjust balance on the target account
          const targetAccount = state.accounts.find((a) => a.id === data.accountId);
          let updatedAccounts = state.accounts;

          if (targetAccount) {
            const balanceDelta = data.type === "income" ? data.amount : -data.amount;
            updatedAccounts = state.accounts.map((acc) =>
              acc.id === data.accountId
                ? {
                    ...acc,
                    balance: Math.round((acc.balance + balanceDelta) * 100) / 100,
                    updatedAt: new Date().toISOString(),
                  }
                : acc,
            );
          }

          if (isSupabaseConfigured()) {
            void persistTransactionToSupabase(newTx);
            const acc = updatedAccounts.find((a) => a.id === data.accountId);
            if (acc) void persistAccountToSupabase(acc);
          }

          return {
            transactions: [newTx, ...state.transactions],
            accounts: updatedAccounts,
          };
        });

        return newTx;
      },

      updateTransaction: (id, updates) => {
        set((state) => {
          const oldTx = state.transactions.find((tx) => tx.id === id);
          if (!oldTx) return state;

          const updatedTx: Transaction = { ...oldTx, ...updates };

          let updatedAccounts = state.accounts;

          // Revert old transaction balance effect
          const oldAccId = oldTx.accountId;
          const oldDelta = oldTx.type === "income" ? -oldTx.amount : oldTx.amount;

          // Apply new transaction balance effect
          const newAccId = updatedTx.accountId;
          const newDelta =
            updatedTx.type === "income" ? updatedTx.amount : -updatedTx.amount;

          if (oldAccId === newAccId) {
            const netDelta = (updatedTx.type === "income" ? updatedTx.amount : -updatedTx.amount) -
              (oldTx.type === "income" ? oldTx.amount : -oldTx.amount);

            updatedAccounts = state.accounts.map((acc) =>
              acc.id === oldAccId
                ? {
                    ...acc,
                    balance: Math.round((acc.balance + netDelta) * 100) / 100,
                    updatedAt: new Date().toISOString(),
                  }
                : acc,
            );
          } else {
            updatedAccounts = state.accounts.map((acc) => {
              if (acc.id === oldAccId) {
                return {
                  ...acc,
                  balance: Math.round((acc.balance + oldDelta) * 100) / 100,
                  updatedAt: new Date().toISOString(),
                };
              }
              if (acc.id === newAccId) {
                return {
                  ...acc,
                  balance: Math.round((acc.balance + newDelta) * 100) / 100,
                  updatedAt: new Date().toISOString(),
                };
              }
              return acc;
            });
          }

          if (isSupabaseConfigured()) {
            void persistTransactionToSupabase(updatedTx);
            for (const aId of [oldAccId, newAccId]) {
              const acc = updatedAccounts.find((a) => a.id === aId);
              if (acc) void persistAccountToSupabase(acc);
            }
          }

          return {
            transactions: state.transactions.map((tx) =>
              tx.id === id ? updatedTx : tx,
            ),
            accounts: updatedAccounts,
          };
        });
      },

      deleteTransaction: (id) => {
        set((state) => {
          const txToDelete = state.transactions.find((tx) => tx.id === id);
          if (!txToDelete) return state;

          // Reverse balance effect on account
          const delta =
            txToDelete.type === "income" ? -txToDelete.amount : txToDelete.amount;

          const updatedAccounts = state.accounts.map((acc) =>
            acc.id === txToDelete.accountId
              ? {
                  ...acc,
                  balance: Math.round((acc.balance + delta) * 100) / 100,
                  updatedAt: new Date().toISOString(),
                }
              : acc,
          );

          if (isSupabaseConfigured()) {
            void removeTransactionFromSupabase(id);
            const acc = updatedAccounts.find((a) => a.id === txToDelete.accountId);
            if (acc) void persistAccountToSupabase(acc);
          }

          return {
            transactions: state.transactions.filter((tx) => tx.id !== id),
            accounts: updatedAccounts,
          };
        });
      },

      // ── Budgets ──
      addBudget: (data) => {
        const newBudget: Budget = {
          ...data,
          id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        };
        set((state) => ({ budgets: [...state.budgets, newBudget] }));
        if (isSupabaseConfigured()) void persistBudgetToSupabase(newBudget);
        return newBudget;
      },

      updateBudget: (id, updates) => {
        set((state) => {
          const nextBudgets = state.budgets.map((b) =>
            b.id === id ? { ...b, ...updates } : b,
          );
          const target = nextBudgets.find((b) => b.id === id);
          if (target && isSupabaseConfigured()) void persistBudgetToSupabase(target);
          return { budgets: nextBudgets };
        });
      },

      deleteBudget: (id) => {
        set((state) => ({
          budgets: state.budgets.filter((b) => b.id !== id),
        }));
        if (isSupabaseConfigured()) void removeBudgetFromSupabase(id);
      },

      // ── Profile ──
      updateProfile: (updates) => {
        set((state) => {
          const nextProfile = { ...state.profile, ...updates };
          if (isSupabaseConfigured()) void persistProfileToSupabase(nextProfile);
          return { profile: nextProfile };
        });
      },

      // ── Friends ──
      addFriend: (data) => {
        const newFriend: Friend = {
          ...data,
          id: `fr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ friends: [newFriend, ...state.friends] }));
        if (isSupabaseConfigured()) void persistFriendToSupabase(newFriend);
        return newFriend;
      },

      updateFriend: (id, updates) => {
        set((state) => {
          const updatedFriends = state.friends.map((f) =>
            f.id === id
              ? { ...f, ...updates, updatedAt: new Date().toISOString() }
              : f,
          );
          const target = updatedFriends.find((f) => f.id === id);
          if (target && isSupabaseConfigured()) void persistFriendToSupabase(target);
          return { friends: updatedFriends };
        });
      },

      deleteFriend: (id) => {
        set((state) => ({
          friends: state.friends.filter((f) => f.id !== id),
        }));
        if (isSupabaseConfigured()) void removeFriendFromSupabase(id);
      },

      // ── Split Bills ──
      addSplitBill: (data, recordExpense) => {
        const splitBillId = `sb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        let linkedTxId: string | undefined = undefined;

        set((state) => {
          let updatedAccounts = state.accounts;
          let updatedTransactions = state.transactions;

          // If user paid and requested recording the expense in transactions
          if (recordExpense && data.paidByCurrentUser) {
            linkedTxId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            const newTx: Transaction = {
              id: linkedTxId,
              date: data.date,
              description: `Split Bill: ${data.title}`,
              category: data.category,
              accountId: recordExpense.accountId,
              amount: data.totalAmount,
              type: "expense",
              status: "paid",
              notes: data.notes || `Fronted bill for ${data.participants.length} participants`,
              createdAt: new Date().toISOString(),
            };

            const targetAccount = state.accounts.find((a) => a.id === recordExpense.accountId);
            if (targetAccount) {
              updatedAccounts = state.accounts.map((acc) =>
                acc.id === recordExpense.accountId
                  ? {
                      ...acc,
                      balance: Math.round((acc.balance - data.totalAmount) * 100) / 100,
                      updatedAt: new Date().toISOString(),
                    }
                  : acc,
              );
            }
            updatedTransactions = [newTx, ...state.transactions];
          }

          const newBill: SplitBill = {
            ...data,
            id: splitBillId,
            payerAccountId: recordExpense?.accountId ?? data.payerAccountId,
            linkedTransactionId: linkedTxId ?? data.linkedTransactionId,
            createdAt: new Date().toISOString(),
          };

          if (isSupabaseConfigured()) {
            void persistSplitBillToSupabase(newBill);
            if (linkedTxId) {
              const tx = updatedTransactions.find((t) => t.id === linkedTxId);
              if (tx) void persistTransactionToSupabase(tx);
              const acc = updatedAccounts.find((a) => a.id === recordExpense?.accountId);
              if (acc) void persistAccountToSupabase(acc);
            }
          }

          return {
            splitBills: [newBill, ...state.splitBills],
            accounts: updatedAccounts,
            transactions: updatedTransactions,
          };
        });

        return {
          ...data,
          id: splitBillId,
          payerAccountId: recordExpense?.accountId ?? data.payerAccountId,
          linkedTransactionId: linkedTxId ?? data.linkedTransactionId,
          createdAt: new Date().toISOString(),
        };
      },

      updateSplitBill: (id, updates) => {
        set((state) => {
          const updated = state.splitBills.map((b) =>
            b.id === id
              ? { ...b, ...updates, updatedAt: new Date().toISOString() }
              : b,
          );
          const target = updated.find((b) => b.id === id);
          if (target && isSupabaseConfigured()) void persistSplitBillToSupabase(target);
          return { splitBills: updated };
        });
      },

      deleteSplitBill: (id) => {
        set((state) => ({
          splitBills: state.splitBills.filter((b) => b.id !== id),
        }));
        if (isSupabaseConfigured()) void removeSplitBillFromSupabase(id);
      },

      settleParticipant: (billId, participantId, isPaid, recordReimbursement) => {
        set((state) => {
          const targetBill = state.splitBills.find((b) => b.id === billId);
          if (!targetBill) return state;

          const targetParticipant = targetBill.participants.find(
            (p) => p.id === participantId,
          );
          if (!targetParticipant) return state;

          const updatedParticipants = targetBill.participants.map((p) => {
            if (p.id !== participantId) return p;
            return {
              ...p,
              status: (isPaid ? "paid" : "unpaid") as SplitParticipantStatus,
              settledAt: isPaid ? new Date().toISOString() : undefined,
            };
          });

          // Overall bill status:
          // Check participants other than payer if user fronted, or all participants
          const debtors = updatedParticipants.filter((p) =>
            targetBill.paidByCurrentUser ? !p.isCurrentUser : true,
          );
          const allSettled = debtors.length > 0 && debtors.every((p) => p.status === "paid");
          const anySettled = debtors.some((p) => p.status === "paid");
          const nextStatus: SplitBillStatus = allSettled
            ? "settled"
            : anySettled
            ? "partial"
            : "pending";

          let updatedAccounts = state.accounts;
          let updatedTransactions = state.transactions;

          // Optionally record reimbursement transaction
          let reimbTxId: string | undefined;
          if (recordReimbursement && isPaid) {
            reimbTxId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            const reimbTx: Transaction = {
              id: reimbTxId,
              date: new Date().toISOString().split("T")[0],
              description: `Reimbursement from ${targetParticipant.name}: ${targetBill.title}`,
              category: targetBill.category,
              accountId: recordReimbursement.accountId,
              amount: targetParticipant.shareAmount,
              type: "income",
              status: "paid",
              notes: `Settlement for split bill: ${targetBill.title}`,
              createdAt: new Date().toISOString(),
            };

            const targetAccount = state.accounts.find(
              (a) => a.id === recordReimbursement.accountId,
            );
            if (targetAccount) {
              updatedAccounts = state.accounts.map((acc) =>
                acc.id === recordReimbursement.accountId
                  ? {
                      ...acc,
                      balance:
                        Math.round(
                          (acc.balance + targetParticipant.shareAmount) * 100,
                        ) / 100,
                      updatedAt: new Date().toISOString(),
                    }
                  : acc,
              );
            }
            updatedTransactions = [reimbTx, ...state.transactions];
          }

          const updatedBill: SplitBill = {
            ...targetBill,
            participants: updatedParticipants,
            status: nextStatus,
            updatedAt: new Date().toISOString(),
          };

          if (isSupabaseConfigured()) {
            if (targetBill.userId && !targetBill.paidByCurrentUser) {
              void updateParticipantSettlementInSupabase(billId, participantId, isPaid);
            } else {
              void persistSplitBillToSupabase(updatedBill);
            }
            if (recordReimbursement && isPaid && reimbTxId) {
              const reimb = updatedTransactions.find((t) => t.id === reimbTxId);
              if (reimb) void persistTransactionToSupabase(reimb);
              const acc = updatedAccounts.find((a) => a.id === recordReimbursement.accountId);
              if (acc) void persistAccountToSupabase(acc);
            }
          }

          return {
            splitBills: state.splitBills.map((b) =>
              b.id === billId ? updatedBill : b,
            ),
            accounts: updatedAccounts,
            transactions: updatedTransactions,
          };
        });
      },

      settleAllForParticipant: (participantNameOrEmail, isPaid, recordReimbursement) => {
        set((state) => {
          const targetKey = participantNameOrEmail.trim().toLowerCase();
          const isTargetEmail = targetKey.includes("@");
          let totalReimbursed = 0;

          const updatedSplitBills = state.splitBills.map((bill) => {
            let modified = false;

            const updatedParticipants = bill.participants.map((p) => {
              const pEmail = p.email?.trim().toLowerCase();
              const pName = p.name.trim().toLowerCase();

              let matchesTarget = false;
              if (isTargetEmail || pEmail) {
                matchesTarget = Boolean(pEmail && pEmail === targetKey);
              } else {
                matchesTarget = pName === targetKey;
              }

              // If bill was paid by user, and participant matches target:
              if (bill.paidByCurrentUser && matchesTarget && !p.isCurrentUser) {
                if (isPaid && p.status === "unpaid") {
                  totalReimbursed += p.shareAmount;
                  modified = true;
                  return {
                    ...p,
                    status: "paid" as SplitParticipantStatus,
                    settledAt: new Date().toISOString(),
                  };
                } else if (!isPaid && p.status === "paid") {
                  modified = true;
                  return {
                    ...p,
                    status: "unpaid" as SplitParticipantStatus,
                    settledAt: undefined,
                  };
                }
              }

              // If bill was paid by target participant, and this is current user:
              const payerMatch = matchesPayer(bill, {
                name: targetKey,
                email: isTargetEmail ? targetKey : undefined,
              });
              if (!bill.paidByCurrentUser && payerMatch && p.isCurrentUser) {
                if (isPaid && p.status === "unpaid") {
                  modified = true;
                  return {
                    ...p,
                    status: "paid" as SplitParticipantStatus,
                    settledAt: new Date().toISOString(),
                  };
                } else if (!isPaid && p.status === "paid") {
                  modified = true;
                  return {
                    ...p,
                    status: "unpaid" as SplitParticipantStatus,
                    settledAt: undefined,
                  };
                }
              }

              return p;
            });

            if (!modified) return bill;

            const debtors = updatedParticipants.filter((p) =>
              bill.paidByCurrentUser ? !p.isCurrentUser : true,
            );
            const allSettled = debtors.length > 0 && debtors.every((p) => p.status === "paid");
            const anySettled = debtors.some((p) => p.status === "paid");
            const nextStatus: SplitBillStatus = allSettled
              ? "settled"
              : anySettled
              ? "partial"
              : "pending";

            return {
              ...bill,
              status: nextStatus,
              participants: updatedParticipants,
              updatedAt: new Date().toISOString(),
            };
          });

          let updatedAccounts = state.accounts;
          let updatedTransactions = state.transactions;

          if (recordReimbursement && isPaid && totalReimbursed > 0) {
            const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            const reimbTx: Transaction = {
              id: txId,
              date: new Date().toISOString().split("T")[0],
              description: `Settlement from ${participantNameOrEmail}`,
              category: "Other Income",
              accountId: recordReimbursement.accountId,
              amount: Math.round(totalReimbursed * 100) / 100,
              type: "income",
              status: "paid",
              notes: `Consolidated split bill settlement for ${participantNameOrEmail}`,
              createdAt: new Date().toISOString(),
            };
            updatedTransactions = [reimbTx, ...state.transactions];
            updatedAccounts = state.accounts.map((acc) =>
              acc.id === recordReimbursement.accountId
                ? {
                    ...acc,
                    balance: Math.round((acc.balance + totalReimbursed) * 100) / 100,
                    updatedAt: new Date().toISOString(),
                  }
                : acc,
            );
          }

          if (isSupabaseConfigured()) {
            for (const b of updatedSplitBills) {
              if (b.userId && !b.paidByCurrentUser) {
                const myPart = b.participants.find((p) => p.isCurrentUser);
                if (myPart) {
                  void updateParticipantSettlementInSupabase(b.id, myPart.id, isPaid);
                }
              } else {
                void persistSplitBillToSupabase(b);
              }
            }
          }

          return {
            splitBills: updatedSplitBills,
            accounts: updatedAccounts,
            transactions: updatedTransactions,
          };
        });
      },

      // ── Bulk Data Management ──
      resetToDefaults: () => {
        set({
          accounts: INITIAL_ACCOUNTS,
          transactions: INITIAL_TRANSACTIONS,
          budgets: INITIAL_BUDGETS,
          splitBills: INITIAL_SPLIT_BILLS,
          friends: INITIAL_FRIENDS,
          profile: INITIAL_PROFILE,
        });
      },

      clearAll: () => {
        set({
          accounts: [],
          transactions: [],
          budgets: [],
          splitBills: [],
          friends: [],
        });
      },

      importData: (data) => {
        set((state) => ({
          accounts: Array.isArray(data.accounts) ? data.accounts : state.accounts,
          transactions: Array.isArray(data.transactions)
            ? data.transactions
            : state.transactions,
          budgets: Array.isArray(data.budgets) ? data.budgets : state.budgets,
          splitBills: Array.isArray(data.splitBills)
            ? data.splitBills
            : state.splitBills,
          friends: Array.isArray(data.friends) ? data.friends : state.friends,
          profile: data.profile ? { ...state.profile, ...data.profile } : state.profile,
        }));
      },

      syncFromSupabase: async () => {
        if (!isSupabaseConfigured()) return false;
        try {
          const remote = await fetchAllFromSupabase();
          if (!remote) return false;

          set((state) => ({
            accounts: remote.accounts,
            transactions: remote.transactions,
            budgets: remote.budgets,
            splitBills: remote.splitBills,
            friends: remote.friends || state.friends,
            profile: remote.profile
              ? { ...state.profile, ...remote.profile }
              : state.profile,
          }));
          return true;
        } catch (err) {
          console.error("Failed to sync from Supabase:", err);
          return false;
        }
      },

      syncToSupabase: async () => {
        const current = get();
        return syncAllToSupabase({
          accounts: current.accounts,
          transactions: current.transactions,
          budgets: current.budgets,
          splitBills: current.splitBills,
          friends: current.friends,
          profile: current.profile,
          version: 1,
        });
      },
    }),
    {
      name: "personal_finance_storage_v1",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (isSupabaseConfigured()) {
          void state?.syncFromSupabase();
        }
      },
    },
  ),
);

const emptySubscribe = () => () => {};

/**
 * SSR-safe hydration hook using useSyncExternalStore
 */
export function useFinanceHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
