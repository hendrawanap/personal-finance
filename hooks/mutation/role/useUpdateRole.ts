'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { roleKeys } from '@/hooks/query/role/useRoles'
import { updateRole } from '@/services/role/role.service'
import type { UpdateRoleRequest } from '@/types/role/role'

/**
 * roleId ikut di variables, bukan di argumen hook, supaya satu instance bisa
 * dipakai dialog yang berpindah-pindah role tanpa remount.
 */
export function useUpdateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRoleRequest }) =>
      updateRole(id, payload),
    onSuccess: (role) => {
      toast.success(`Role "${role.label}" updated`)
      queryClient.setQueryData(roleKeys.detail(role.id), role)
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
    // axiosPrivate sudah men-toast pesan error dari API; toast kedua di sini
    // cuma menggandakan hal yang sama.
  })
}
