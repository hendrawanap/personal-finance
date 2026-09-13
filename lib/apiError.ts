export function extractApiError(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data as
    | {
        errors?: { message?: string }[] | null
        meta?: { message?: string }
      }
    | undefined

  return (
    data?.meta?.message ??
    data?.errors?.find((e) => e?.message)?.message ??
    (error instanceof Error ? error.message : undefined) ??
    fallback
  )
}

/**
 * True kalau request ditolak PermissionsGuard di xenia-dashboard-be.
 *
 * Dipakai halaman untuk membedakan "kamu tidak berhak" dari "datanya kosong" —
 * tanpa ini keduanya sama-sama tampil sebagai tabel kosong, dan yang pertama
 * dilaporkan sebagai bug.
 *
 *   if (isForbidden(error)) return <ForbiddenState />
 */
export function isForbidden(error: unknown): boolean {
  return (
    (error as { response?: { status?: number } })?.response?.status === 403
  )
}
