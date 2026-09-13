import {
  createParser,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs'
import type { SortingState } from '@tanstack/react-table'
import { isCalendarDate } from '@/lib/calendarDate'

/**
 * Konvensi parser URL state (lihat docs/preserve-filter-tab-state.md).
 * Impor dari sini — jangan definisikan parser inline per halaman.
 *
 * - Nilai default TIDAK ditulis ke URL (perilaku `withDefault`).
 * - Filter/search/page/sort memakai history 'replace' (di useQueryStates).
 * - Tab memakai history 'push' supaya tombol back kembali ke tab sebelumnya.
 */

/** ?q= — search query yang sudah di-debounce */
export const searchParser = parseAsString.withDefault('')

/** ?page= — pagination, 1-based */
export const pageParser = parseAsInteger.withDefault(1)

/** ?sort= — "kolom" (asc) atau "-kolom" (desc) */
export const sortParser = parseAsString.withDefault('')

/** ?tab= — tab aktif; history push agar back mengembalikan tab */
export const tabParser = (defaultTab: string) =>
  parseAsString.withDefault(defaultTab).withOptions({ history: 'push' })

/** Filter id dinamis (opsi dari server), mis. ?source=12 — '' = semua */
export const idParser = parseAsString.withDefault('')

/** Filter boolean, mis. ?allDates=true */
export const booleanParser = parseAsBoolean.withDefault(false)

/** Tanggal kalender dari `<input type="date">`, selalu `YYYY-MM-DD`. */
export const calendarDateParser = createParser({
  parse: (value) => (isCalendarDate(value) ? value : null),
  serialize: String,
}).withDefault('')

/** Filter enum, mis. status/phase/locale dengan nilai terbatas */
export const enumParser = <T extends string>(
  values: readonly T[],
  defaultValue: T,
) => parseAsStringLiteral(values).withDefault(defaultValue)

/** ?tab= dengan nilai terbatas; history push seperti tabParser */
export const tabEnumParser = <T extends string>(
  values: readonly T[],
  defaultValue: T,
) => enumParser(values, defaultValue).withOptions({ history: 'push' })

/** "kolom" / "-kolom" ⇄ TanStack SortingState */
export function sortToSortingState(sort: string): SortingState {
  if (!sort) return []
  return sort.startsWith('-')
    ? [{ id: sort.slice(1), desc: true }]
    : [{ id: sort, desc: false }]
}

export function sortingStateToSort(state: SortingState): string {
  const s = state[0]
  return s ? (s.desc ? `-${s.id}` : s.id) : ''
}
