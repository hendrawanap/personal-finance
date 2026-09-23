import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { getFallbackStore } from "@/lib/storage/serverStore";
import { accountFromRow, accountToRow, AccountRow } from "@/types/supabase";
import { Account } from "@/types/finance";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;
  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    return apiSuccess(store.accounts);
  }

  try {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const accounts = ((data as AccountRow[]) || []).map(accountFromRow);
    return apiSuccess(accounts);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch accounts";
    return apiError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;
  const account = (await request.json()) as Account;

  if (!account || !account.name || !account.type) {
    return apiError("Missing required account fields", 400);
  }

  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    const existingIndex = store.accounts.findIndex((a) => a.id === account.id);
    if (existingIndex >= 0) {
      store.accounts[existingIndex] = account;
    } else {
      store.accounts.unshift(account);
    }
    return apiSuccess(account);
  }

  try {
    const row = accountToRow(account, user.id);
    const { data, error } = await supabase
      .from("accounts")
      .upsert(row)
      .select()
      .single();

    if (error) throw error;
    const saved = data ? accountFromRow(data as AccountRow) : account;
    return apiSuccess(saved);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to persist account";
    return apiError(message, 500);
  }
}
