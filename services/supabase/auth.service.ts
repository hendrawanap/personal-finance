/**
 * Legacy Supabase Auth Adapter
 * All authentication calls are now routed to the Next.js BFF (/api/v1/auth/*)
 * to eliminate browser-level Supabase keys and maintain pure backend security.
 */

import {
  adminLogin as signInWithSupabase,
  signUp as signUpWithSupabase,
  logout as signOutFromSupabase,
  getProfile as getSupabaseProfile,
  AUTH_STORAGE_KEY,
} from "@/services/auth/auth.service";
import {
  requestPasswordReset as requestSupabasePasswordReset,
  updatePassword,
} from "@/services/auth/passwordReset";
import { SignUpRequest, SignUpResponse } from "@/types/auth/auth";

export {
  signInWithSupabase,
  signUpWithSupabase,
  signOutFromSupabase,
  getSupabaseProfile,
  requestSupabasePasswordReset,
  AUTH_STORAGE_KEY,
};

export type { SignUpRequest, SignUpResponse };

export async function updateSupabasePassword(newPassword: string): Promise<void> {
  await updatePassword(newPassword);
}

export async function getCurrentSupabaseUser() {
  const profile = await getSupabaseProfile();
  return profile;
}

export async function updateSupabaseUserProfile(): Promise<boolean> {
  return true;
}
