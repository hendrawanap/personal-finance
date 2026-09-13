'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  ColumnDef,
  ExpandedState,
  OnChangeFn,
  PaginationState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown01Icon, ArrowUp01Icon } from 'hugeicons-react'
import LoadingState from '../feedback/loadingState'
import ErrorState from '../feedback/errState'
import { Pagination } from '@/components/molecules/dashboard/unit/pagination'

const EMPTY_SORTING: SortingState = []

type DataTableProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]

  isPending?: boolean
  isError?: boolean
  onRetry?: () => void

  enableSorting?: boolean
  pageSize?: number
  globalFilter?: string
  onGlobalFilterChange?: OnChangeFn<string>

  /**
   * Controlled state (opsional) — untuk preserve sort/page di URL
   * (lihat docs/nuqs-implementation-plan.md). Tanpa props ini perilaku
   * lama (uncontrolled) tetap berjalan.
   */
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  /** true bila pagination dihitung server; wajib menyertakan pageCount */
  manualPagination?: boolean
  pageCount?: number
  /** true bila urutan sudah dihitung server — tabel tidak mengurutkan ulang halaman yang datang. */
  manualSorting?: boolean

  /**
   * Mengembalikan URL halaman detail data pada baris tersebut.
   * Bila disetel, baris otomatis menjadi clickable (cursor-pointer),
   * navigasi via router.push saat klik kiri biasa, buka tab baru saat
   * Cmd/Ctrl+klik atau klik tengah (auxclick), dan mendukung tombol Enter (keyboard).
   */
  getRowHref?: (row: TData) => string | undefined
  onRowClick?: (row: TData) => void
  rowClassName?: (row: TData) => string

  /**
   * Aktifkan baris bersarang. Kolom yang punya tombol expand memakai
   * `row.getCanExpand()` / `row.getToggleExpandedHandler()` dari cell context.
   */
  getSubRows?: (row: TData) => TData[] | undefined
  getRowId?: (row: TData, index: number, parent?: { id: string }) => string

  loadingMessage?: string
  errorMessage?: string
  retryLabel?: string
  /** Teks (atau node, mis. dengan tombol "reset filter") saat tidak ada baris. */
  emptyMessage?: ReactNode
  /** Total baris di server (untuk "Showing a–b of N" saat manualPagination). */
  totalItems?: number

  minWidthClassName?: string
}

function isInteractiveChild(
  target: EventTarget | null,
  rowElement: HTMLElement,
): boolean {
  if (!(target instanceof Element)) return false
  const interactive = target.closest(
    'a, button, input, select, textarea, label, [role="button"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="radio"], [role="tab"], [data-no-row-click]',
  )
  return Boolean(
    interactive && rowElement.contains(interactive) && interactive !== rowElement,
  )
}

function hasTextSelection(): boolean {
  if (typeof window === 'undefined') return false
  const selection = window.getSelection()
  return Boolean(
    selection && !selection.isCollapsed && selection.toString().trim().length > 0,
  )
}

