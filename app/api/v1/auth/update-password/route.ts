import { NextRequest } from "next/server";
import { getAuthenticatedUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const { password } = body || {};

    if (!password) {
      return apiError("New password is required", 400);
    }

    const { user, supabase, isOffline } = auth;
    if (isOffline || !supabase) {
      return apiSuccess({ message: "Password updated successfully (demo mode)." });
    }

    const serverClient = getSupabaseServerClient();
    if (!serverClient) {
      return apiError("Database service unavailable", 500);
    }

    const { error } = await serverClient.auth.admin.updateUserById(user.id, {
      password,
    });

    if (error) {
      return apiError(error.message, 400);
    }

    return apiSuccess({ message: "Password updated successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Password update failed";
    return apiError(message, 500);
  }
}
