export interface Status {
  id: number
  status: string
  targetTable: string
  sortOrder: number | null
  isActive: boolean | null
  tags: unknown
  configs: unknown
  createdApp: string | null
  createdBy: string | null
  createdAt: string | null
  modifiedApp: string | null
  modifiedBy: string | null
  modifiedAt: string | null
}

export interface CreateStatusRequest {
  status: string
  targetTable: string
  sortOrder?: number
  isActive?: boolean
  tags?: unknown[]
  configs?: Record<string, unknown>
  createdApp?: string
  createdBy?: string
}