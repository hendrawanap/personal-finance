import { userKeys } from '@/hooks/query/user/useUsers'
import { assignUserRole } from '@/services/user/user.service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export function useAssignUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      assignUserRole(userId, roleId),
    onSuccess: () => {
      toast.success('Role berhasil di-assign')
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}