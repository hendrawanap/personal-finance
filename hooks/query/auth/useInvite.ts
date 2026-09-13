import { useMutation, useQuery } from "@tanstack/react-query";

import { extractApiError } from "@/lib/apiError";
import { acceptInvite, verifyInvite } from "@/services/auth/invite";
import type {
  AcceptInvitePayload,
  AcceptInviteResponse,
} from "@/types/auth/invite";

export const inviteKeys = {
  all: ["auth", "invite"] as const,
  verify: (token: string) => [...inviteKeys.all, "verify", token] as const,
};

export function useVerifyInvite(token: string | null) {
  return useQuery({
    queryKey: inviteKeys.verify(token ?? ""),
    queryFn: () => verifyInvite(token!),
    enabled: Boolean(token),
    // Token kedaluwarsa adalah jawaban yang final, bukan kegagalan sementara.
    // Retry hanya menahan user tiga detik lebih lama sebelum melihat pesan
    // yang sama.
    retry: false,
    // Hasilnya bisa berubah kapan saja (token dipakai di tab lain, admin
    // resend), jadi jangan pakai cache basi saat halaman dibuka ulang.
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useAcceptInvite(options?: {
  onSuccess?: (data: AcceptInviteResponse) => void;
  onError?: (message: string) => void;
}) {
  return useMutation({
    mutationFn: (payload: AcceptInvitePayload) => acceptInvite(payload),
    onSuccess: (data) => options?.onSuccess?.(data),
    onError: (error) => {
      options?.onError?.(
        extractApiError(error, "Could not save your password"),
      );
    },
  });
}