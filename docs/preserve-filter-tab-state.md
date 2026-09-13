# Rekomendasi UX: Preserve Filter & Tab State di Xenia Dashboard

**Tanggal:** 30 Agustus 2026
**Scope:** `xenia-dashboard-fe` (Next.js 16 App Router, React 19, TanStack Query/Table, Zustand)
**Masalah:** Semua filter, tab, search, dan pagination di halaman dashboard disimpan sebagai `useState` lokal, sehingga hilang setiap kali user pindah halaman, refresh, atau menekan tombol back.

---

## 1. Kondisi Saat Ini (Hasil Audit)

Hampir seluruh halaman list menyimpan state tampilan di `useState` lokal komponen `'use client'`:

| Halaman | State yang hilang saat navigasi |
|---|---|
| Dashboard home (`components/pages/dashboard/index.tsx`) | `overviewTab`, `amountRange`, `revenueRange`, `roomTab` |
| Booking | `checkInDate`, `allDates`, `status`, `search` |
| Events | `page`, `query`, `phase`, `status`, `typeFilter`, `scopeFilter`, `locale`, `highlightedOnly` |
| Blog | `query`, `statusFilter`, `locale`, `page`, `sortDesc` |
| Gallery | `globalFilter`, `locale`, `scope` (tab Global/per-property) |
| Physical Room | `page`, `search`, `roomTypeFilter`, `statusFilter`, `activeFilter` |
| Content Media | `q`, `mediaType`, `locale`, `page` |
| Loyalty Vouchers | `query`, `propertyFilter`, `tierFilter`, `languageFilter`, `sortBy`, `statusTab` |
| User Management | `userFilter` |
| Room | `globalFilter` |
| Site Pages / Landing Page | `scope` (tab Global/per-property) |
| `DataTable` (`components/organisms/table`) | `sorting`, `pagination` internal — tidak bisa dikontrol dari luar |

Satu-satunya pengecualian: `usePropertyFilterStore` (Zustand) untuk `selectedUnitId`, yang bertahan antar halaman selama sesi berjalan tapi hilang saat refresh dan tidak bisa di-share.

**Dampak UX yang terjadi sekarang:**

- User memfilter booking → buka detail booking → tekan back → semua filter ter-reset, harus mengulang dari awal. Ini pain point paling sering terjadi di alur list → detail → back.
- Refresh halaman (atau session expired → re-login) membuang seluruh konteks kerja.
- Filter tidak bisa di-bookmark atau dikirim ke rekan kerja ("cek booking pending tanggal 30 Agustus" tidak bisa dikirim sebagai link).
- Tombol back/forward browser tidak merefleksikan perubahan tab/filter.

---

## 2. Rekomendasi: URL Query Params sebagai Single Source of Truth

Pindahkan state tampilan (tab, filter, search, sort, page) dari `useState` ke **URL query string**. URL menjadi satu-satunya sumber kebenaran; komponen membaca dari URL dan menulis kembali ke URL.

```
/dashboard/booking?status=pending&checkIn=2026-08-30&q=budi
/dashboard/gallery?tab=3&locale=en
/dashboard/events?phase=upcoming&page=2
```

Kenapa URL, bukan localStorage/store:

1. **Back/forward otomatis benar** — kembali dari halaman detail, filter masih terpasang tanpa kode tambahan.
2. **Survive refresh** dan session re-login.
3. **Shareable & bookmarkable** — link membawa konteks lengkap; penting untuk dashboard yang dipakai tim.
4. **Kompatibel dengan arah codebase** — komentar TODO di halaman booking sudah merencanakan filtering pindah ke server via query params; URL state membuat transisi itu trivial.
5. Tidak ada masalah state basi: localStorage bisa menyimpan filter usang yang membingungkan ("kenapa list-ku kosong?"), URL selalu eksplisit dan terlihat.

### Library: `nuqs`