export default function DataTable<TData>({
  data,
  columns,
  isPending,
  isError,
  onRetry,
  enableSorting = false,
  pageSize,
  globalFilter,
  onGlobalFilterChange,
  sorting: sortingProp,
  onSortingChange,
  pagination: paginationProp,
  onPaginationChange,
  manualPagination,
  pageCount,
  manualSorting,
  getRowHref,
  onRowClick,
  rowClassName,
  getSubRows,
  getRowId,
  loadingMessage,
  errorMessage,
  retryLabel,
  emptyMessage = 'No data found.',
  totalItems,
  minWidthClassName,
}: DataTableProps<TData>) {
  const router = useRouter()
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const sorting = sortingProp ?? internalSorting
  const handleSortingChange = onSortingChange ?? setInternalSorting

  const coreRowModel = useMemo(() => getCoreRowModel(), [])
  const sortedRowModel = useMemo(() => getSortedRowModel(), [])
  const filteredRowModel = useMemo(() => getFilteredRowModel(), [])
  const paginationRowModel = useMemo(
    () =>
      pageSize || (paginationProp && !manualPagination)
        ? getPaginationRowModel()
        : undefined,
    [pageSize, paginationProp, manualPagination],
  )
  const expandedRowModel = useMemo(
    () => (getSubRows ? getExpandedRowModel() : undefined),
    [getSubRows],
  )

  const initialState = useMemo(
    () =>
      pageSize && !paginationProp ? { pagination: { pageSize } } : undefined,
    [pageSize, paginationProp],
  )

  const state = useMemo(
    () => ({
      sorting: enableSorting ? sorting : EMPTY_SORTING,
      globalFilter,
      ...(paginationProp ? { pagination: paginationProp } : {}),
      ...(getSubRows ? { expanded } : {}),
    }),
    [enableSorting, sorting, globalFilter, paginationProp, getSubRows, expanded],
  )

  const effectivePageSize = paginationProp?.pageSize ?? pageSize
  const computedPageCount =
    pageCount ??
    (totalItems !== undefined && effectivePageSize && effectivePageSize > 0
      ? Math.max(1, Math.ceil(totalItems / effectivePageSize))
      : undefined)

  const table = useReactTable({
    data,
    columns,
    state,
    enableSorting,
    onSortingChange: handleSortingChange,
    onPaginationChange,
    manualPagination,
    pageCount: computedPageCount,
    autoResetPageIndex: false,
    manualSorting,
    onGlobalFilterChange,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    getFilteredRowModel: filteredRowModel,
    getPaginationRowModel: paginationRowModel,
    getExpandedRowModel: expandedRowModel,
    getSubRows,
    getRowId,
    onExpandedChange: setExpanded,
    // Group ikut tampil kalau salah satu anaknya cocok, dan paginasi menghitung
    // baris induk saja supaya membuka satu group tidak menggeser halaman.
    filterFromLeafRows: Boolean(getSubRows),
    // `paginateExpandedRows: false` men-defer penyisipan child row yang expand
    // ke getPaginationRowModel (biar anak yang expand tidak ikut kepotong page
    // slicing). Itu hanya aman kalau getPaginationRowModel BENERAN terdaftar —
    // yaitu paginationRowModel di atas tidak undefined (paginasi lokal/client).
    // Untuk manualPagination (server yang mem-paginasi, data sudah 1 halaman),
    // paginationRowModel sengaja undefined, jadi penyisipan itu tidak pernah
    // terjadi di mana pun — klik expand cuma ubah state, tidak pernah
    // menampilkan child row sama sekali. Makanya di sini `false` cuma dipakai
    // kalau pagination row model-nya nyata; kalau tidak, biarkan default
    // (true) supaya getExpandedRowModel sendiri yang menyisipkan child row-nya.
    paginateExpandedRows:
      getSubRows && paginationRowModel ? false : undefined,
    initialState,
  })

  if (isPending) {
    return <LoadingState message={loadingMessage} />
  }

  if (isError) {
    return (
      <ErrorState
        message={errorMessage}
        onRetry={onRetry}
        retryLabel={retryLabel}
      />
    )
  }

  const rows = table.getRowModel().rows
  const leafCount = table.getAllLeafColumns().length

  const isClickable = Boolean(getRowHref || onRowClick)

  const handleRowClick = (
    e: React.MouseEvent<HTMLTableRowElement>,
    rowData: TData,
  ) => {
    if (hasTextSelection() || isInteractiveChild(e.target, e.currentTarget)) {
      return
    }

    const href = getRowHref?.(rowData)
    if (href) {
      if (e.metaKey || e.ctrlKey) {
        window.open(href, '_blank')
        return
      }
      router.push(href)
      return
    }

    onRowClick?.(rowData)
  }

  const handleRowAuxClick = (
    e: React.MouseEvent<HTMLTableRowElement>,
    rowData: TData,
  ) => {
    if (e.button !== 1) return
    if (hasTextSelection() || isInteractiveChild(e.target, e.currentTarget)) {
      return
    }

    const href = getRowHref?.(rowData)
    if (href) {
      window.open(href, '_blank')
    }
  }

  const handleRowKeyDown = (
    e: React.KeyboardEvent<HTMLTableRowElement>,
    rowData: TData,
  ) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      if (isInteractiveChild(e.target, e.currentTarget)) {
        return
      }

      const href = getRowHref?.(rowData)
      if (href) {
        if (e.metaKey || e.ctrlKey) {
          window.open(href, '_blank')
        } else {
          router.push(href)
        }
        return
      }

      onRowClick?.(rowData)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-xenia-border bg-white">
      <div className="overflow-x-auto">
        <table
          className={`w-full border-collapse text-sm ${minWidthClassName ?? ''}`}
        >
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-xenia-border bg-xenia-cream text-left"
              >
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()

                  const label = header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        !canSort
                          ? undefined
                          : sorted === 'asc'
                            ? 'ascending'
                            : sorted === 'desc'
                              ? 'descending'
                              : 'none'
                      }
                      className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-xenia-stone-500"
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex select-none items-center gap-1 rounded transition-colors hover:text-xenia-moss-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xenia-moss-600/40"
                        >
                          {label}
                          {sorted === 'asc' && <ArrowUp01Icon size={12} />}
                          {sorted === 'desc' && <ArrowDown01Icon size={12} />}
                        </button>
                      ) : (
                        <div className="flex select-none items-center gap-1">
                          {label}
                        </div>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={leafCount}
                  className="px-5 py-16 text-center text-sm text-xenia-stone-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={
                    isClickable
                      ? (e) => handleRowClick(e, row.original)
                      : undefined
                  }
                  onAuxClick={
                    isClickable && getRowHref
                      ? (e) => handleRowAuxClick(e, row.original)
                      : undefined
                  }
                  onKeyDown={
                    isClickable
                      ? (e) => handleRowKeyDown(e, row.original)
                      : undefined
                  }
                  className={`group/row border-b border-xenia-divider transition-colors last:border-0 hover:bg-xenia-surface-hover ${
                    isClickable
                      ? 'cursor-pointer focus-visible:outline-none focus-visible:bg-xenia-surface-hover'
                      : ''
                  } ${row.depth > 0 ? 'bg-xenia-cream/60' : ''} ${
                    rowClassName?.(row.original) ?? ''
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-3 text-xenia-ink-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageSize || paginationProp ? (
        <Pagination
          page={table.getState().pagination.pageIndex + 1}
          pageCount={computedPageCount ?? table.getPageCount()}
          onPageChange={(p) => {
            if (onPaginationChange) {
              onPaginationChange({
                pageIndex: p - 1,
                pageSize: table.getState().pagination.pageSize,
              })
            } else {
              table.setPageIndex(p - 1)
            }
          }}
          totalItems={totalItems}
          pageSize={table.getState().pagination.pageSize}
          className="border-t border-xenia-divider px-5 py-3"
        />
      ) : null}
    </div>
  )
}export { DataTable }
