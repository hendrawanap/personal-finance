import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AdminLoginData, AdminLoginRequest, AuthUser } from "@/types/auth/auth";
import { AuthProfile } from "@/types/auth/profile";
import { Permission, PERMISSIONS } from "@/types/auth/permission.type";
import { FinancialProfile } from "@/types/finance";
import { deleteCookie, setCookie } from "cookies-next";
import { useFinanceStore } from "@/store/useFinanceStore";

export const AUTH_STORAGE_KEY = "finance_auth_user";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

export interface SignUpRequest {
  email: string;
  password: string;
  name: string;
}

export interface SignUpResponse {
  user: AuthUser | null;
  needsEmailConfirmation: boolean;
}

/**
 * Sign up a new user using Supabase Auth and initialize profile
 */
export async function signUpWithSupabase(payload: SignUpRequest): Promise<SignUpResponse> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured. Please check your environment variables.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        name: payload.name.trim(),
      },
    },
  });

  if (error) {
    throw error;
  }

  const user = data.user;
  const session = data.session;

  if (session && user) {
    // If auto-confirmed, store tokens & profile
    const authUser: AuthUser = {
      id: user.id,
      email: user.email || payload.email,
      name: payload.name.trim() || user.email?.split("@")[0] || "User",
      roles: ["admin"],
      permissions: ALL_PERMISSIONS,
    };

    setCookie("accessToken", session.access_token);
    setCookie("refreshToken", session.refresh_token);

    if (isBrowser()) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
    }

    // Ensure profile row exists in personal_finance schema
    try {
      await supabase.from("profiles").upsert({
        user_id: user.id,
        name: authUser.name,
        email: authUser.email,
        currency_symbol: "Rp",
        currency_code: "IDR",
        monthly_savings_target: 3000,
      });
    } catch (err) {
      console.warn("Could not auto-insert profile on signup:", err);
    }

    // Under strict isolation, initialize a fresh empty dataset for the new user
    useFinanceStore.getState().clearAll();
    useFinanceStore.getState().updateProfile({
      name: authUser.name,
      email: authUser.email,
      currencySymbol: "Rp",
      currencyCode: "IDR",
      monthlySavingsTarget: 3000,
    });

    return {
      user: authUser,
      needsEmailConfirmation: false,
    };
  }

  return {
    user: user
      ? {
          id: user.id,
          email: user.email || payload.email,
          name: payload.name.trim(),
          roles: ["admin"],
          permissions: ALL_PERMISSIONS,
        }
      : null,
    needsEmailConfirmation: true,
  };
}

/**
 * Sign in user using Supabase Auth
 */
export async function signInWithSupabase(payload: AdminLoginRequest): Promise<AdminLoginData> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured. Please check your environment variables.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.identifier,
    password: payload.password,
  });

  if (error) {
    throw error;
  }

  const user = data.user;
  const session = data.session;

  if (!user || !session) {
    throw new Error("Failed to obtain session from Supabase.");
  }

  // Retrieve user profile or create one
  let userName = (user.user_metadata?.name as string) || user.email?.split("@")[0] || "User";
  try {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user.id)
      .limit(1);

    if (profiles && profiles.length > 0 && profiles[0].name) {
      userName = profiles[0].name;
    } else {
      // Upsert profile for new authenticated user
      await supabase.from("profiles").upsert({
        user_id: user.id,
        name: userName,
        email: user.email,
        currency_symbol: "Rp",
        currency_code: "IDR",
        monthly_savings_target: 3000,
      });
    }
  } catch (profileErr) {
    console.warn("Profile fetch/upsert notice:", profileErr);
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email || payload.identifier,
    name: userName,
    roles: ["admin", "superadmin"],
    permissions: ALL_PERMISSIONS,
  };

  const loginData: AdminLoginData = {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: authUser,
  };

  // Set cookies for Next.js proxy/middleware compatibility
  setCookie("accessToken", session.access_token);
  setCookie("refreshToken", session.refresh_token);

  if (isBrowser()) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
  }

  return loginData;
}

/**
 * Sign out from Supabase and clear local state
 */
export async function signOutFromSupabase(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Error during Supabase signOut:", err);
    }
  }

  deleteCookie("accessToken");
  deleteCookie("refreshToken");

  if (isBrowser()) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem("personal_finance_storage_v1");
  }

  useFinanceStore.getState().clearAll();
}

/**
 * Get the current Supabase session user if any
 */
export async function getCurrentSupabaseUser() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Get user profile from Supabase with fallback to local storage
 */
export async function getSupabaseProfile(): Promise<AuthProfile | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return null;

    const user = userData.user;
    let name = (user.user_metadata?.name as string) || user.email?.split("@")[0] || "User";

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);

    if (profiles && profiles.length > 0 && profiles[0].name) {
      name = profiles[0].name;
    }

    const authProfile: AuthProfile = {
      id: user.id,
      name,
      email: user.email || "",
      roles: ["admin"],
      permissions: ALL_PERMISSIONS,
      propertyScope: { kind: "all" },
    };

    if (isBrowser()) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authProfile));
    }

    return authProfile;
  } catch (err) {
    console.error("Failed to load Supabase profile:", err);
    return null;
  }
}

/**
 * Request password reset email via Supabase
 */
export async function requestSupabasePasswordReset(email: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const redirectTo = isBrowser()
    ? `${window.location.origin}/reset-password`
    : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw error;
  }
}

/**
 * Update password for current authenticated user
 */
export async function updateSupabasePassword(newPassword: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }
}

/**
 * Update user profile details in Supabase
 */
export async function updateSupabaseUserProfile(
  updates: Partial<FinancialProfile>,
): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const userId = userData.user.id;

    // Update Supabase auth user metadata if name changed
    if (updates.name) {
      await supabase.auth.updateUser({
        data: { name: updates.name },
      });
    }

    // Update personal_finance.profiles
    const rowUpdates: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) rowUpdates.name = updates.name;
    if (updates.email !== undefined) rowUpdates.email = updates.email;
    if (updates.currencySymbol !== undefined) rowUpdates.currency_symbol = updates.currencySymbol;
    if (updates.currencyCode !== undefined) rowUpdates.currency_code = updates.currencyCode;
    if (updates.monthlySavingsTarget !== undefined)
      rowUpdates.monthly_savings_target = updates.monthlySavingsTarget;

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(rowUpdates)
        .eq("user_id", userId);
      return !error;
    } else {
      const { error } = await supabase.from("profiles").insert(rowUpdates);
      return !error;
    }
  } catch (err) {
    console.error("Failed to update profile in Supabase:", err);
    return false;
  }
}
