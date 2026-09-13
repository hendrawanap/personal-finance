import { AdminLoginData, AdminLoginRequest } from "@/types/auth/auth";
import { deleteCookie, setCookie } from "cookies-next";
import { AuthProfile } from "@/types/auth/profile";
import { Permission, PERMISSIONS } from "@/types/auth/permission.type";
import { readFinanceDataFromLocalStorage } from "@/lib/storage/financeStorage";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  signInWithSupabase,
  signOutFromSupabase,
  getSupabaseProfile,
  AUTH_STORAGE_KEY,
} from "@/services/supabase/auth.service";
import { useFinanceStore } from "@/store/useFinanceStore";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

/**
 * Login handler. Uses Supabase Auth when configured,
 * otherwise falls back to local storage mock login.
 */
export async function adminLogin(
  payload: AdminLoginRequest,
): Promise<AdminLoginData> {
  if (isSupabaseConfigured()) {
    const result = await signInWithSupabase(payload);
    // Under strict isolation, synchronize only this user's private data
    void useFinanceStore.getState().syncFromSupabase();
    return result;
  }

  // Fallback offline / local login
  const financeData = readFinanceDataFromLocalStorage();
  const userName = payload.identifier.split("@")[0] || financeData.profile.name || "User";
  const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);

  const user = {
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

  if (isBrowser()) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }

  setCookie("accessToken", data.accessToken);
  setCookie("refreshToken", data.refreshToken);

  return data;
}

/**
 * Demo fast login for testing without Supabase or credentials
 */
export async function demoLogin(): Promise<AdminLoginData> {
  const financeData = readFinanceDataFromLocalStorage();
  const user = {
    id: "usr-demo-local",
    email: "demo@personalfinance.io",
    name: financeData.profile.name || "Demo User",
    roles: ["admin", "superadmin"],
    permissions: ALL_PERMISSIONS,
  };

  const data: AdminLoginData = {
    accessToken: "demo-access-token",
    refreshToken: "demo-refresh-token",
    user,
  };

  if (isBrowser()) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }

  setCookie("accessToken", data.accessToken);
  setCookie("refreshToken", data.refreshToken);

  // Explicitly load demo sample dataset for demo user
  useFinanceStore.getState().resetToDefaults();

  return data;
}

/**
 * Retrieve user profile from Supabase with fallback to local store
 */
export async function getProfile(): Promise<AuthProfile> {
  if (isSupabaseConfigured()) {
    try {
      const supabaseProfile = await getSupabaseProfile();
      if (supabaseProfile) {
        return supabaseProfile;
      }
    } catch {
      // Continue to local storage fallback
    }
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
 * Logout and clear session, including private financial state
 */
export function logout(): void {
  if (isSupabaseConfigured()) {
    void signOutFromSupabase();
  }

  deleteCookie("accessToken");
  deleteCookie("refreshToken");
  if (isBrowser()) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem("personal_finance_storage_v1");
  }

  // Purge store so no data leaks to subsequent user
  useFinanceStore.getState().clearAll();
}