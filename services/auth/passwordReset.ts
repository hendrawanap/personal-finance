import { axiosPrivate, axiosPublic } from "@/lib/instance";
import { v } from "@/lib/apiVersion";
import { ApiEnvelope } from "@/types/auth/auth";
import {
  RequestPasswordResetPayload,
  MessageResponse,
  ValidateResetTokenResponse,
  ResetPasswordPayload,
} from "@/types/auth/passwordReset";

export async function requestPasswordReset(
  payload: RequestPasswordResetPayload,
): Promise<MessageResponse> {
  const res = await axiosPublic.post<ApiEnvelope<MessageResponse>>(
    v("auth", "/reset-password"),
    payload,
  );
  return res.data?.data || { message: "Reset password instructions sent to your email." };
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

export async function updatePassword(
  password: string,
): Promise<MessageResponse> {
  const res = await axiosPrivate.post<ApiEnvelope<MessageResponse>>(
    v("auth", "/update-password"),
    { password },
  );
  return res.data?.data || { message: "Password updated successfully." };
}

export async function confirmPasswordReset(
  payload: ResetPasswordPayload,
): Promise<MessageResponse> {
  const res = await axiosPrivate.post<ApiEnvelope<MessageResponse>>(
    v("auth", "/update-password"),
    payload,
  );
  return res.data?.data || { message: "Password updated successfully." };
}