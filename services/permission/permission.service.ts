import { axiosPrivate } from '@/lib/instance'
import { v } from '@/lib/apiVersion'
import { ApiEnvelope } from '@/types/auth/auth'
import { Permission } from '@/types/permission/list'

export async function getPermissions(): Promise<Permission[]> {
  const res = await axiosPrivate.get<ApiEnvelope<Permission[]>>(v('permissions'))
  return res.data.data
}