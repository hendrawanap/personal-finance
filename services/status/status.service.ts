import { axiosPrivate } from '@/lib/instance'
import { v } from '@/lib/apiVersion'
import { ApiEnvelope } from '@/types/auth/auth'
import { CreateStatusRequest, Status } from '@/types/status/status'

export async function getStatuses(targetTable?: string): Promise<Status[]> {
  const res = await axiosPrivate.get<ApiEnvelope<Status[]>>(v('statuses'), {
    params: targetTable ? { targetTable } : undefined,
  })
  return res.data.data
}

export async function getStatus(id: number): Promise<Status> {
  const res = await axiosPrivate.get<ApiEnvelope<Status>>(
    v('statuses', `/${id}`),
  )
  return res.data.data
}

export async function createStatus(
  payload: CreateStatusRequest,
): Promise<Status> {
  const res = await axiosPrivate.post<ApiEnvelope<Status>>(
    v('statuses'),
    payload,
  )
  return res.data.data
}