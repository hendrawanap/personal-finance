'use client'

import { useCallback, useMemo } from 'react'
import { useQueryStates } from 'nuqs'
import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from '@tanstack/react-table'
import {
  pageParser,
  searchParser,
  sortParser,
  sortToSortingState,
  sortingStateToSort,
} from '@/lib/urlState'

type TableUrlState = {
  q?: string | null
  page?: number | null
  sort?: string | null
}

type TableUrlKeys = {
  q: string
  page: string
  sort: string
}

const DEFAULT_TABLE_URL_KEYS: TableUrlKeys = {
  q: 'q',
  page: 'page',
  sort: 'sort',
}

/**
 * State URL standar untuk halaman list: ?q= &page= &sort=
 * Ingat: setiap perubahan filter/search harus menyertakan { page: 1 }
 * dalam call setState yang sama.
 */
export function useTableUrlState() {
  return useQueryStates(
    { q: searchParser, page: pageParser, sort: sortParser },
    { history: 'replace' },
  )
}

/**
 * Versi siap-pakai untuk halaman yang memakai <DataTable> dengan paginasi
 * client-side: mengembalikan props terkontrol (sorting + pagination) yang
 * tersimpan di URL, jadi posisi halaman dan urutan kolom ikut bertahan saat
 * kembali dari halaman detail.
 *
 *   const { q, setTableState, tableProps } = useDataTableUrlProps(10)
 *   <DataTable {...tableProps} pageSize={10} ... />
 */
export function useDataTableUrlProps(
  pageSize = 10,
  keys: TableUrlKeys = DEFAULT_TABLE_URL_KEYS,
) {
  const { q: qKey, page: pageKey, sort: sortKey } = keys
  const [state, setUrlState] = useQueryStates(
    {
      [qKey]: searchParser,
      [pageKey]: pageParser,
      [sortKey]: sortParser,
    },
    { history: 'replace' },
  )
  const q = state[qKey] as string
  const page = state[pageKey] as number
  const sort = state[sortKey] as string

  const setTableState = useCallback(
    (next: TableUrlState) =>
      setUrlState({
        ...(next.q !== undefined ? { [qKey]: next.q } : {}),
        ...(next.page !== undefined ? { [pageKey]: next.page } : {}),
        ...(next.sort !== undefined ? { [sortKey]: next.sort } : {}),
      }),
    [pageKey, qKey, setUrlState, sortKey],
  )

  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: Math.max(0, (page || 1) - 1), pageSize }),
    [page, pageSize],
  )

  const sorting = useMemo(() => sortToSortingState(sort), [sort])

  const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const next =
        typeof updater === 'function' ? updater(pagination) : updater
      setTableState({ page: next.pageIndex + 1 })
    },
    [pagination, setTableState],
  )

  const onSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      // Urutan berubah → mulai lagi dari halaman satu.
      setTableState({ sort: sortingStateToSort(next) || null, page: 1 })
    },
    [sorting, setTableState],
  )

  return {
    q,
    setTableState,
    tableProps: { pagination, onPaginationChange, sorting, onSortingChange },
  }
}
