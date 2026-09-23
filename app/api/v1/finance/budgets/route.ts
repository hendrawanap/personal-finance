import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { getFallbackStore } from "@/lib/storage/serverStore";
import { budgetFromRow, budgetToRow, BudgetRow } from "@/types/supabase";
import { Budget } from "@/types/finance";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;
  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    return apiSuccess(store.budgets);
  }

  try {
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id);

    if (error) throw error;
    const budgets = ((data as BudgetRow[]) || []).map(budgetFromRow);
    return apiSuccess(budgets);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch budgets";
    return apiError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;
  const budget = (await request.json()) as Budget;

  if (!budget || !budget.category || budget.allocated === undefined) {
    return apiError("Missing required budget fields", 400);
  }

  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    const existingIndex = store.budgets.findIndex((b) => b.id === budget.id);
    if (existingIndex >= 0) {
      store.budgets[existingIndex] = budget;
    } else {
      store.budgets.push(budget);
    }
    return apiSuccess(budget);
  }

  try {
    const row = budgetToRow(budget, user.id);
    const { data, error } = await supabase
      .from("budgets")
      .upsert(row)
      .select()
      .single();

    if (error) throw error;
    const saved = data ? budgetFromRow(data as BudgetRow) : budget;
    return apiSuccess(saved);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to persist budget";
    return apiError(message, 500);
  }
}
