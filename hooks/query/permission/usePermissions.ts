import { getPermissions } from '@/services/permission/permission.service'
import { Permission, PermissionGroup } from '@/types/permission/list'
import { useQuery } from '@tanstack/react-query'

export const permissionKeys = {
  all: ['permissions'] as const,
  list: () => [...permissionKeys.all, 'list'] as const,
}

export function usePermissions() {
  return useQuery({
    queryKey: permissionKeys.list(),
    queryFn: getPermissions,
    staleTime: 5 * 60 * 1000,
  })
}

export function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const map = new Map<string, Permission[]>()

  for (const p of permissions) {
    const [resource] = p.name.split(/[:.]/)
    const key = resource || 'other'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }

  return Array.from(map, ([resource, permissions]) => ({ resource, permissions })).sort(
    (a, b) => a.resource.localeCompare(b.resource),
  )
}