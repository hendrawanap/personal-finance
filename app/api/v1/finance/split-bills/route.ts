import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { getFallbackStore } from "@/lib/storage/serverStore";
import {
  splitBillFromRow,
  splitBillToRow,
  SplitBillRow,
  SplitBillParticipantRow,
  SplitBillItemRow,
} from "@/types/supabase";
import { SplitBill } from "@/types/finance";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;
  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    return apiSuccess(store.splitBills);
  }

  try {
    const userId = user.id;
    const { data: rawBills, error: billsErr } = await supabase
      .from("split_bills")
      .select("*")
      .order("date", { ascending: false });

    if (billsErr) throw billsErr;

    const bills = (rawBills as SplitBillRow[]) || [];
    const billIds = bills.map((b) => b.id);

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

    const currentUserContext = {
      id: userId,
      email: user.email || null,
      name: user.name || null,
    };

    const splitBills: SplitBill[] = bills.map((billRow) => {
      const parts = participantsByBill.get(billRow.id) || [];
      const its = itemsByBill.get(billRow.id) || [];
      return splitBillFromRow(billRow, parts, its, currentUserContext);
    });

    return apiSuccess(splitBills);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch split bills";
    return apiError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;
  const bill = (await request.json()) as SplitBill;

  if (!bill || !bill.title || bill.totalAmount === undefined) {
    return apiError("Missing required split bill fields", 400);
  }

  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    const existingIndex = store.splitBills.findIndex((b) => b.id === bill.id);
    if (existingIndex >= 0) {
      store.splitBills[existingIndex] = bill;
    } else {
      store.splitBills.unshift(bill);
    }
    return apiSuccess(bill);
  }

  try {
    const userId = user.id;
    const { bill: billRow, participants, items } = splitBillToRow(bill, userId);

    // 1. Upsert bill
    const { error: billErr } = await supabase.from("split_bills").upsert(billRow);
    if (billErr) throw billErr;

    // 2. Synchronize participants: remove deleted ones, then upsert current
    if (participants.length > 0) {
      const currentPartIds = participants.map((p) => p.id);
      await supabase
        .from("split_bill_participants")
        .delete()
        .eq("bill_id", bill.id)
        .not("id", "in", `(${currentPartIds.map((id) => `"${id}"`).join(",")})`);

      const { error: partErr } = await supabase
        .from("split_bill_participants")
        .upsert(participants);
      if (partErr) throw partErr;
    } else {
      await supabase
        .from("split_bill_participants")
        .delete()
        .eq("bill_id", bill.id);
    }

    // 3. Synchronize items: remove deleted ones, then upsert current
    if (items.length > 0) {
      const currentItemIds = items.map((it) => it.id);
      await supabase
        .from("split_bill_items")
        .delete()
        .eq("bill_id", bill.id)
        .not("id", "in", `(${currentItemIds.map((id) => `"${id}"`).join(",")})`);

      const { error: itemErr } = await supabase
        .from("split_bill_items")
        .upsert(items);
      if (itemErr) throw itemErr;
    } else {
      await supabase.from("split_bill_items").delete().eq("bill_id", bill.id);
    }

    return apiSuccess(bill);
  } catch (err: unknown) {
    console.error("Failed to persist split bill:", err);
    const message = err instanceof Error ? err.message : "Failed to persist split bill";
    return apiError(message, 500);
  }
}
