import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  requestSupabasePasswordReset,
  updateSupabasePassword,
} from "@/services/supabase/auth.service";
import {
  RequestPasswordResetPayload,
  MessageResponse,
  ValidateResetTokenResponse,
  ResetPasswordPayload,
} from "@/types/auth/passwordReset";

export async function requestPasswordReset(
  payload: RequestPasswordResetPayload,
): Promise<MessageResponse> {
  if (isSupabaseConfigured()) {
    await requestSupabasePasswordReset(payload.email);
    return { message: "Reset password instructions sent to your email." };
  }

  return { message: "Demo mode: password reset simulated." };
}

export async function resendPasswordReset(
  payload: RequestPasswordResetPayload,
): Promise<MessageResponse> {
  return requestPasswordReset(payload);
}

export async function validateResetToken(
  token: string,
): Promise<ValidateResetTokenResponse> {
  const hasHash =
    typeof window !== "undefined" && window.location.hash.includes("access_token");

  if (!token && !hasHash) {
    throw new Error("Invalid or missing password reset link.");
  }

  return {
    valid: true,
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  };
}

export async function confirmPasswordReset(
  payload: ResetPasswordPayload,
): Promise<MessageResponse> {
  if (isSupabaseConfigured()) {
    await updateSupabasePassword(payload.password);
    return { message: "Password updated successfully." };
  }

  return { message: "Demo mode: password successfully reset." };
}