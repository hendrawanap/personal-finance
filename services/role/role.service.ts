import { axiosPrivate } from '@/lib/instance'
import { v } from '@/lib/apiVersion'
import { ApiEnvelope } from '@/types/auth/auth'
import {
  CreateRoleRequest,
  DeleteRoleResult,
  Role,
  RoleListItem,
  UpdateRoleRequest,
} from '@/types/role/role'

export async function getRoles(): Promise<RoleListItem[]> {
  const res = await axiosPrivate.get<ApiEnvelope<RoleListItem[]>>(v('roles'))
  return res.data.data
}

export async function getRole(id: string): Promise<Role> {
  const res = await axiosPrivate.get<ApiEnvelope<Role>>(v('roles', `/${id}`))
  return res.data.data
}

/** Replace seluruh permission set role. Kirim state akhir, bukan diff. */
export async function syncRolePermissions(
  roleId: string,
  permissionIds: string[],
): Promise<Role> {
  const res = await axiosPrivate.put<ApiEnvelope<Role>>(
    v('roles', `/${roleId}/permissions`),
    { permissionIds },
  )
  return res.data.data
}

export async function createRole(payload: CreateRoleRequest): Promise<Role> {
  const res = await axiosPrivate.post<ApiEnvelope<Role>>(v('roles'), payload)
  return res.data.data
}

/** PATCH — field yang tidak dikirim tidak disentuh BE. */
export async function updateRole(
  id: string,
  payload: UpdateRoleRequest,
): Promise<Role> {
  const res = await axiosPrivate.patch<ApiEnvelope<Role>>(
    v('roles', `/${id}`),
    payload,
  )
  return res.data.data
}

/**
 * Hard delete. BE menolak kalau role-nya role sistem atau masih dipakai user,
 * jadi kegagalan di sini bawa pesan yang bisa langsung ditampilkan.
 */
export async function deleteRole(id: string): Promise<DeleteRoleResult> {
  const res = await axiosPrivate.delete<ApiEnvelope<DeleteRoleResult>>(
    v('roles', `/${id}`),
  )
  return res.data.data
}
