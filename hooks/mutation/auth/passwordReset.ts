import { useMutation, useQuery } from "@tanstack/react-query";

import { extractApiError } from "@/lib/apiError";
import { requestPasswordReset, resendPasswordReset, validateResetToken, confirmPasswordReset } from "@/services/auth/passwordReset";
import { MessageResponse, RequestPasswordResetPayload, ValidateResetTokenResponse, ResetPasswordPayload } from "@/types/auth/passwordReset";

export const passwordResetKeys = {
  all: ["auth", "password-reset"] as const,
  validate: (token: string) =>
    [...passwordResetKeys.all, "validate", token] as const,
};

export function useRequestPasswordReset(options?: {
  onSuccess?: (data: MessageResponse) => void;
  onError?: (message: string) => void;
}) {
  return useMutation({
    mutationFn: (payload: RequestPasswordResetPayload) =>
      requestPasswordReset(payload),
    onSuccess: (data) => options?.onSuccess?.(data),
    onError: (error) => {
      options?.onError?.(
        extractApiError(error, "Could not send the reset link"),
      );
    },
  });
}

export function useResendPasswordReset(options?: {
  onSuccess?: (data: MessageResponse) => void;
  onError?: (message: string) => void;
}) {
  return useMutation({
    mutationFn: (payload: RequestPasswordResetPayload) =>
      resendPasswordReset(payload),
    onSuccess: (data) => options?.onSuccess?.(data),
    onError: (error) => {
      options?.onError?.(
        extractApiError(error, "Could not resend the reset link"),
      );
    },
  });
}

export function useValidateResetToken(token: string | null) {
  return useQuery<ValidateResetTokenResponse>({
    queryKey: passwordResetKeys.validate(token ?? ""),
    queryFn: () => validateResetToken(token!),
    enabled: Boolean(token),
    // Token kedaluwarsa adalah jawaban final, bukan kegagalan sementara.
    // Retry hanya menahan user beberapa detik sebelum melihat pesan yang sama.
    retry: false,
    // Hasilnya bisa berubah kapan saja (link dipakai di tab lain, user minta
    // link baru), jadi jangan pakai cache basi saat halaman dibuka ulang.
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useConfirmPasswordReset(options?: {
  onSuccess?: (data: MessageResponse) => void;
  onError?: (message: string) => void;
}) {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) =>
      confirmPasswordReset(payload),
    onSuccess: (data) => options?.onSuccess?.(data),
    onError: (error) => {
      options?.onError?.(
        extractApiError(error, "Could not save your password"),
      );
    },
  });
}