import { getOptions } from '@/services/options/option.service'
import { useQuery } from '@tanstack/react-query'

export const optionKeys = {
  all: ['options'] as const,
  list: (key?: string) => ['options', { key }] as const,
}

export function useOptions(key?: string) {
  return useQuery({
    queryKey: optionKeys.list(key),
    queryFn: () => getOptions(key),
    staleTime: 5 * 60 * 1000, 
  })
}