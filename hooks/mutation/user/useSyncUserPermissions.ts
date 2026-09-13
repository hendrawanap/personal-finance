'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { syncUserPermissions } from '@/services/user/user.service'
import { UserPermissionItem } from '@/types/user/user'
import { userKeys } from '@/hooks/query/user/useUsers'

export function useSyncUserPermissions(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (permissions: UserPermissionItem[]) =>
      syncUserPermissions(userId, permissions),
    onSuccess: (user) => {
      queryClient.setQueryData(userKeys.detail(userId), user)
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}