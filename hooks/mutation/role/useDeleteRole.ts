'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { roleKeys } from '@/hooks/query/role/useRoles'
import { deleteRole } from '@/services/role/role.service'

export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: (_result, id) => {
      toast.success('Role deleted')
      queryClient.removeQueries({ queryKey: roleKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
    // BE menolak role sistem (400) dan role yang masih dipakai user (409)
    // dengan pesan yang menjelaskan sebabnya, dan axiosPrivate sudah
    // menampilkannya. Tidak perlu toast kedua di sini.
  })
}
