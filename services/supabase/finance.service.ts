/**
 * Legacy Supabase Finance Service Adapter.
 * All calls are now routed to the Next.js API backend (/api/v1/finance/...)
 * to provide atomic operations, strict server-side validation, and eliminate browser-level RLS bugs.
 */

import {
  fetchFinanceData,
  persistAccount,
  removeAccount,
  persistTransaction,
  removeTransaction,
  persistBudget,
  removeBudget,
  persistSplitBill,
  removeSplitBill,
  updateParticipantSettlement,
  persistFriend,
  removeFriend,
  persistProfile,
  syncAllFinanceData,
  searchRegisteredUsers,
  RemoteFinancePayload,
} from "@/services/finance/finance.service";
import {
  Account,
  Budget,
  FinancialProfile,
  Friend,
  SplitBill,
  StoredFinanceData,
  Transaction,
} from "@/types/finance";

import { getProfile } from "@/services/auth/auth.service";

export type { RemoteFinancePayload };

export async function getSupabaseUserId(): Promise<string | null> {
  try {
    const profile = await getProfile();
    return profile?.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchAllFromSupabase(): Promise<RemoteFinancePayload | null> {
  return fetchFinanceData();
}

export async function persistAccountToSupabase(account: Account): Promise<boolean> {
  return persistAccount(account);
}

export async function removeAccountFromSupabase(id: string): Promise<boolean> {
  return removeAccount(id);
}

export async function persistTransactionToSupabase(tx: Transaction): Promise<boolean> {
  return persistTransaction(tx);
}

export async function removeTransactionFromSupabase(id: string): Promise<boolean> {
  return removeTransaction(id);
}

export async function persistBudgetToSupabase(budget: Budget): Promise<boolean> {
  return persistBudget(budget);
}

export async function removeBudgetFromSupabase(id: string): Promise<boolean> {
  return removeBudget(id);
}

export async function persistSplitBillToSupabase(bill: SplitBill): Promise<boolean> {
  return persistSplitBill(bill);
}

export async function removeSplitBillFromSupabase(id: string): Promise<boolean> {
  return removeSplitBill(id);
}

export async function persistProfileToSupabase(
  profile: FinancialProfile,
): Promise<boolean> {
  return persistProfile(profile);
}

export async function persistFriendToSupabase(friend: Friend): Promise<boolean> {
  return persistFriend(friend);
}

export async function removeFriendFromSupabase(id: string): Promise<boolean> {
  return removeFriend(id);
}

export async function updateParticipantSettlementInSupabase(
  billId: string,
  participantId: string,
  isPaid: boolean,
): Promise<boolean> {
  return updateParticipantSettlement(billId, participantId, isPaid);
}

export async function syncAllToSupabase(
  data: StoredFinanceData,
): Promise<{ success: boolean; message: string }> {
  return syncAllFinanceData(data);
}

export async function searchRegisteredUsersInSupabase(
  query: string,
): Promise<{ id: string; userId: string; name: string; email: string }[]> {
  return searchRegisteredUsers(query);
}
