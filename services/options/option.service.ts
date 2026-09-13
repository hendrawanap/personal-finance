import { axiosPrivate } from '@/lib/instance'
import { v } from '@/lib/apiVersion'
import { ApiEnvelope } from '@/types/auth/auth'
import { Options } from '@/types/option/option'

export async function getOptions(key?: string): Promise<Options[]> {
  const res = await axiosPrivate.get<ApiEnvelope<Options[]>>(v('options'), {
    params: key ? { key } : undefined,
  })
  return res.data.data
}