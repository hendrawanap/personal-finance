'use client'

import { getRole, getRoles } from '@/services/role/role.service'
import { useQuery } from '@tanstack/react-query'

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: string) => [...roleKeys.details(), id] as const,
}

export function useRoles(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn: getRoles,
    enabled: options?.enabled ?? true,
  })
}

export function useRole(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: roleKeys.detail(id ?? ''),
    queryFn: () => getRole(id as string),
    enabled: (options?.enabled ?? true) && !!id,
  })
}