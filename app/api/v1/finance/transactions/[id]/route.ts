import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { getFallbackStore } from "@/lib/storage/serverStore";
import { transactionFromRow, TransactionRow } from "@/types/supabase";
import { Transaction } from "@/types/finance";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { id } = await context.params;
  const { user, supabase, isOffline } = auth;
  const updates = (await request.json()) as Partial<Transaction>;

  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    const existing = store.transactions.find((t) => t.id === id);
    if (!existing) return apiError("Transaction not found", 404);
    Object.assign(existing, updates);
    return apiSuccess(existing);
  }

  try {
    const rowUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.date !== undefined) rowUpdates.date = updates.date;
    if (updates.description !== undefined) rowUpdates.description = updates.description;
    if (updates.category !== undefined) rowUpdates.category = updates.category;
    if (updates.accountId !== undefined) rowUpdates.account_id = updates.accountId || null;
    if (updates.amount !== undefined) rowUpdates.amount = updates.amount;
    if (updates.type !== undefined) rowUpdates.type = updates.type;
    if (updates.status !== undefined) rowUpdates.status = updates.status;
    if (updates.notes !== undefined) rowUpdates.notes = updates.notes || null;

    const { data, error } = await supabase
      .from("transactions")
      .update(rowUpdates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return apiError("Transaction not found or unauthorized", 404);

    return apiSuccess(transactionFromRow(data as TransactionRow));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update transaction";
    return apiError(message, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { id } = await context.params;
  const { user, supabase, isOffline } = auth;

  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    store.transactions = store.transactions.filter((t) => t.id !== id);
    return apiSuccess({ deleted: true, id });
  }

  try {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return apiSuccess({ deleted: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete transaction";
    return apiError(message, 500);
  }
}