Gunakan [`nuqs`](https://nuqs.dev) v2 (terverifikasi: v2.10.1 mendukung Next ≥14.2 & React 19 — kompatibel dengan Next 16.2.12 / React 19.2.4 di repo ini). Ia adalah standar de-facto untuk URL state di App Router: type-safe parser, default value, batching update, dan opsi history control.

```bash
npm i nuqs
```

Setup satu kali di root layout:

```tsx
// app/layout.tsx
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  )
}
```

> **Alternatif tanpa dependency baru:** hook custom di atas `useSearchParams` + `router.replace` (lihat Lampiran A). Boleh dipakai, tapi nuqs menghilangkan banyak boilerplate (parsing tipe, serialisasi, menghapus param saat kembali ke default, batching beberapa perubahan dalam satu history entry) yang rawan bug jika ditulis sendiri.

---

## 3. Contoh Penerapan

### 3.1 Tab (contoh: Gallery `scope`)

```tsx
// sebelum
const [scope, setScope] = useState<string>(GLOBAL_SCOPE)

// sesudah
import { parseAsString, useQueryState } from 'nuqs'

const [scope, setScope] = useQueryState(
  'tab',
  parseAsString.withDefault(GLOBAL_SCOPE).withOptions({ history: 'push' }),
)

<Tabs value={scope} onValueChange={setScope}>
```

Perilaku: `?tab=...` hanya muncul jika bukan default (URL tetap bersih), dan `history: 'push'` membuat pergantian tab bisa di-undo dengan tombol back — pola yang diharapkan user untuk tab.

### 3.2 Filter set (contoh: halaman Booking)

```tsx
// sebelum
const [checkInDate, setCheckInDate] = useState<string>(todayStr())
const [allDates, setAllDates] = useState(false)
const [status, setStatus] = useState<'all' | BookingStatus>('all')
const [search, setSearch] = useState('')

// sesudah
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'

const BOOKING_STATUSES = ['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as const

const [filters, setFilters] = useQueryStates(
  {
    checkIn: parseAsString.withDefault(todayStr()),
    allDates: parseAsBoolean.withDefault(false),
    status: parseAsStringLiteral(BOOKING_STATUSES).withDefault('all'),
    q: parseAsString.withDefault(''),
  },
  { history: 'replace' },
)

// pemakaian: filters.status, setFilters({ status: 'pending' })
// beberapa perubahan sekaligus dalam satu update URL:
// setFilters({ status: 'pending', q: '' })
```

`useQueryStates` mengelompokkan semua filter satu halaman dalam satu objek — satu render, satu history entry, mudah dipakai langsung sebagai `queryKey` TanStack Query.

### 3.3 Search input: debounce sebelum menulis ke URL

Jangan tulis URL per keystroke. Pola yang sudah ada di halaman Events/Blog (state `query` + `debouncedQuery`) tetap dipakai, hanya sumbernya dibalik:

```tsx
const [q, setQ] = useQueryState('q', parseAsString.withDefault('').withOptions({ history: 'replace' }))
const [input, setInput] = useState(q) // state lokal untuk ketikan

useEffect(() => {
  const t = setTimeout(() => setQ(input || null), 300) // null = hapus param dari URL
  return () => clearTimeout(t)
}, [input])
```

(nuqs ≥2.4 juga punya `limitUrlUpdates: debounce(300)` bawaan jika ingin tanpa `useEffect`.)

### 3.4 Pagination & sorting: buat `DataTable` controllable

`components/organisms/table` saat ini menyimpan `sorting` dan `pagination` secara internal. Tambahkan props opsional agar bisa dikontrol dari luar (backward compatible — halaman lama tetap jalan):

```tsx
type DataTableProps<T> = {
  // ...props lama
  state?: Partial<TableState>
  onSortingChange?: OnChangeFn<SortingState>
  onPaginationChange?: OnChangeFn<PaginationState>
}
```

Lalu buat satu hook bersama yang jadi konvensi untuk semua halaman list:

```ts
// hooks/useTableUrlState.ts
'use client'
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs'

export function useTableUrlState() {
  return useQueryStates(
    {
      q: parseAsString.withDefault(''),
      page: parseAsInteger.withDefault(1),
      sort: parseAsString.withDefault(''), // format: "kolom" atau "-kolom" untuk desc
    },
    { history: 'replace' },
  )
}
```

### 3.5 Aturan penting: reset `page` saat filter berubah

Filter berubah → hasil berubah → halaman 5 mungkin tidak ada lagi. Selalu reset dalam update yang sama:

```tsx
setFilters({ status: 'pending', page: 1 })
```

### 3.6 Integrasi TanStack Query

State URL langsung menjadi bagian `queryKey`, sehingga cache per-kombinasi-filter gratis dan siap untuk server-side filtering nanti:

```ts
const { data } = useQuery({
  queryKey: ['bookings', filters],
  queryFn: () => getBookings(filters), // qs sudah ada di deps untuk serialisasi
})
```

---

## 4. Konvensi (agar konsisten di seluruh halaman)

**Yang masuk URL** — state yang mendefinisikan *apa yang sedang dilihat user*:

- Tab aktif → `tab`
- Search query (sudah di-debounce) → `q`
- Filter dropdown/toggle → nama pendek dan stabil: `status`, `locale`, `type`, `phase`, `property`
- Pagination → `page` (1-based)
- Sort → `sort` (`name` / `-name`)
- Date range → `checkIn`, `from`, `to` (format `YYYY-MM-DD`)

**Yang TIDAK masuk URL** — state interaksi sesaat, tetap `useState`:

- Modal/dialog terbuka (`uploadOpen`, `pendingDelete`, `editing`)
- Expanded rows (`expandedIds`), tooltip, hover
- Error/loading transien (`actionError`, `togglingId`)
- Ketikan search yang belum di-debounce

**Aturan history:**

- Tab → `history: 'push'` (back = kembali ke tab sebelumnya)
- Filter, search, sort, page → `history: 'replace'` (back = keluar dari halaman, bukan mengulang 15 keystroke)

**Lain-lain:**

- Default value tidak ditulis ke URL (perilaku bawaan nuqs `withDefault`) — URL tetap bersih saat tidak ada filter aktif.
- Navigasi list → detail cukup `router.back()` / `<Link>` biasa untuk kembali; filter otomatis utuh karena ada di URL. Hapus pola tombol back manual yang menuju path hard-coded, ganti dengan `router.back()` bila asalnya selalu list.
- Halaman yang memakai `useSearchParams`/nuqs perlu dibungkus `<Suspense>` di `app/**/page.tsx` (wrapper page yang sudah ada tinggal ditambah boundary) agar tidak memaksa seluruh route jadi dynamic rendering.

### Kasus khusus: `usePropertyFilterStore` (unit/property aktif lintas halaman)

`selectedUnitId` dipakai di banyak halaman + sidebar sebagai "konteks properti aktif" — ini konteks global, bukan filter per halaman, jadi wajar tetap di Zustand. Cukup tambahkan `persist` middleware agar survive refresh:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const usePropertyFilterStore = create<PropertyFilterStore>()(
  persist(
    (set) => ({
      selectedUnitId: 'all',
      setSelectedUnitId: (id) => set({ selectedUnitId: id }),
    }),
    { name: 'xenia-active-unit' },
  ),
)
```

---

## 5. Rencana Migrasi Bertahap

1. **Fondasi (½ hari):** install nuqs, pasang `NuqsAdapter`, buat `hooks/useTableUrlState.ts`, tambah props controlled state di `DataTable`, tambah `persist` di `usePropertyFilterStore`.
2. **Halaman dengan pain terbesar (alur list → detail → back):** Booking, Events, Blog, Physical Room, Loyalty Vouchers.
3. **Halaman ber-tab:** Gallery, Site Pages, Landing Page, Dashboard home.
4. **Sisanya:** Content Media, Room, User Management, dan halaman list lain, memakai hook & konvensi yang sama.

Setiap halaman bisa dimigrasi independen (perubahan terisolasi di komponen page masing-masing), jadi aman dikerjakan bertahap tanpa big-bang refactor.

**Definisi selesai per halaman:** filter/tab bertahan setelah (a) buka detail lalu back, (b) refresh, (c) copy URL ke tab baru; dan `page` ter-reset saat filter berubah.

---

## Lampiran A — Alternatif tanpa nuqs (custom hook)

Jika tidak ingin menambah dependency:

```ts
// hooks/useUrlState.ts
'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useUrlState(key: string, defaultValue = '', history: 'push' | 'replace' = 'replace') {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const value = searchParams.get(key) ?? defaultValue

  const setValue = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (!next || next === defaultValue) params.delete(key)
      else params.set(key, next)
      const qs = params.toString()
      const url = qs ? `${pathname}?${qs}` : pathname
      history === 'push' ? router.push(url, { scroll: false }) : router.replace(url, { scroll: false })
    },
    [searchParams, router, pathname, key, defaultValue, history],
  )

  return [value, setValue] as const
}
```

Keterbatasan dibanding nuqs: semua nilai bertipe string (parsing number/boolean/literal manual), dua `setValue` berurutan dalam satu render bisa saling menimpa (nuqs mem-batch otomatis), dan tidak ada opsi debounce bawaan. Untuk dashboard sebesar ini, nuqs lebih hemat waktu dan lebih aman.
