import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { getFallbackStore } from "@/lib/storage/serverStore";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return apiUnauthorized();

  const { id: billId } = await context.params;
  const { user, supabase, isOffline } = auth;
  const body = (await request.json()) as {
    participantId: string;
    isPaid: boolean;
  };

  if (!body || !body.participantId) {
    return apiError("Missing participantId", 400);
  }

  const { participantId, isPaid } = body;

  if (isOffline || !supabase) {
    const store = getFallbackStore(user.id);
    const bill = store.splitBills.find((b) => b.id === billId);
    if (bill) {
      const part = bill.participants.find((p) => p.id === participantId);
      if (part) {
        part.status = isPaid ? "paid" : "unpaid";
        part.settledAt = isPaid ? new Date().toISOString() : undefined;
      }
    }
    return apiSuccess({ success: true, billId, participantId, isPaid });
  }

  try {
    // 1. Verify authorization: caller must be bill owner or the participant being settled
    const [billRes, partRes] = await Promise.all([
      supabase.from("split_bills").select("user_id").eq("id", billId).maybeSingle(),
      supabase
        .from("split_bill_participants")
        .select("user_id, email")
        .eq("id", participantId)
        .eq("bill_id", billId)
        .maybeSingle(),
    ]);

    if (!billRes.data || !partRes.data) {
      return apiError("Split bill or participant not found", 404);
    }

    const isBillOwner = billRes.data.user_id === user.id;
    const isTargetParticipant = Boolean(
      (partRes.data.user_id && partRes.data.user_id === user.id) ||
        (user.email &&
          partRes.data.email &&
          partRes.data.email.trim().toLowerCase() === user.email.trim().toLowerCase()),
    );

    if (!isBillOwner && !isTargetParticipant) {
      return apiError("Unauthorized to update this settlement", 403);
    }

    const { error } = await supabase
      .from("split_bill_participants")
      .update({
        status: isPaid ? "paid" : "unpaid",
        settled_at: isPaid ? new Date().toISOString() : null,
      })
      .eq("bill_id", billId)
      .eq("id", participantId);

    if (error) throw error;

    return apiSuccess({ success: true, billId, participantId, isPaid });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update settlement";
    return apiError(message, 500);
  }
}
