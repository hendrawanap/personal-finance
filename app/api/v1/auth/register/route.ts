import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { AuthUser } from "@/types/auth/auth";
import { PERMISSIONS } from "@/types/auth/permission.type";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body || {};

    if (!email || !password || !name) {
      return apiError("Name, email, and password are required", 400);
    }

    if (!isSupabaseServerConfigured()) {
      const user: AuthUser = {
        id: "usr-local-1",
        email,
        name: name.trim(),
        roles: ["admin"],
        permissions: [...PERMISSIONS],
      };
      return apiSuccess({ user, needsEmailConfirmation: false });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return apiError("Database service unavailable", 500);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name.trim(),
        },
      },
    });

    if (error) {
      return apiError(error.message, 400);
    }

    const user = data.user;
    const session = data.session;

    if (session && user) {
      const authUser: AuthUser = {
        id: user.id,
        email: user.email || email,
        name: name.trim() || user.email?.split("@")[0] || "User",
        roles: ["admin"],
        permissions: [...PERMISSIONS],
      };

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

      // Provision initial profile row
      try {
        await supabase.from("profiles").upsert({
          user_id: user.id,
          name: authUser.name,
          email: authUser.email,
          currency_symbol: "Rp",
          currency_code: "IDR",
          monthly_savings_target: 3000,
        });
      } catch (err) {
        console.warn("Could not auto-insert profile on signup:", err);
      }

      return apiSuccess({
        user: authUser,
        needsEmailConfirmation: false,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });
    }

    return apiSuccess({
      user: user
        ? {
            id: user.id,
            email: user.email || email,
            name: name.trim(),
            roles: ["admin"],
            permissions: [...PERMISSIONS],
          }
        : null,
      needsEmailConfirmation: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return apiError(message, 500);
  }
}
