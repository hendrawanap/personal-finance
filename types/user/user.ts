import { Role } from '@/types/role/role'
import { Permission } from '../permission'

export interface User {
  id: string
  email: string
  username: string | null
  appId: string | null
  name: string
  isActive: boolean
  isVerified: boolean
  createdAt: string
  updatedAt: string
  roles: Role[]
  permissions: Permission[]
  /** 'all' = tidak dibatasi; 'selected' = hanya `properties` di bawah. */
  propertyScope: UserPropertyScope
  /** Selalu ada (bisa kosong). Hanya terisi saat propertyScope 'selected'. */
  properties: UserProperty[]
}

export type UserPropertyScope = 'all' | 'selected'

export interface UserProperty {
  id: number
  name: string
  slug: string
}

/**
 * State akhir, bukan diff — sama seperti SyncUserPermissionsRequest.
 * scope 'all' mengabaikan propertyIds; BE menghapus barisnya.
 */
export interface SyncUserPropertiesRequest {
  scope: UserPropertyScope
  propertyIds?: number[]
}

export interface CreateUserRequest {
  email: string
  password: string
  name: string
  username?: string
  appId?: string
  isActive?: boolean
  roleIds?: string[]
  propertyScope?: UserPropertyScope
  propertyIds?: number[]
}

export type UpdateUserRequest = Partial<
  Pick<
    CreateUserRequest,
    'email' | 'password' | 'name' | 'username' | 'isActive'
  >
>

export interface DeleteUserResult {
  deleted: true
}

export interface UserPermissionItem {
  permissionId: string
  expiresAt?: string | null
}

export interface SyncUserPermissionsRequest {
  permissions: UserPermissionItem[]
}
