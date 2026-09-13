import { logout } from "@/services/auth/auth.service";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async () => {
    try {
      await logout();
    } catch (err) {
      console.warn("Logout error:", err);
    }

    queryClient.clear();
    toast.success("Successfully signed out");
    router.replace("/login");
    router.refresh();
  };
}