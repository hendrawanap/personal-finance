import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { getFallbackStore, setFallbackStore } from "@/lib/storage/serverStore";
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
import {
  Account,
  Budget,
  FinancialProfile,
  Friend,
  SplitBill,
  StoredFinanceData,
  Transaction,
} from "@/types/finance";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return apiUnauthorized();
  }

  const { user, supabase, isOffline } = auth;

  if (isOffline || !supabase) {
    const fallback = getFallbackStore(user.id);
    return apiSuccess(fallback);
  }

  try {
    const userId = user.id;

    // Fetch primary collections in parallel
    const [
      profilesRes,
      accountsRes,
      transactionsRes,
      budgetsRes,
      splitBillsRes,
      friendsRes,
    ] = await Promise.all([
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
      supabase
        .from("friends")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (accountsRes.error) {
      console.warn("Error fetching accounts:", accountsRes.error);
    }

    const accounts: Account[] = (
      (accountsRes.data as AccountRow[]) || []
    ).map(accountFromRow);

    const transactions: Transaction[] = (
      (transactionsRes.data as TransactionRow[]) || []
    ).map(transactionFromRow);

    const budgets: Budget[] = (
      (budgetsRes.data as BudgetRow[]) || []
    ).map(budgetFromRow);

    const rawBills = (splitBillsRes.data as SplitBillRow[]) || [];
    const billIds = rawBills.map((b) => b.id);

    // Scoped fetch: Fetch participants and items ONLY for user's relevant bills
    let participantsData: SplitBillParticipantRow[] = [];
    let itemsData: SplitBillItemRow[] = [];

    if (billIds.length > 0) {
      const [partRes, itemRes] = await Promise.all([
        supabase.from("split_bill_participants").select("*").in("bill_id", billIds),
        supabase.from("split_bill_items").select("*").in("bill_id", billIds),
      ]);
      participantsData = (partRes.data as SplitBillParticipantRow[]) || [];
      itemsData = (itemRes.data as SplitBillItemRow[]) || [];
    }

    // Group participants and items by bill_id
    const participantsByBill = new Map<string, SplitBillParticipantRow[]>();
    for (const p of participantsData) {
      const existing = participantsByBill.get(p.bill_id) || [];
      existing.push(p);
      participantsByBill.set(p.bill_id, existing);
    }

    const itemsByBill = new Map<string, SplitBillItemRow[]>();
    for (const it of itemsData) {
      const existing = itemsByBill.get(it.bill_id) || [];
      existing.push(it);
      itemsByBill.set(it.bill_id, existing);
    }

    let profile: FinancialProfile | undefined = undefined;
    if (profilesRes.data && profilesRes.data.length > 0) {
      profile = profileFromRow(profilesRes.data[0] as ProfileRow);
    }

    const currentUserContext = {
      id: userId,
      email: user.email || profile?.email || null,
      name: profile?.name || user.name || null,
    };

    const splitBills: SplitBill[] = rawBills.map((billRow) => {
      const parts = participantsByBill.get(billRow.id) || [];
      const its = itemsByBill.get(billRow.id) || [];
      return splitBillFromRow(billRow, parts, its, currentUserContext);
    });

    const friends: Friend[] = (
      (friendsRes.data as FriendRow[]) || []
    ).map(friendFromRow);

    return apiSuccess({
      profile,
      accounts,
      transactions,
      budgets,
      splitBills,
      friends,
    });
  } catch (err) {
    console.error("Failed to load finance data in Next.js API:", err);
    return apiError("Failed to fetch finance records from storage.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return apiUnauthorized();
  }

  const { user, supabase, isOffline } = auth;
  const body = (await request.json()) as StoredFinanceData;

  if (isOffline || !supabase) {
    setFallbackStore(user.id, body);
    return apiSuccess({
      success: true,
      message: "Synced data to local offline store.",
    });
  }

  try {
    const userId = user.id;

    // 1. Profile
    if (body.profile) {
      const profileRow = profileToRow(body.profile, userId);
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from("profiles")
          .update(profileRow)
          .eq("user_id", userId);
      } else {
        await supabase.from("profiles").insert({
          ...profileRow,
          user_id: userId,
        });
      }
    }

    // 2. Accounts
    if (body.accounts && body.accounts.length > 0) {
      const accountRows = body.accounts.map((a) => accountToRow(a, userId));
      const { error: accErr } = await supabase.from("accounts").upsert(accountRows);
      if (accErr) throw accErr;
    }

    // 3. Transactions
    if (body.transactions && body.transactions.length > 0) {
      const txRows = body.transactions.map((t) => transactionToRow(t, userId));
      const { error: txErr } = await supabase.from("transactions").upsert(txRows);
      if (txErr) throw txErr;
    }

    // 4. Budgets
    if (body.budgets && body.budgets.length > 0) {
      const budgetRows = body.budgets.map((b) => budgetToRow(b, userId));
      const { error: bErr } = await supabase.from("budgets").upsert(budgetRows);
      if (bErr) throw bErr;
    }

    // 5. Split Bills with atomic participant/item reconciliation
    if (body.splitBills && body.splitBills.length > 0) {
      for (const bill of body.splitBills) {
        const { bill: billRow, participants, items } = splitBillToRow(bill, userId);

        await supabase.from("split_bills").upsert(billRow);

        // Delete old participants not in current list
        if (participants.length > 0) {
          const currentPartIds = participants.map((p) => p.id);
          await supabase
            .from("split_bill_participants")
            .delete()
            .eq("bill_id", bill.id)
            .not("id", "in", `(${currentPartIds.map((id) => `"${id}"`).join(",")})`);

          await supabase.from("split_bill_participants").upsert(participants);
        } else {
          await supabase
            .from("split_bill_participants")
            .delete()
            .eq("bill_id", bill.id);
        }

        // Delete old items not in current list
        if (items.length > 0) {
          const currentItemIds = items.map((it) => it.id);
          await supabase
            .from("split_bill_items")
            .delete()
            .eq("bill_id", bill.id)
            .not("id", "in", `(${currentItemIds.map((id) => `"${id}"`).join(",")})`);

          await supabase.from("split_bill_items").upsert(items);
        } else {
          await supabase.from("split_bill_items").delete().eq("bill_id", bill.id);
        }
      }
    }

    // 6. Friends
    if (body.friends && body.friends.length > 0) {
      const friendRows = body.friends.map((f) => friendToRow(f, userId));
      await supabase.from("friends").upsert(friendRows);
    }

    return apiSuccess({
      success: true,
      message: "Successfully synchronized all data to cloud database!",
    });
  } catch (err: unknown) {
    console.error("Bulk sync error:", err);
    const message = err instanceof Error ? err.message : "Sync failed";
    return apiError(message, 500);
  }
}
