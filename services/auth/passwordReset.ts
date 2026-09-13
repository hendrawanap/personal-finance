import { axiosPublic } from "@/lib/instance";
import { v } from "@/lib/apiVersion";
import { RequestPasswordResetPayload, MessageResponse, ValidateResetTokenResponse, ResetPasswordPayload } from "@/types/auth/passwordReset";

export async function requestPasswordReset(
  payload: RequestPasswordResetPayload,
) {
  const res = await axiosPublic.post<{ data: MessageResponse }>(
    v("auth", "/password-reset/request"),
    payload,
  );

  return res.data.data;
}

export async function resendPasswordReset(
  payload: RequestPasswordResetPayload,
) {
  const res = await axiosPublic.post<{ data: MessageResponse }>(
    v("auth", "/password-reset/resend"),
    payload,
  );

  return res.data.data;
}

export async function validateResetToken(token: string) {
  const res = await axiosPublic.get<{ data: ValidateResetTokenResponse }>(
    v("auth", "/password-reset/validate"),
    { params: { token } },
  );

  return res.data.data;
}

export async function confirmPasswordReset(payload: ResetPasswordPayload) {
  const res = await axiosPublic.post<{ data: MessageResponse }>(
    v("auth", "/password-reset/confirm"),
    payload,
  );

  return res.data.data;
}