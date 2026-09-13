import { signUpWithSupabase, SignUpRequest, SignUpResponse } from "@/services/supabase/auth.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { authKeys } from "@/hooks/query/auth/profile";

const ERROR_MESSAGES: Record<string, string> = {
  "User already registered": "An account with this email address already exists.",
  "Password should be at least 6 characters.": "Password must be at least 6 characters long.",
};

function parseRegisterError(error: unknown): string | null {
  if (!error) return null;

  if (error instanceof Error) {
    return ERROR_MESSAGES[error.message] ?? error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = String((error as { message: unknown }).message);
    return ERROR_MESSAGES[msg] ?? msg;
  }

  return "An unexpected error occurred during registration. Please try again.";
}

export function useRegister(options?: {
  onSuccess?: (data: SignUpResponse) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: SignUpRequest) => signUpWithSupabase(payload),
    onSuccess: (data) => {
      if (data.needsEmailConfirmation) {
        toast.success("Account created! Please check your email to verify your account.");
      } else {
        toast.success(`Account created! Welcome, ${data.user?.name || "User"}`);
        queryClient.invalidateQueries({ queryKey: authKeys.all });
        router.push("/dashboard");
      }
      options?.onSuccess?.(data);
    },
  });

  return {
    ...mutation,
    errorMessage: parseRegisterError(mutation.error),
  };
}
