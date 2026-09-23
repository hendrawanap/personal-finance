import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { getFallbackStore } from "@/lib/storage/serverStore";
import { profileFromRow, ProfileRow } from "@/types/supabase";
import { FinancialProfile } from "@/types/finance";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;
  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    return apiSuccess(store.profile);
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);

    if (error) throw error;
    if (data && data.length > 0) {
      return apiSuccess(profileFromRow(data[0] as ProfileRow));
    }

    return apiSuccess({
      name: user.name || "User",
      email: user.email || "",
      currencySymbol: "Rp",
      currencyCode: "IDR",
      monthlySavingsTarget: 3000,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch profile";
    return apiError(message, 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;
  const updates = (await request.json()) as Partial<FinancialProfile>;

  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    Object.assign(store.profile, updates);
    return apiSuccess(store.profile);
  }

  try {
    const userId = user.id;

    // Update user metadata in auth if name changed
    if (updates.name) {
      try {
        await supabase.auth.updateUser({
          data: { name: updates.name },
        });
      } catch {
        // Continue even if auth update fails
      }
    }

    const rowUpdates: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) rowUpdates.name = updates.name;
    if (updates.email !== undefined) rowUpdates.email = updates.email;
    if (updates.currencySymbol !== undefined) rowUpdates.currency_symbol = updates.currencySymbol;
    if (updates.currencyCode !== undefined) rowUpdates.currency_code = updates.currencyCode;
    if (updates.monthlySavingsTarget !== undefined) {
      rowUpdates.monthly_savings_target = updates.monthlySavingsTarget;
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (existing && existing.length > 0) {
      const { data, error } = await supabase
        .from("profiles")
        .update(rowUpdates)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw error;
      return apiSuccess(profileFromRow(data as ProfileRow));
    } else {
      const { data, error } = await supabase
        .from("profiles")
        .insert(rowUpdates)
        .select()
        .single();
      if (error) throw error;
      return apiSuccess(profileFromRow(data as ProfileRow));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    return apiError(message, 500);
  }
}
