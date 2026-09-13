import { statusKeys } from '@/hooks/query/status/useStatuses'
import { createStatus } from '@/services/status/status.service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export function useCreateStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createStatus,
    onSuccess: (data) => {
      toast.success(`Status "${data.status}" berhasil dibuat`)
      queryClient.invalidateQueries({ queryKey: statusKeys.all })
    },
  })
}