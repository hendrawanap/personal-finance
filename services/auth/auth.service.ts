import { axiosPrivate, axiosPublic } from '@/lib/instance'
import { v } from '@/lib/apiVersion'
import { AdminLoginData, AdminLoginRequest, ApiEnvelope } from '@/types/auth/auth'
import { deleteCookie, setCookie } from 'cookies-next'
import { AuthProfile } from '@/types/auth/profile'

/**
 * Login dashboard (admin only) → POST /{version}/auth/admin/login
 * Pakai axiosPublic karena login belum butuh token.
 * Versi endpoint dikontrol dari lib/apiVersion.ts (key: 'auth').
 */
export async function adminLogin(
  payload: AdminLoginRequest,
): Promise<AdminLoginData> {
  const res = await axiosPublic.post<ApiEnvelope<AdminLoginData>>(
    v('auth', '/admin/login'),
    payload,
  )

  // Backend xenia membungkus hasil dalam envelope → ambil .data.data
  const data = res.data.data

  // Simpan token ke cookie supaya axiosPrivate bisa memakainya
  setCookie('accessToken', data.accessToken)
  setCookie('refreshToken', data.refreshToken)

  return data
}

export async function getProfile(): Promise<AuthProfile> {
  const res = await axiosPrivate.get(v('auth', '/profile'));
  return res.data.data;
}

export function logout(): void {
  deleteCookie('accessToken')
  deleteCookie('refreshToken')
}