import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { apiSuccess } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    if (isSupabaseServerConfigured()) {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore remote signout error
        }
      }
    }

    const cookieStore = await cookies();
    cookieStore.delete("accessToken");
    cookieStore.delete("refreshToken");

    // Also clear any legacy sb-* cookies if present
    const allCookies = request.cookies.getAll();
    for (const c of allCookies) {
      if (c.name.startsWith("sb-")) {
        cookieStore.delete(c.name);
      }
    }

    return apiSuccess({ success: true, message: "Logged out successfully" });
  } catch {
    return apiSuccess({ success: true });
  }
}
