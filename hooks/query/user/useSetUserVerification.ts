import { userKeys } from '@/hooks/query/user/useUsers'
import { setUserVerification } from '@/services/user/user.service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export function useSetUserVerification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) =>
      setUserVerification(id, isVerified),
    onSuccess: (data) => {
      toast.success(
        data.isVerified
          ? `${data.name} berhasil diverifikasi`
          : `Verifikasi ${data.name} dicabut`,
      )
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}