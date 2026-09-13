'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { roleKeys } from '@/hooks/query/role/useRoles'
import { createRole } from '@/services/role/role.service'

export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRole,
    onSuccess: (role) => {
      toast.success(`Role "${role.label}" created`)
      queryClient.setQueryData(roleKeys.detail(role.id), role)
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
    // axiosPrivate sudah men-toast pesan error dari API; toast kedua di sini
    // cuma menggandakan hal yang sama.
  })
}
