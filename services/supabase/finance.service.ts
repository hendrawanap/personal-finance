import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Account,
  Budget,
  FinancialProfile,
  Friend,
  SplitBill,
  StoredFinanceData,
  Transaction,
} from "@/types/finance";
import {
  accountFromRow,
  accountToRow,
  AccountRow,
  budgetFromRow,
  budgetToRow,
  BudgetRow,
  friendFromRow,
  friendToRow,
  FriendRow,
  profileFromRow,
  profileToRow,
  ProfileRow,
  splitBillFromRow,
  splitBillToRow,
  SplitBillRow,
  SplitBillParticipantRow,
  SplitBillItemRow,
  transactionFromRow,
  transactionToRow,
  TransactionRow,
} from "@/types/supabase";

export interface RemoteFinancePayload {
  profile?: FinancialProfile;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  splitBills: SplitBill[];
  friends: Friend[];
}

/**
 * Helper to get current authenticated user ID in Supabase
 */
export async function getSupabaseUserId(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch all finance entities from Supabase personal_finance schema.
 * Strictly scoped to the authenticated user (data owner).
 */
export async function fetchAllFromSupabase(): Promise<RemoteFinancePayload | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  try {
    const userId = await getSupabaseUserId();
    if (!userId) {
      // Under strict isolation, unauthenticated requests cannot see any data
      return null;
    }

    const [
      authUserRes,
      profilesRes,
      accountsRes,
      transactionsRes,
      budgetsRes,
      splitBillsRes,
      participantsRes,
      itemsRes,
      friendsRes,
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("*").eq("user_id", userId).limit(1),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false }),
      supabase.from("budgets").select("*").eq("user_id", userId),
      supabase
        .from("split_bills")
        .select("*")
        .order("date", { ascending: false }),
      supabase.from("split_bill_participants").select("*"),
      supabase.from("split_bill_items").select("*"),
      supabase
        .from("friends")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (accountsRes.error) {
      console.warn("Error fetching accounts from Supabase:", accountsRes.error);
    }

    const accounts: Account[] = ((accountsRes.data as AccountRow[]) || []).map(accountFromRow);
    const transactions: Transaction[] = (
      (transactionsRes.data as TransactionRow[]) || []
    ).map(transactionFromRow);
    const budgets: Budget[] = ((budgetsRes.data as BudgetRow[]) || []).map(budgetFromRow);

    // Group participants and items by bill_id
    const participantsByBill = new Map<string, SplitBillParticipantRow[]>();
    for (const p of (participantsRes.data as SplitBillParticipantRow[]) || []) {
      const existing = participantsByBill.get(p.bill_id) || [];
      existing.push(p);
      participantsByBill.set(p.bill_id, existing);
    }

    const itemsByBill = new Map<string, SplitBillItemRow[]>();
    for (const it of (itemsRes.data as SplitBillItemRow[]) || []) {
      const existing = itemsByBill.get(it.bill_id) || [];
      existing.push(it);
      itemsByBill.set(it.bill_id, existing);
    }

    let profile: FinancialProfile | undefined = undefined;
    if (profilesRes.data && profilesRes.data.length > 0) {
      profile = profileFromRow(profilesRes.data[0] as ProfileRow);
    }

    const currentAuthUser = authUserRes.data?.user;
    const currentUserContext = {
      id: userId,
      email: currentAuthUser?.email || profile?.email || null,
      name: profile?.name || (currentAuthUser?.user_metadata?.name as string) || null,
    };

    const splitBills: SplitBill[] = ((splitBillsRes.data as SplitBillRow[]) || []).map(
      (billRow) => {
        const parts = participantsByBill.get(billRow.id) || [];
        const its = itemsByBill.get(billRow.id) || [];
        return splitBillFromRow(billRow, parts, its, currentUserContext);
      },
    );

    const friends: Friend[] = (
      (friendsRes.data as FriendRow[]) || []
    ).map(friendFromRow);

    return {
      profile,
      accounts,
      transactions,
      budgets,
      splitBills,
      friends,
    };
  } catch (err) {
    console.error("Failed to load from Supabase:", err);
    return null;
  }
}

