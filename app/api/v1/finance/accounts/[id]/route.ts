import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { getFallbackStore } from "@/lib/storage/serverStore";
import { accountFromRow, AccountRow } from "@/types/supabase";
import { Account } from "@/types/finance";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { id } = await context.params;
  const { user, supabase, isOffline } = auth;
  const updates = (await request.json()) as Partial<Account>;

  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    const existing = store.accounts.find((a) => a.id === id);
    if (!existing) return apiError("Account not found", 404);
    Object.assign(existing, updates, { updatedAt: new Date().toISOString() });
    return apiSuccess(existing);
  }

  try {
    const rowUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) rowUpdates.name = updates.name;
    if (updates.institution !== undefined) rowUpdates.institution = updates.institution;
    if (updates.type !== undefined) rowUpdates.type = updates.type;
    if (updates.accountNumber !== undefined) rowUpdates.account_number = updates.accountNumber;
    if (updates.balance !== undefined) rowUpdates.balance = updates.balance;
    if (updates.currency !== undefined) rowUpdates.currency = updates.currency;
    if (updates.accent !== undefined) rowUpdates.accent = updates.accent;

    const { data, error } = await supabase
      .from("accounts")
      .update(rowUpdates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return apiError("Account not found or unauthorized", 404);

    return apiSuccess(accountFromRow(data as AccountRow));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update account";
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
    store.accounts = store.accounts.filter((a) => a.id !== id);
    store.transactions = store.transactions.filter((tx) => tx.accountId !== id);
    return apiSuccess({ deleted: true, id });
  }

  try {
    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return apiSuccess({ deleted: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete account";
    return apiError(message, 500);
  }
}
