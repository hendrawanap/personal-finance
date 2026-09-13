export interface Options {
  id: number
  optionKey: string
  optionLabel: string
  sortOrder: number | null
  isActive: boolean | null
  targetTable: string
  tags: unknown[]
  configs: Record<string, unknown>
}