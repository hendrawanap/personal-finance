'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Sentinel "muat halaman berikutnya" untuk daftar yang di-scroll.
 *
 * Pasang ref-nya ke elemen kosong di bawah daftar; begitu elemen itu mendekati
 * layar, `onLoadMore` dipanggil.
 *
 * Kenapa IntersectionObserver dan bukan handler `onScroll` seperti
 * memberCombobox: daftar media dipakai di dua tempat dengan container scroll
 * yang berbeda — halaman (scroll di window) dan MediaDialog (scroll di div
 * body-nya). Observer menangani keduanya dengan satu kode; `root` cukup diisi
 * elemen scroll-nya kalau ada.
 *
 * `root: null` berarti viewport. Perlu diingat: kalau sentinel-nya berada di
 * dalam container yang meng-clip, rootMargin terhadap viewport TIDAK memberi
 * efek prefetch — makanya dialog wajib mengoper root-nya (lihat
 * `useMediaDialogScrollRoot`).
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
  hasNextPage,
  isFetching,
  onLoadMore,
  root = null,
  rootMargin = '400px',
  enabled = true,
}: {
  hasNextPage: boolean;
  /** Sedang mengambil halaman berikutnya — jangan minta dua kali. */
  isFetching: boolean;
  onLoadMore: () => void;
  root?: Element | null;
  rootMargin?: string;
  enabled?: boolean;
}) {
  const sentinelRef = useRef<T | null>(null);

  // Callback disimpan di ref supaya observer tidak dibuat ulang setiap render
  // hanya karena pemanggil mengoper arrow function baru. Penyalinannya lewat
  // effect, bukan di body render — ref tidak boleh disentuh saat render.
  const loadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    loadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled || !hasNextPage || isFetching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current();
      },
      { root, rootMargin },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
    // isFetching ikut jadi dependency dengan sengaja: observer dibangun ulang
    // setiap halaman selesai dimuat, jadi sentinel yang MASIH terlihat (daftar
    // pendek, layar tinggi) memicu halaman berikutnya lagi. Observer yang sama
    // tidak akan menembak dua kali untuk keadaan intersect yang tidak berubah.
  }, [enabled, hasNextPage, isFetching, root, rootMargin]);

  return sentinelRef;
}

/**
 * Gabungan yang biasa dipakai: ambil `fetchNextPage` dkk dari useInfiniteQuery,
 * kembalikan ref sentinel-nya.
 */
export function useInfiniteScrollQuery<T extends HTMLElement = HTMLDivElement>(query: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}, options?: { root?: Element | null; rootMargin?: string; enabled?: boolean }) {
  const { fetchNextPage } = query;
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  return useInfiniteScroll<T>({
    hasNextPage: query.hasNextPage,
    isFetching: query.isFetchingNextPage,
    onLoadMore: loadMore,
    ...options,
  });
}
