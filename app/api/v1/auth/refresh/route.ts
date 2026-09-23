import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let refreshToken = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      refreshToken = authHeader.substring(7).trim();
    }
    if (!refreshToken) {
      refreshToken = request.cookies.get("refreshToken")?.value?.trim() || "";
    }

    if (!refreshToken) {
      return apiUnauthorized("No refresh token provided");
    }

    if (!isSupabaseServerConfigured()) {
      return apiSuccess({
        accessToken: "local-storage-access-token",
        refreshToken: "local-storage-refresh-token",
      });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return apiError("Database service unavailable", 500);
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return apiUnauthorized("Failed to refresh session");
    }

    const cookieStore = await cookies();
    cookieStore.set("accessToken", data.session.access_token, {
      path: "/",
      maxAge: data.session.expires_in || 3600 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    cookieStore.set("refreshToken", data.session.refresh_token, {
      path: "/",
      maxAge: 3600 * 24 * 30,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return apiSuccess({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Refresh token failed";
    return apiError(message, 500);
  }
}
