import { logout } from "@/services/auth/auth.service";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return () => {
    logout();
    queryClient.clear();

    toast.success("Successfully signed out", {
      style: {
        background: "#1B2B21",
        color: "#F2ECDD",
        border: "1px solid #24382B",
      },
      iconTheme: { primary: "#E4574C", secondary: "#F2ECDD" },
    });

    router.push("/login");
  };
}