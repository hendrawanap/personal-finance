import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q")?.trim() || "";

  if (!query) {
    return apiSuccess([]);
  }

  const { user, supabase, isOffline } = auth;

  if (isOffline || !supabase) {
    // Return empty or sample search in offline mode
    const mockUsers = [
      { id: "mock-1", userId: "usr-demo-2", name: "Sarah Jenkins", email: "sarah@finance.io" },
      { id: "mock-2", userId: "usr-demo-3", name: "David Kim", email: "david@finance.io" },
    ].filter(
      (u) =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase()),
    );
    return apiSuccess(mockUsers);
  }

  try {
    const currentUserId = user.id;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, name, email")
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.warn("User search error in Supabase:", error);
      return apiSuccess([]);
    }

    const userRows =
      (data as Array<{
        id: string;
        user_id?: string | null;
        name?: string | null;
        email?: string | null;
      }>) || [];

    const results = userRows
      .filter((u) => Boolean(u.user_id && u.user_id !== currentUserId))
      .map((u) => ({
        id: u.id,
        userId: u.user_id as string,
        name: u.name || "User",
        email: u.email || "",
      }));

    return apiSuccess(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Search failed";
    return apiError(message, 500);
  }
}
