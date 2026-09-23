import { NextRequest } from "next/server";
import { getSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body || {};

    if (!email) {
      return apiError("Email is required", 400);
    }

    if (!isSupabaseServerConfigured()) {
      return apiSuccess({ message: "Demo mode: password reset instructions simulated." });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return apiError("Database service unavailable", 500);
    }

    const origin = request.nextUrl.origin || "http://localhost:3000";
    const redirectTo = `${origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return apiError(error.message, 400);
    }

    return apiSuccess({ message: "Reset password instructions sent to your email." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Password reset request failed";
    return apiError(message, 500);
  }
}
