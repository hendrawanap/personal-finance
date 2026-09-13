import { AdminLoginData, AdminLoginRequest } from "@/types/auth/auth";
import { deleteCookie, setCookie } from "cookies-next";
import { AuthProfile } from "@/types/auth/profile";
import { Permission } from "@/types/auth/permission.type";
import { readFinanceDataFromLocalStorage } from "@/lib/storage/financeStorage";

const AUTH_STORAGE_KEY = "finance_auth_user";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Login using local storage.
 * Works offline with zero backend dependencies.
 */
export async function adminLogin(
  payload: AdminLoginRequest,
): Promise<AdminLoginData> {
  const financeData = readFinanceDataFromLocalStorage();
  const userName = payload.identifier.split("@")[0] || financeData.profile.name || "User";
  const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);

  const user = {
    id: "usr-local-1",
    email: payload.identifier,
    name: formattedName,
    roles: ["admin", "superadmin"],
    permissions: [
      "users:read",
      "users:write",
      "users:invite",
      "roles:read",
      "roles:write",
      "accounts:read",
      "accounts:write",
      "transactions:read",
      "transactions:write",
      "budgets:read",
      "budgets:write",
    ] as Permission[],
  };

  const data: AdminLoginData = {
    accessToken: "local-storage-access-token",
    refreshToken: "local-storage-refresh-token",
    user,
  };

  if (isBrowser()) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }

  // Set cookies for Next.js proxy/middleware compatibility
  setCookie("accessToken", data.accessToken);
  setCookie("refreshToken", data.refreshToken);

  return data;
}

export async function getProfile(): Promise<AuthProfile> {
  if (isBrowser()) {
    try {
      const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          id: parsed.id ?? "usr-local-1",
          name: parsed.name ?? "Alex Morgan",
          email: parsed.email ?? "alex.morgan@finance.io",
          roles: parsed.roles ?? ["admin"],
          permissions: (parsed.permissions as Permission[]) ?? [],
          propertyScope: { kind: "all" },
        };
      }
    } catch {
      // Fallback below
    }
  }

  const financeData = readFinanceDataFromLocalStorage();
  return {
    id: "usr-local-1",
    name: financeData.profile.name || "Alex Morgan",
    email: financeData.profile.email || "alex.morgan@finance.io",
    roles: ["admin"],
    permissions: [],
    propertyScope: { kind: "all" },
  };
}

export function logout(): void {
  deleteCookie("accessToken");
  deleteCookie("refreshToken");
  if (isBrowser()) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}