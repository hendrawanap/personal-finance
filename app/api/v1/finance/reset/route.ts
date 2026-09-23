import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { resetFallbackStore } from "@/lib/storage/serverStore";
import {
  INITIAL_ACCOUNTS,
  INITIAL_BUDGETS,
  INITIAL_FRIENDS,
  INITIAL_PROFILE,
  INITIAL_SPLIT_BILLS,
  INITIAL_TRANSACTIONS,
} from "@/constant/initialData";
import {
  accountToRow,
  budgetToRow,
  friendToRow,
  profileToRow,
  splitBillToRow,
  transactionToRow,
} from "@/types/supabase";

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;

  if (isOffline || !supabase) {
    resetFallbackStore(user.id);
    return apiSuccess({
      success: true,
      message: "Reset local offline data to defaults.",
    });
  }

  try {
    const userId = user.id;

    // Delete existing records scoped strictly to the current user
    const { data: userBills } = await supabase
      .from("split_bills")
      .select("id")
      .eq("user_id", userId);

    const userBillIds = (userBills || []).map((b) => b.id);

    if (userBillIds.length > 0) {
      const idList = `(${userBillIds.map((id) => `"${id}"`).join(",")})`;
      await supabase.from("split_bill_items").delete().filter("bill_id", "in", idList);
      await supabase.from("split_bill_participants").delete().filter("bill_id", "in", idList);
    }

    await supabase.from("split_bills").delete().eq("user_id", userId);
    await supabase.from("transactions").delete().eq("user_id", userId);
    await supabase.from("budgets").delete().eq("user_id", userId);
    await supabase.from("accounts").delete().eq("user_id", userId);
    await supabase.from("friends").delete().eq("user_id", userId);

    // Seed defaults
    const accRows = INITIAL_ACCOUNTS.map((a) => accountToRow(a, userId));
    await supabase.from("accounts").upsert(accRows);

    const txRows = INITIAL_TRANSACTIONS.map((t) => transactionToRow(t, userId));
    await supabase.from("transactions").upsert(txRows);

    const bRows = INITIAL_BUDGETS.map((b) => budgetToRow(b, userId));
    await supabase.from("budgets").upsert(bRows);

    for (const bill of INITIAL_SPLIT_BILLS) {
      const { bill: bRow, participants, items } = splitBillToRow(bill, userId);
      await supabase.from("split_bills").upsert(bRow);
      if (participants.length > 0) {
        await supabase.from("split_bill_participants").upsert(participants);
      }
      if (items.length > 0) {
        await supabase.from("split_bill_items").upsert(items);
      }
    }

    const fRows = INITIAL_FRIENDS.map((f) => friendToRow(f, userId));
    await supabase.from("friends").upsert(fRows);

    const pRow = profileToRow(INITIAL_PROFILE, userId);
    await supabase.from("profiles").upsert(pRow);

    return apiSuccess({
      success: true,
      message: "Reset data to default sample data successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reset failed";
    return apiError(message, 500);
  }
}
