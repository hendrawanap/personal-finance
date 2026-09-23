/**
 * Client-Side Supabase Adapter
 * All Supabase operations are now proxied through Next.js BFF (/api/v1/auth/* and /api/v1/finance/*).
 * Direct browser connections to Supabase have been completely eliminated.
 */

export function isSupabaseConfigured(): boolean {
  if (typeof window === "undefined") {
    return Boolean(process.env.SUPABASE_URL);
  }
  // In the browser, the Next.js BFF acts as the cloud backend
  return true;
}

export function getSupabaseBrowserClient(): null {
  return null;
}
