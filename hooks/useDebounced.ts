'use client'

import { useEffect, useState } from 'react'

/**
 * Menunda nilai sampai berhenti berubah selama `delay`.
 *
 * Dipakai untuk kolom pencarian: tanpa ini setiap huruf yang diketik memicu
 * satu request, dan respons yang datang tidak berurutan bisa menimpa hasil
 * yang lebih baru.
 *
 * Nilai awal TIDAK ditunda — render pertama langsung memakai `value`, jadi
 * halaman yang dibuka dengan kata kunci dari URL tidak menampilkan hasil
 * kosong lebih dulu.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
