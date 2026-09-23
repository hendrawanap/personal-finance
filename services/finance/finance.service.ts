import { getCookie } from "cookies-next";
import { axiosPrivate } from "@/lib/instance";
import { v } from "@/lib/apiVersion";
import { ApiEnvelope } from "@/types/auth/auth";
import {
  Account,
  Budget,
  FinancialProfile,
  Friend,
  SplitBill,
  StoredFinanceData,
  Transaction,
} from "@/types/finance";

export interface RemoteFinancePayload {
  profile?: FinancialProfile;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  splitBills: SplitBill[];
  friends: Friend[];
}

/**
 * Fetch all finance entities from the Next.js API backend.
 * Strictly scoped to the authenticated user on the server.
 */
export async function fetchFinanceData(): Promise<RemoteFinancePayload | null> {
  // If in browser and unauthenticated, skip fetching remote data
  if (typeof window !== "undefined") {
    const token = getCookie("accessToken");
    if (!token) return null;
  }

  try {
    const res = await axiosPrivate.get<ApiEnvelope<RemoteFinancePayload>>(
      v("finance", "/sync"),
    );
    return res.data?.data || null;
  } catch (err) {
    console.error("Failed to load finance data from Next.js API:", err);
    return null;
  }
}

/**
 * Persist an account to backend storage
 */
export async function persistAccount(account: Account): Promise<boolean> {
  try {
    await axiosPrivate.post<ApiEnvelope<Account>>(
      v("finance", "/accounts"),
      account,
    );
    return true;
  } catch (err) {
    console.error("Failed to persist account via API:", err);
    return false;
  }
}

/**
 * Delete an account from backend storage
 */
export async function removeAccount(id: string): Promise<boolean> {
  try {
    await axiosPrivate.delete<ApiEnvelope<{ deleted: boolean; id: string }>>(
      v("finance", `/accounts/${id}`),
    );
    return true;
  } catch (err) {
    console.error("Failed to delete account via API:", err);
    return false;
  }
}

/**
 * Persist a transaction to backend storage
 */
export async function persistTransaction(tx: Transaction): Promise<boolean> {
  try {
    await axiosPrivate.post<ApiEnvelope<Transaction>>(
      v("finance", "/transactions"),
      tx,
    );
    return true;
  } catch (err) {
    console.error("Failed to persist transaction via API:", err);
    return false;
  }
}

/**
 * Delete a transaction from backend storage
 */
export async function removeTransaction(id: string): Promise<boolean> {
  try {
    await axiosPrivate.delete<ApiEnvelope<{ deleted: boolean; id: string }>>(
      v("finance", `/transactions/${id}`),
    );
    return true;
  } catch (err) {
    console.error("Failed to delete transaction via API:", err);
    return false;
  }
}

/**
 * Persist a budget to backend storage
 */
export async function persistBudget(budget: Budget): Promise<boolean> {
  try {
    await axiosPrivate.post<ApiEnvelope<Budget>>(
      v("finance", "/budgets"),
      budget,
    );
    return true;
  } catch (err) {
    console.error("Failed to persist budget via API:", err);
    return false;
  }
}

/**
 * Delete a budget from backend storage
 */
export async function removeBudget(id: string): Promise<boolean> {
  try {
    await axiosPrivate.delete<ApiEnvelope<{ deleted: boolean; id: string }>>(
      v("finance", `/budgets/${id}`),
    );
    return true;
  } catch (err) {
    console.error("Failed to delete budget via API:", err);
    return false;
  }
}

/**
 * Persist a split bill to backend storage with atomic participant & item reconciliation
 */
export async function persistSplitBill(bill: SplitBill): Promise<boolean> {
  try {
    await axiosPrivate.post<ApiEnvelope<SplitBill>>(
      v("finance", "/split-bills"),
      bill,
    );
    return true;
  } catch (err) {
    console.error("Failed to persist split bill via API:", err);
    return false;
  }
}

/**
 * Delete a split bill from backend storage
 */
export async function removeSplitBill(id: string): Promise<boolean> {
  try {
    await axiosPrivate.delete<ApiEnvelope<{ deleted: boolean; id: string }>>(
      v("finance", `/split-bills/${id}`),
    );
    return true;
  } catch (err) {
    console.error("Failed to delete split bill via API:", err);
    return false;
  }
}

/**
 * Update settlement status for a participant on a split bill
 */
export async function updateParticipantSettlement(
  billId: string,
  participantId: string,
  isPaid: boolean,
): Promise<boolean> {
  try {
    await axiosPrivate.patch<ApiEnvelope<{ success: boolean }>>(
      v("finance", `/split-bills/${billId}/settle`),
      { participantId, isPaid },
    );
    return true;
  } catch (err) {
    console.error("Failed to update settlement via API:", err);
    return false;
  }
}

/**
 * Persist a friend to backend storage
 */
export async function persistFriend(friend: Friend): Promise<boolean> {
  try {
    await axiosPrivate.post<ApiEnvelope<Friend>>(
      v("finance", "/friends"),
      friend,
    );
    return true;
  } catch (err) {
    console.error("Failed to persist friend via API:", err);
    return false;
  }
}

/**
 * Remove a friend from backend storage
 */
export async function removeFriend(id: string): Promise<boolean> {
  try {
    await axiosPrivate.delete<ApiEnvelope<{ deleted: boolean; id: string }>>(
      v("finance", `/friends/${id}`),
    );
    return true;
  } catch (err) {
    console.error("Failed to delete friend via API:", err);
    return false;
  }
}

/**
 * Persist user financial profile to backend storage
 */
export async function persistProfile(
  profile: Partial<FinancialProfile>,
): Promise<boolean> {
  try {
    await axiosPrivate.put<ApiEnvelope<FinancialProfile>>(
      v("finance", "/profile"),
      profile,
    );
    return true;
  } catch (err) {
    console.error("Failed to update profile via API:", err);
    return false;
  }
}

/**
 * Push all local finance data into backend storage in bulk
 */
export async function syncAllFinanceData(
  data: StoredFinanceData,
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await axiosPrivate.post<ApiEnvelope<{ success: boolean; message: string }>>(
      v("finance", "/sync"),
      data,
    );
    return {
      success: res.data?.meta?.success ?? true,
      message: res.data?.meta?.message || "Successfully synced all data to backend storage!",
    };
  } catch (err: unknown) {
    console.error("Sync to backend failed:", err);
    const message =
      err instanceof Error
        ? err.message
        : "An unexpected error occurred during sync.";
    return {
      success: false,
      message,
    };
  }
}

/**
 * Search registered users via Next.js API
 */
export async function searchRegisteredUsers(
  query: string,
): Promise<{ id: string; userId: string; name: string; email: string }[]> {
  if (!query.trim()) return [];
  try {
    const res = await axiosPrivate.get<
      ApiEnvelope<{ id: string; userId: string; name: string; email: string }[]>
    >(v("finance", `/users/search?q=${encodeURIComponent(query.trim())}`));
    return res.data?.data || [];
  } catch (err) {
    console.error("User search error via API:", err);
    return [];
  }
}