/**
 * Persist an account to Supabase (Strictly checks user_id)
 */
export async function persistAccountToSupabase(account: Account): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const userId = await getSupabaseUserId();
  if (!userId) {
    console.warn("Cannot persist account to cloud: User is not authenticated.");
    return false;
  }

  const row = accountToRow(account, userId);
  const { error } = await supabase.from("accounts").upsert(row);
  if (error) console.error("Failed to persist account:", error);
  return !error;
}

/**
 * Delete an account from Supabase (Strictly verifies ownership)
 */
export async function removeAccountFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const userId = await getSupabaseUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) console.error("Failed to delete account:", error);
  return !error;
}

/**
 * Persist a transaction to Supabase (Strictly checks user_id)
 */
export async function persistTransactionToSupabase(tx: Transaction): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const userId = await getSupabaseUserId();
  if (!userId) {
    console.warn("Cannot persist transaction to cloud: User is not authenticated.");
    return false;
  }

  const row = transactionToRow(tx, userId);
  const { error } = await supabase.from("transactions").upsert(row);
  if (error) console.error("Failed to persist transaction:", error);
  return !error;
}

/**
 * Delete a transaction from Supabase (Strictly verifies ownership)
 */
export async function removeTransactionFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const userId = await getSupabaseUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) console.error("Failed to delete transaction:", error);
  return !error;
}

/**
 * Persist a budget to Supabase (Strictly checks user_id)
 */
export async function persistBudgetToSupabase(budget: Budget): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const userId = await getSupabaseUserId();
  if (!userId) {
    console.warn("Cannot persist budget to cloud: User is not authenticated.");
    return false;
  }

  const row = budgetToRow(budget, userId);
  const { error } = await supabase.from("budgets").upsert(row);
  if (error) console.error("Failed to persist budget:", error);
  return !error;
}

/**
 * Delete a budget from Supabase (Strictly verifies ownership)
 */
export async function removeBudgetFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const userId = await getSupabaseUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) console.error("Failed to delete budget:", error);
  return !error;
}

/**
 * Persist a split bill to Supabase (Strictly checks user_id)
 */
export async function persistSplitBillToSupabase(bill: SplitBill): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const userId = await getSupabaseUserId();
  if (!userId) {
    console.warn("Cannot persist split bill to cloud: User is not authenticated.");
    return false;
  }

  const { bill: billRow, participants, items } = splitBillToRow(bill, userId);

  // 1. Upsert bill
  const { error: billErr } = await supabase.from("split_bills").upsert(billRow);
  if (billErr) {
    console.error("Failed to upsert split bill:", billErr);
    return false;
  }

  // 2. Upsert participants
  if (participants.length > 0) {
    const { error: partErr } = await supabase
      .from("split_bill_participants")
      .upsert(participants);
    if (partErr) console.error("Failed to upsert participants:", partErr);
  }

  // 3. Upsert items
  if (items.length > 0) {
    const { error: itemErr } = await supabase
      .from("split_bill_items")
      .upsert(items);
    if (itemErr) console.error("Failed to upsert items:", itemErr);
  }

  return true;
}

/**
 * Delete a split bill from Supabase (Strictly verifies ownership)
 */
export async function removeSplitBillFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const userId = await getSupabaseUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from("split_bills")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) console.error("Failed to delete split bill:", error);
  return !error;
}

/**
 * Persist user profile to Supabase (Strictly checks user_id)
 */
export async function persistProfileToSupabase(profile: FinancialProfile): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const userId = await getSupabaseUserId();
  if (!userId) return false;

  const row = profileToRow(profile, userId);

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(row)
      .eq("id", existing[0].id)
      .eq("user_id", userId);
    return !error;
  } else {
    const { error } = await supabase.from("profiles").insert({
      ...row,
      user_id: userId,
    });
    return !error;
  }
}

