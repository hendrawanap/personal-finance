'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Input search lokal yang menulis ke URL setelah user berhenti mengetik.
 *
 * @param committed nilai di URL (dari useQueryState/useQueryStates)
 * @param commit    setter URL; terima null untuk menghapus param
 * @returns [input untuk <input/>, setInput]
 *
 * Contoh:
 *   const [{ q }, setFilters] = useTableUrlState()
 *   const [search, setSearch] = useDebouncedInput(q, (v) => setFilters({ q: v, page: 1 }))
 */
export function useDebouncedInput(
  committed: string,
  commit: (value: string | null) => void,
  delay = 300,
) {
  const [input, setInput] = useState(committed)
  const lastCommitted = useRef(committed)

  // Sinkron hanya saat URL berubah dari luar (back/forward, klik link),
  // bukan akibat commit kita sendiri — agar ketikan user tidak tertimpa.
  useEffect(() => {
    if (committed !== lastCommitted.current) {
      lastCommitted.current = committed
      setInput(committed)
    }
  }, [committed])

  useEffect(() => {
    const next = input.trim()
    if (next === committed) return
    const t = setTimeout(() => {
      // Spasi di ujung tidak pernah masuk URL — kata kunci "a " dan "a"
      // adalah pencarian yang sama.
      lastCommitted.current = next
      commit(next || null)
    }, delay)
    return () => clearTimeout(t)
  }, [input, committed, commit, delay])

  return [input, setInput] as const
}
