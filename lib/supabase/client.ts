import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("your-project") &&
      url.startsWith("http"),
  );
}

export function getSupabaseBrowserClient(): ReturnType<typeof createBrowserClient> | null {
  if (typeof window === "undefined") return null;
  if (!isSupabaseConfigured()) return null;

  if (!browserClient) {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const url = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "personal_finance";

    browserClient = createBrowserClient(url, key, {
      db: {
        schema,
      },
    });
  }

  return browserClient;
}
