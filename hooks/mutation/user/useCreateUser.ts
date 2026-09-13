import { userKeys } from '@/hooks/query/user/useUsers'
import { createUser } from '@/services/user/user.service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      toast.success(`User "${data.name}" created`)
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}
