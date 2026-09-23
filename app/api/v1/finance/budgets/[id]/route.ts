import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { getFallbackStore } from "@/lib/storage/serverStore";
import { budgetFromRow, BudgetRow } from "@/types/supabase";
import { Budget } from "@/types/finance";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { id } = await context.params;
  const { user, supabase, isOffline } = auth;
  const updates = (await request.json()) as Partial<Budget>;

  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    const existing = store.budgets.find((b) => b.id === id);
    if (!existing) return apiError("Budget not found", 404);
    Object.assign(existing, updates);
    return apiSuccess(existing);
  }

  try {
    const rowUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.category !== undefined) rowUpdates.category = updates.category;
    if (updates.allocated !== undefined) rowUpdates.allocated = updates.allocated;
    if (updates.period !== undefined) rowUpdates.period = updates.period;
    if (updates.color !== undefined) rowUpdates.color = updates.color || null;

    const { data, error } = await supabase
      .from("budgets")
      .update(rowUpdates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return apiError("Budget not found or unauthorized", 404);

    return apiSuccess(budgetFromRow(data as BudgetRow));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update budget";
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
    store.budgets = store.budgets.filter((b) => b.id !== id);
    return apiSuccess({ deleted: true, id });
  }

  try {
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return apiSuccess({ deleted: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete budget";
    return apiError(message, 500);
  }
}
