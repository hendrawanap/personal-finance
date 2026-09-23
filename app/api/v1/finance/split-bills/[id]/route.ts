import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { getFallbackStore } from "@/lib/storage/serverStore";
import { SplitBill } from "@/types/finance";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { id } = await context.params;
  const { user, supabase, isOffline } = auth;
  const updates = (await request.json()) as Partial<SplitBill>;

  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    const existing = store.splitBills.find((b) => b.id === id);
    if (!existing) return apiError("Split bill not found", 404);
    Object.assign(existing, updates, { updatedAt: new Date().toISOString() });
    return apiSuccess(existing);
  }

  try {
    const rowUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) rowUpdates.title = updates.title;
    if (updates.date !== undefined) rowUpdates.date = updates.date;
    if (updates.category !== undefined) rowUpdates.category = updates.category;
    if (updates.totalAmount !== undefined) rowUpdates.total_amount = updates.totalAmount;
    if (updates.status !== undefined) rowUpdates.status = updates.status;
    if (updates.notes !== undefined) rowUpdates.notes = updates.notes || null;
    if (updates.tax !== undefined) rowUpdates.tax = updates.tax;
    if (updates.tip !== undefined) rowUpdates.tip = updates.tip;

    const { data, error } = await supabase
      .from("split_bills")
      .update(rowUpdates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return apiError("Split bill not found or unauthorized", 404);

    return apiSuccess(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update split bill";
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
    store.splitBills = store.splitBills.filter((b) => b.id !== id);
    return apiSuccess({ deleted: true, id });
  }

  try {
    // Delete child rows first if not ON DELETE CASCADE
    await supabase.from("split_bill_items").delete().eq("bill_id", id);
    await supabase.from("split_bill_participants").delete().eq("bill_id", id);

    const { error } = await supabase
      .from("split_bills")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return apiSuccess({ deleted: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete split bill";
    return apiError(message, 500);
  }
}
