import { axiosPublic } from "@/lib/instance";
import { v } from "@/lib/apiVersion";
import type {
  AcceptInvitePayload,
  AcceptInviteResponse,
  VerifyInviteResponse,
} from "@/types/auth/invite";

/**
 * PENTING: dua endpoint ini dipanggil oleh orang yang belum punya akun, jadi
 * harus lewat instance TANPA interceptor auth. Kalau dipanggil dengan
 * `axiosPrivate`, respons 400 (token kedaluwarsa) berpotensi ditangkap
 * interceptor refresh-token dan dialihkan ke halaman login — user tidak
 * pernah melihat pesan "link kedaluwarsa" yang sebenarnya.
 *
 * Sesuaikan nama importnya dengan instance publik di repo.
 */

export async function verifyInvite(token: string) {
  const res = await axiosPublic.get<{ data: VerifyInviteResponse }>(
    v("auth", "/invite/verify"),
    { params: { token } },
  );

  return res.data.data;
}

export async function acceptInvite(payload: AcceptInvitePayload) {
  const res = await axiosPublic.post<{ data: AcceptInviteResponse }>(
    v("auth", "/invite/accept"),
    payload,
  );

  return res.data.data;
}