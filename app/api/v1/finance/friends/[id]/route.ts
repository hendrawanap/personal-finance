import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { getFallbackStore } from "@/lib/storage/serverStore";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { id } = await context.params;
  const { user, supabase, isOffline } = auth;

  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    store.friends = store.friends.filter((f) => f.id !== id);
    return apiSuccess({ deleted: true, id });
  }

  try {
    const { error } = await supabase
      .from("friends")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return apiSuccess({ deleted: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete friend";
    return apiError(message, 500);
  }
}
