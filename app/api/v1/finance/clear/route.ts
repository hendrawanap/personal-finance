import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { setFallbackStore } from "@/lib/storage/serverStore";

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;

  if (isOffline || !supabase) {
    setFallbackStore(user.id, {
      accounts: [],
      transactions: [],
      budgets: [],
      splitBills: [],
      friends: [],
    });
    return apiSuccess({
      success: true,
      message: "Cleared all financial data.",
    });
  }

  try {
    const userId = user.id;

    // Delete user data
    await supabase.from("split_bills").delete().eq("user_id", userId);
    await supabase.from("transactions").delete().eq("user_id", userId);
    await supabase.from("budgets").delete().eq("user_id", userId);
    await supabase.from("accounts").delete().eq("user_id", userId);
    await supabase.from("friends").delete().eq("user_id", userId);

    return apiSuccess({
      success: true,
      message: "Cleared all financial data from cloud storage.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Clear failed";
    return apiError(message, 500);
  }
}
