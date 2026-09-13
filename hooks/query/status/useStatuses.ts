import { getStatus, getStatuses } from '@/services/status/status.service'
import { useQuery } from '@tanstack/react-query'

export const statusKeys = {
  all: ['statuses'] as const,
  list: (targetTable?: string) => ['statuses', { targetTable }] as const,
  detail: (id: number) => ['statuses', 'detail', id] as const,
}

export function useStatuses(targetTable?: string) {
  return useQuery({
    queryKey: statusKeys.list(targetTable),
    queryFn: () => getStatuses(targetTable),
  })
}

export function useStatus(id: number) {
  return useQuery({
    queryKey: statusKeys.detail(id),
    queryFn: () => getStatus(id),
    enabled: !!id,
  })
}