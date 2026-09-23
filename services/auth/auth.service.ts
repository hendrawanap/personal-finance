import {
  AdminLoginData,
  AdminLoginRequest,
  ApiEnvelope,
  AuthUser,
  SignUpRequest,
  SignUpResponse,
} from "@/types/auth/auth";
import { deleteCookie, setCookie } from "cookies-next";
import { AuthProfile } from "@/types/auth/profile";
import { Permission, PERMISSIONS } from "@/types/auth/permission.type";
import { readFinanceDataFromLocalStorage } from "@/lib/storage/financeStorage";
import { axiosPrivate, axiosPublic } from "@/lib/instance";
import { v } from "@/lib/apiVersion";
import { useFinanceStore } from "@/store/useFinanceStore";

export const AUTH_STORAGE_KEY = "finance_auth_user";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

/**
 * Login handler via Next.js BFF (/api/v1/auth/login)
 */
export async function adminLogin(
  payload: AdminLoginRequest,
): Promise<AdminLoginData> {
  try {
    const res = await axiosPublic.post<ApiEnvelope<AdminLoginData>>(
      v("auth", "/login"),
      payload,
    );

    const data = res.data?.data;
    if (!data) {
      throw new Error("Invalid response from server");
    }

    setCookie("accessToken", data.accessToken, { path: "/" });
    setCookie("refreshToken", data.refreshToken, { path: "/" });

    if (isBrowser()) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
    }

    // Synchronize user's private financial data
    void useFinanceStore.getState().syncFromSupabase();

    return data;
  } catch (err) {
    // If backend is down or in offline mode, fallback to local storage
    if (isBrowser() && window.location.hostname === "localhost") {
      const financeData = readFinanceDataFromLocalStorage();
      const userName = payload.identifier.split("@")[0] || financeData.profile.name || "User";
      const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);

      const user: AuthUser = {
        id: "usr-local-1",
        email: payload.identifier,
        name: formattedName,
        roles: ["admin", "superadmin"],
        permissions: ALL_PERMISSIONS,
      };

      const data: AdminLoginData = {
        accessToken: "local-storage-access-token",
        refreshToken: "local-storage-refresh-token",
        user,
      };

      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      setCookie("accessToken", data.accessToken, { path: "/" });
      setCookie("refreshToken", data.refreshToken, { path: "/" });
      return data;
    }
    throw err;
  }
}

/**
 * Register a new user via Next.js BFF (/api/v1/auth/register)
 */
export async function signUp(
  payload: SignUpRequest,
): Promise<SignUpResponse> {
  const res = await axiosPublic.post<ApiEnvelope<SignUpResponse>>(
    v("auth", "/register"),
    payload,
  );

  const data = res.data?.data;
  if (!data) {
    throw new Error("Invalid response from server");
  }

  if (data.accessToken) {
    setCookie("accessToken", data.accessToken, { path: "/" });
  }
  if (data.refreshToken) {
    setCookie("refreshToken", data.refreshToken, { path: "/" });
  }

  if (data.user && isBrowser()) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
  }

  return data;
}

/**
 * Retrieve user profile via Next.js BFF (/api/v1/auth/me)
 */
export async function getProfile(): Promise<AuthProfile> {
  try {
    const res = await axiosPrivate.get<ApiEnvelope<AuthProfile>>(
      v("auth", "/me"),
    );

    if (res.data?.data) {
      if (isBrowser()) {
        window.localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify(res.data.data),
        );
      }
      return res.data.data;
    }
  } catch {
    // Continue to local storage fallback
  }

  if (isBrowser()) {
    try {
      const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          id: parsed.id ?? "usr-local-1",
          name: parsed.name ?? "User",
          email: parsed.email ?? "user@finance.io",
          roles: parsed.roles ?? ["admin"],
          permissions: (parsed.permissions as Permission[]) ?? ALL_PERMISSIONS,
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
    name: financeData.profile.name || "User",
    email: financeData.profile.email || "user@finance.io",
    roles: ["admin"],
    permissions: ALL_PERMISSIONS,
    propertyScope: { kind: "all" },
  };
}

/**
 * Logout and clear session via Next.js BFF (/api/v1/auth/logout)
 */
export async function logout(): Promise<void> {
  try {
    await axiosPrivate.post(v("auth", "/logout"));
  } catch (err) {
    console.warn("Logout BFF call failed:", err);
  }

  deleteCookie("accessToken", { path: "/" });
  deleteCookie("refreshToken", { path: "/" });

  if (isBrowser()) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem("personal_finance_storage_v1");
  }

  // Purge store so no data leaks to subsequent user
  useFinanceStore.getState().clearAll();
}