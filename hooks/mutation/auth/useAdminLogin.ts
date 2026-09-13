import { adminLogin } from "@/services/auth/auth.service";
import { ApiErrorResponse } from "@/types/auth/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { authKeys } from "@/hooks/query/auth/profile";

const ERROR_MESSAGES: Record<string, string> = {
  "Invalid credentials": "Invalid email or password. Please try again.",
  "Invalid login credentials": "Invalid email or password. Please try again.",
  "Account not verified": "Your account has not been verified yet.",
  "Email not confirmed": "Please verify your email address before signing in.",
};

function parseLoginError(error: unknown): string | null {
  if (!error) return null;

  if (isAxiosError<ApiErrorResponse>(error)) {
    const apiMessage = error.response?.data?.errors?.[0]?.message;
    return (
      (apiMessage && ERROR_MESSAGES[apiMessage]) ??
      apiMessage ??
      "Sign in failed. Please check your credentials."
    );
  }

  if (error instanceof Error) {
    return ERROR_MESSAGES[error.message] ?? error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = String((error as { message: unknown }).message);
    return ERROR_MESSAGES[msg] ?? msg;
  }

  return "An unexpected error occurred during sign in. Please try again.";
}

export function useAdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: adminLogin,
    onSuccess: (data) => {
      toast.success(`Welcome, ${data.user.name}`);
      queryClient.invalidateQueries({ queryKey: authKeys.all });

      const redirect = searchParams.get("redirect");
      // Guard: only accept safe internal path
      const target =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//")
          ? redirect
          : "/dashboard";

      router.push(target);
    },
  });

  return {
    ...mutation,
    errorMessage: parseLoginError(mutation.error),
  };
}