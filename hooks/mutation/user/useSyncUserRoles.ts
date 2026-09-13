'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { userKeys } from '@/hooks/query/user/useUsers'
import { assignUserRole, removeUserRole } from '@/services/user/user.service'

/**
 * Menyamakan role seorang user dengan pilihan di dialog.
 *
 * BE tidak punya endpoint "replace semua role" — yang ada POST (tambah satu)
 * dan DELETE (cabut satu). Jadi diff-nya dihitung di sini dan dikirim sebagai
 * beberapa request.
 *
 * Konsekuensi yang harus diketahui: ini BUKAN transaksi. Kalau request kelima
 * gagal, empat yang pertama sudah tersimpan. Karena itu error-nya menyebut
 * berapa yang berhasil, dan cache selalu di-invalidate walau gagal — layar
 * harus menampilkan keadaan yang sebenarnya, bukan pilihan yang tadi diketik.
 */
export function useSyncUserRoles(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      add,
      remove,
    }: {
      add: string[]
      remove: string[]
    }) => {
      let done = 0
      try {
        // Cabut dulu, baru tambah. Urutan ini yang aman kalau nanti ada aturan
        // "maksimal N role": mengurangi lebih dulu tidak pernah menabrak batas.
        for (const roleId of remove) {
          await removeUserRole(userId, roleId)
          done++
        }
        for (const roleId of add) {
          await assignUserRole(userId, roleId)
          done++
        }
      } catch (error) {
        const total = add.length + remove.length
        if (done > 0) {
          toast.error(
            `Berhenti di perubahan ke-${done + 1} dari ${total}. ${done} perubahan sebelumnya sudah tersimpan.`,
          )
        }
        throw error
      }
      return { applied: done }
    },
    onSettled: () => {
      // Sengaja onSettled, bukan onSuccess: setelah gagal separuh jalan, data
      // di layar sudah tidak sama dengan server.
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
    onSuccess: ({ applied }) => {
      if (applied > 0) toast.success('Role berhasil diperbarui')
    },
  })
}
