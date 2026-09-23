import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { getFallbackStore } from "@/lib/storage/serverStore";
import { transactionFromRow, transactionToRow, TransactionRow } from "@/types/supabase";
import { Transaction } from "@/types/finance";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;
  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    return apiSuccess(store.transactions);
  }

  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) throw error;
    const transactions = ((data as TransactionRow[]) || []).map(transactionFromRow);
    return apiSuccess(transactions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch transactions";
    return apiError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;
  const tx = (await request.json()) as Transaction;

  if (!tx || !tx.description || tx.amount === undefined || !tx.type) {
    return apiError("Missing required transaction fields", 400);
  }

  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    const existingIndex = store.transactions.findIndex((t) => t.id === tx.id);
    if (existingIndex >= 0) {
      store.transactions[existingIndex] = tx;
    } else {
      store.transactions.unshift(tx);
    }
    return apiSuccess(tx);
  }

  try {
    const row = transactionToRow(tx, user.id);
    const { data, error } = await supabase
      .from("transactions")
      .upsert(row)
      .select()
      .single();

    if (error) throw error;
    const saved = data ? transactionFromRow(data as TransactionRow) : tx;
    return apiSuccess(saved);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to persist transaction";
    return apiError(message, 500);
  }
}
