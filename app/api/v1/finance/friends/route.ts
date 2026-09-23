import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { getFallbackStore } from "@/lib/storage/serverStore";
import { friendFromRow, friendToRow, FriendRow } from "@/types/supabase";
import { Friend } from "@/types/finance";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;
  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    return apiSuccess(store.friends);
  }

  try {
    const { data, error } = await supabase
      .from("friends")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const friends = ((data as FriendRow[]) || []).map(friendFromRow);
    return apiSuccess(friends);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch friends";
    return apiError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { user, supabase, isOffline } = auth;
  const friend = (await request.json()) as Friend;

  if (!friend || !friend.name || !friend.email) {
    return apiError("Missing required friend fields (name, email)", 400);
  }

  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    const existingIndex = store.friends.findIndex((f) => f.id === friend.id);
    if (existingIndex >= 0) {
      store.friends[existingIndex] = friend;
    } else {
      store.friends.unshift(friend);
    }
    return apiSuccess(friend);
  }

  try {
    const row = friendToRow(friend, user.id);
    const { data, error } = await supabase
      .from("friends")
      .upsert(row)
      .select()
      .single();

    if (error) throw error;
    const saved = data ? friendFromRow(data as FriendRow) : friend;
    return apiSuccess(saved);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to persist friend";
    return apiError(message, 500);
  }
}
