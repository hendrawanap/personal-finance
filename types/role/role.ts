export interface RolePermission {
  id: string
  name: string
  label: string
  description: string | null
  /** Prefix nama permission, contoh "blog:create" -> "blog" */
  group: string
  /** Kapan permission dikasih ke role — dari junction role_permissions */
  assignedAt: string | null
}

export interface RolePermissionGroup {
  group: string
  permissions: RolePermission[]
}

export interface Role {
  id: string
  name: string
  label: string
  description: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string

  permissionCount: number
  userCount: number | null

  /**
   * null = belum di-load (endpoint list), [] = role ini memang gak punya
   * permission. Jangan di-`?? []`, itu ngilangin bedanya.
   */
  permissions: RolePermission[] | null
  permissionGroups: RolePermissionGroup[] | null
}

/** Row di halaman list — permissions dijamin null */
export type RoleListItem = Omit<Role, 'permissions' | 'permissionGroups'> & {
  permissions: null
  permissionGroups: null
}

export interface SyncRolePermissionsRequest {
  permissionIds: string[]
}

/**
 * Role bawaan yang di-seed `RoleSyncService` dari `ROLES_REGISTRY` di
 * xenia-dashboard-be. BE menolak rename dan delete untuk nama-nama ini;
 * daftar ini cuma dipakai supaya UI tidak menawarkan aksi yang pasti 400.
 * Kalau `ROLES_REGISTRY` di BE bertambah, tambahkan juga di sini.
 */
export const SYSTEM_ROLE_NAMES = [
  'admin',
  'author',
  'user',
  'content-editor',
  'front-desk',
  'property-manager',
] as const

export function isSystemRole(role: Pick<Role, 'name'>): boolean {
  return (SYSTEM_ROLE_NAMES as readonly string[]).includes(role.name)
}

/** State form create/edit. Selalu terisi — `description` pakai '' bukan null. */
export interface RoleFormValues {
  name: string
  label: string
  description: string
  isDefault: boolean
}

export interface CreateRoleRequest {
  name: string
  label: string
  description?: string
  isDefault?: boolean
}

/**
 * PATCH: cuma kirim yang berubah. `description: null` mengosongkan deskripsi —
 * beda dengan tidak mengirim field-nya sama sekali, yang membiarkannya apa adanya.
 */
export type UpdateRoleRequest = Partial<Omit<CreateRoleRequest, 'description'>> & {
  description?: string | null
}

export interface DeleteRoleResult {
  id: string
  deleted: true
}