/**
 * Push all local data into Supabase in bulk (Strictly isolated by user_id)
 */
export async function syncAllToSupabase(data: StoredFinanceData): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return { success: false, message: "Supabase client is not configured." };
  }

  const userId = await getSupabaseUserId();
  if (!userId) {
    return {
      success: false,
      message: "You must be signed in to your Supabase account to sync data.",
    };
  }

  try {
    // 1. Profile
    if (data.profile) {
      await persistProfileToSupabase(data.profile);
    }

    // 2. Accounts
    if (data.accounts.length > 0) {
      const accountRows = data.accounts.map((a) => accountToRow(a, userId));
      const { error: accErr } = await supabase.from("accounts").upsert(accountRows);
      if (accErr) throw accErr;
    }

    // 3. Transactions
    if (data.transactions.length > 0) {
      const txRows = data.transactions.map((t) => transactionToRow(t, userId));
      const { error: txErr } = await supabase.from("transactions").upsert(txRows);
      if (txErr) throw txErr;
    }

    // 4. Budgets
    if (data.budgets.length > 0) {
      const budgetRows = data.budgets.map((b) => budgetToRow(b, userId));
      const { error: bErr } = await supabase.from("budgets").upsert(budgetRows);
      if (bErr) throw bErr;
    }

    // 5. Split Bills
    for (const bill of data.splitBills) {
      await persistSplitBillToSupabase(bill);
    }

    // 6. Friends
    if (data.friends && data.friends.length > 0) {
      const friendRows = data.friends.map((f) => friendToRow(f, userId));
      const { error: fErr } = await supabase.from("friends").upsert(friendRows);
      if (fErr) console.warn("Failed to sync friends:", fErr);
    }

    return { success: true, message: "Successfully synced all data to your private account!" };
  } catch (err: unknown) {
    console.error("Sync to Supabase failed:", err);
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : "An unexpected error occurred during sync.";
    return {
      success: false,
      message,
    };
  }
}

/**
 * Persist a friend to Supabase (Strictly checks user_id)
 */
export async function persistFriendToSupabase(friend: Friend): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const userId = await getSupabaseUserId();
  if (!userId) return false;

  const row = friendToRow(friend, userId);
  const { error } = await supabase.from("friends").upsert(row);
  if (error) console.error("Failed to persist friend:", error);
  return !error;
}

/**
 * Remove a friend from Supabase (Strictly verifies ownership)
 */
export async function removeFriendFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const userId = await getSupabaseUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from("friends")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) console.error("Failed to delete friend:", error);
  return !error;
}

/**
 * Search registered users from personal_finance.profiles
 */
export async function searchRegisteredUsersInSupabase(
  query: string,
): Promise<{ id: string; userId: string; name: string; email: string }[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !query.trim()) return [];

  const currentUserId = await getSupabaseUserId();

  try {
    const cleanQuery = query.trim();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, name, email")
      .or(`name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`)
      .limit(10);

    if (error) {
      console.warn("Failed to search registered users:", error);
      return [];
    }

    const userRows = (data as Array<{ id: string; user_id?: string | null; name?: string | null; email?: string | null }>) || [];

    return userRows
      .filter((u) => Boolean(u.user_id && u.user_id !== currentUserId))
      .map((u) => ({
        id: u.id,
        userId: u.user_id as string,
        name: u.name || "User",
        email: u.email || "",
      }));
  } catch (err) {
    console.error("User search error:", err);
    return [];
  }
}

/**
 * Update settlement status for a participant on a split bill
 */
export async function updateParticipantSettlementInSupabase(
  billId: string,
  participantId: string,
  isPaid: boolean,
): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("split_bill_participants")
    .update({
      status: isPaid ? "paid" : "unpaid",
      settled_at: isPaid ? new Date().toISOString() : null,
    })
    .eq("bill_id", billId)
    .eq("id", participantId);

  if (error) {
    console.error("Failed to update participant settlement:", error);
    return false;
  }
  return true;
}
