import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { AdminLoginData, AuthUser } from "@/types/auth/auth";
import { PERMISSIONS } from "@/types/auth/permission.type";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body || {};

    if (!identifier || !password) {
      return apiError("Email and password are required", 400);
    }

    if (!isSupabaseServerConfigured()) {
      // Mock / offline fallback
      const user: AuthUser = {
        id: "usr-local-1",
        email: identifier,
        name: identifier.split("@")[0] || "User",
        roles: ["admin", "superadmin"],
        permissions: [...PERMISSIONS],
      };
      const cookieStore = await cookies();
      cookieStore.set("accessToken", "local-storage-access-token", { path: "/" });
      cookieStore.set("refreshToken", "local-storage-refresh-token", { path: "/" });

      const loginData: AdminLoginData = {
        accessToken: "local-storage-access-token",
        refreshToken: "local-storage-refresh-token",
        user,
      };
      return apiSuccess(loginData, "Logged in successfully");
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return apiError("Database service unavailable", 500);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });

    if (error || !data.user || !data.session) {
      return apiError(error?.message || "Invalid login credentials", 401);
    }

    const user = data.user;
    const session = data.session;

    // Fetch user name from profiles or metadata
    let userName = (user.user_metadata?.name as string) || user.email?.split("@")[0] || "User";
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user.id)
        .limit(1);

      if (profiles && profiles.length > 0 && profiles[0].name) {
        userName = profiles[0].name;
      } else {
        await supabase.from("profiles").upsert({
          user_id: user.id,
          name: userName,
          email: user.email,
          currency_symbol: "Rp",
          currency_code: "IDR",
          monthly_savings_target: 3000,
        });
      }
    } catch (profileErr) {
      console.warn("Profile fetch/upsert notice:", profileErr);
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email || identifier,
      name: userName,
      roles: ["admin", "superadmin"],
      permissions: [...PERMISSIONS],
    };

    // Set auth cookies on response
    const cookieStore = await cookies();
    cookieStore.set("accessToken", session.access_token, {
      path: "/",
      maxAge: session.expires_in || 3600 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    cookieStore.set("refreshToken", session.refresh_token, {
      path: "/",
      maxAge: 3600 * 24 * 30,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    const loginData: AdminLoginData = {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user: authUser,
    };

    return apiSuccess(loginData, "Logged in successfully");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sign in failed";
    return apiError(message, 500);
  }
}
