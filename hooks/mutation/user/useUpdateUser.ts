'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { userKeys } from '@/hooks/query/user/useUsers'
import { updateUser } from '@/services/user/user.service'
import type { UpdateUserRequest } from '@/types/user/user'

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserRequest }) =>
      updateUser(id, payload),
    onSuccess: (user) => {
      toast.success(`User "${user.name}" updated`)
      queryClient.setQueryData(userKeys.detail(user.id), user)
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}
