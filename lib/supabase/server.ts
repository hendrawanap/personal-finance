import { NextRequest } from "next/server";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./client";

export interface ServerAuthResult {
  user: {
    id: string;
    email?: string;
    name?: string;
  };
  supabase: SupabaseClient<any, any, any> | null;
  isOffline: boolean;
}

export function getSupabaseServerClient(
  token?: string,
): SupabaseClient<any, any, any> | null {
  if (!isSupabaseConfigured()) return null;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const url = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  // Use service role key if available for server-side admin queries, otherwise anon key
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "personal_finance";

  const client = createClient<any, any>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    db: {
      schema: schema as any,
    },
  });

  return client;
}

/**
 * Extract auth token from Next.js request (Authorization header or cookies)
 */
export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  // Check accessToken cookie
  const accessToken = request.cookies.get("accessToken")?.value?.trim();
  if (accessToken && accessToken !== "deleted") {
    return accessToken;
  }

  // Check Supabase chunked session cookies
  const allCookies = request.cookies.getAll();
  const sbAuthCookie = allCookies.find(
    (c) =>
      c.name.startsWith("sb-") &&
      (c.name.endsWith("-auth-token") || /-auth-token\.\d+$/.test(c.name)) &&
      c.value &&
      c.value !== "deleted",
  );

  if (sbAuthCookie) {
    try {
      const parsed = JSON.parse(sbAuthCookie.value);
      if (Array.isArray(parsed) && typeof parsed[0] === "string") {
        return parsed[0];
      }
      if (typeof parsed === "object" && parsed?.access_token) {
        return parsed.access_token;
      }
    } catch {
      // Ignore parse failure
    }
  }

  return null;
}

/**
 * Authenticate incoming request and return the user and server-side Supabase client.
 */
export async function getAuthenticatedUser(
  request: NextRequest,
): Promise<ServerAuthResult | null> {
  const token = extractTokenFromRequest(request);

  // Offline / local mock fallback mode
  if (!isSupabaseConfigured() || token === "local-storage-access-token") {
    return {
      user: {
        id: "usr-local-1",
        email: "user@finance.io",
        name: "User",
      },
      supabase: null,
      isOffline: true,
    };
  }

  if (!token) {
    return null;
  }

  const supabase = getSupabaseServerClient(token);
  if (!supabase) {
    return null;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: (user.user_metadata?.name as string) || user.email?.split("@")[0] || "User",
      },
      supabase,
      isOffline: false,
    };
  } catch (err) {
    console.error("Server auth verification failed:", err);
    return null;
  }
}
