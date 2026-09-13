import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Account,
  Budget,
  FinancialProfile,
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
}

/**
 * Fetch all finance entities from Supabase personal_finance schema.
 */
export async function fetchAllFromSupabase(): Promise<RemoteFinancePayload | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  try {
    const [
      profilesRes,
      accountsRes,
      transactionsRes,
      budgetsRes,
      splitBillsRes,
      participantsRes,
      itemsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").limit(1),
      supabase.from("accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("budgets").select("*"),
      supabase.from("split_bills").select("*").order("date", { ascending: false }),
      supabase.from("split_bill_participants").select("*"),
      supabase.from("split_bill_items").select("*"),
    ]);

    if (accountsRes.error) {
      console.warn("Error fetching accounts from Supabase:", accountsRes.error);
    }

    const accounts: Account[] = (accountsRes.data as AccountRow[] || []).map(accountFromRow);
    const transactions: Transaction[] = (transactionsRes.data as TransactionRow[] || []).map(
      transactionFromRow,
    );
    const budgets: Budget[] = (budgetsRes.data as BudgetRow[] || []).map(budgetFromRow);

    // Group participants and items by bill_id
    const participantsByBill = new Map<string, SplitBillParticipantRow[]>();
    for (const p of (participantsRes.data as SplitBillParticipantRow[] || [])) {
      const existing = participantsByBill.get(p.bill_id) || [];
      existing.push(p);
      participantsByBill.set(p.bill_id, existing);
    }

    const itemsByBill = new Map<string, SplitBillItemRow[]>();
    for (const it of (itemsRes.data as SplitBillItemRow[] || [])) {
      const existing = itemsByBill.get(it.bill_id) || [];
      existing.push(it);
      itemsByBill.set(it.bill_id, existing);
    }

    const splitBills: SplitBill[] = (splitBillsRes.data as SplitBillRow[] || []).map(
      (billRow) => {
        const parts = participantsByBill.get(billRow.id) || [];
        const its = itemsByBill.get(billRow.id) || [];
        return splitBillFromRow(billRow, parts, its);
      },
    );

    let profile: FinancialProfile | undefined = undefined;
    if (profilesRes.data && profilesRes.data.length > 0) {
      profile = profileFromRow(profilesRes.data[0] as ProfileRow);
    }

    return {
      profile,
      accounts,
      transactions,
      budgets,
      splitBills,
    };
  } catch (err) {
    console.error("Failed to load from Supabase:", err);
    return null;
  }
}

/**
 * Persist an account to Supabase
 */
export async function persistAccountToSupabase(account: Account): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const row = accountToRow(account);
  const { error } = await supabase.from("accounts").upsert(row);
  if (error) console.error("Failed to persist account:", error);
  return !error;
}

/**
 * Delete an account from Supabase
 */
export async function removeAccountFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) console.error("Failed to delete account:", error);
  return !error;
}

/**
 * Persist a transaction to Supabase
 */
export async function persistTransactionToSupabase(tx: Transaction): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const row = transactionToRow(tx);
  const { error } = await supabase.from("transactions").upsert(row);
  if (error) console.error("Failed to persist transaction:", error);
  return !error;
}

/**
 * Delete a transaction from Supabase
 */
export async function removeTransactionFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) console.error("Failed to delete transaction:", error);
  return !error;
}

/**
 * Persist a budget to Supabase
 */
export async function persistBudgetToSupabase(budget: Budget): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const row = budgetToRow(budget);
  const { error } = await supabase.from("budgets").upsert(row);
  if (error) console.error("Failed to persist budget:", error);
  return !error;
}

/**
 * Delete a budget from Supabase
 */
export async function removeBudgetFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) console.error("Failed to delete budget:", error);
  return !error;
}

/**
 * Persist a split bill and all its participants to Supabase
 */
export async function persistSplitBillToSupabase(bill: SplitBill): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { bill: billRow, participants, items } = splitBillToRow(bill);

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
 * Delete a split bill from Supabase
 */
export async function removeSplitBillFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { error } = await supabase.from("split_bills").delete().eq("id", id);
  if (error) console.error("Failed to delete split bill:", error);
  return !error;
}

/**
 * Persist user profile to Supabase
 */
export async function persistProfileToSupabase(profile: FinancialProfile): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const row = profileToRow(profile);
  // Check if a profile already exists to update
  const { data: existing } = await supabase.from("profiles").select("id").limit(1);
  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(row)
      .eq("id", existing[0].id);
    return !error;
  } else {
    const { error } = await supabase.from("profiles").insert(row);
    return !error;
  }
}

/**
 * Push all local data into Supabase in bulk (Sync / Migration helper)
 */
export async function syncAllToSupabase(data: StoredFinanceData): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return { success: false, message: "Supabase client is not configured." };
  }

  try {
    // 1. Profile
    if (data.profile) {
      await persistProfileToSupabase(data.profile);
    }

    // 2. Accounts
    if (data.accounts.length > 0) {
      const accountRows = data.accounts.map((a) => accountToRow(a));
      const { error: accErr } = await supabase.from("accounts").upsert(accountRows);
      if (accErr) throw accErr;
    }

    // 3. Transactions
    if (data.transactions.length > 0) {
      const txRows = data.transactions.map((t) => transactionToRow(t));
      const { error: txErr } = await supabase.from("transactions").upsert(txRows);
      if (txErr) throw txErr;
    }

    // 4. Budgets
    if (data.budgets.length > 0) {
      const budgetRows = data.budgets.map((b) => budgetToRow(b));
      const { error: bErr } = await supabase.from("budgets").upsert(budgetRows);
      if (bErr) throw bErr;
    }

    // 5. Split Bills
    for (const bill of data.splitBills) {
      await persistSplitBillToSupabase(bill);
    }

    return { success: true, message: "Successfully synced all data to Supabase!" };
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
