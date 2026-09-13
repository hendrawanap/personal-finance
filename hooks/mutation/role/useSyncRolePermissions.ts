'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { syncRolePermissions } from '@/services/role/role.service'
import { roleKeys } from '@/hooks/query/role/useRoles'

/**
 * roleId ikut di variables, bukan di argumen hook: saat membuat role baru,
 * id-nya belum ada waktu hook ini dibikin — baru muncul setelah POST /roles
 * berhasil, di dalam satu handler Save yang sama.
 */
export function useSyncRolePermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      roleId,
      permissionIds,
    }: {
      roleId: string
      permissionIds: string[]
    }) => syncRolePermissions(roleId, permissionIds),
    onSuccess: (role) => {
      toast.success(`Permissions for "${role.label}" saved`)
      queryClient.setQueryData(roleKeys.detail(role.id), role)
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
    // Tidak ada onError: axiosPrivate sudah men-toast setiap 4xx/5xx dengan
    // pesan asli dari API. Menambah toast di sini bikin dua toast untuk satu
    // kegagalan.
  })
}
