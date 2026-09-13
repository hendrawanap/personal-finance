# Implementation Plan: URL State dengan nuqs — Xenia Dashboard

**Tanggal:** 30 Agustus 2026
**Status:** Fase 0-5 selesai (2 September 2026) — lihat "Hasil rollout" di
bagian bawah untuk daftar param per halaman dan penyimpangan dari plan.
**Referensi:** `docs/preserve-filter-tab-state.md` (rekomendasi & konvensi)
**Target:** Semua filter, tab, search, sort, dan pagination di halaman dashboard bertahan setelah navigasi list → detail → back, refresh, dan bisa di-share sebagai URL.

Plan dibagi 5 fase. Setiap fase bisa di-merge terpisah; tidak ada big-bang refactor. Fase 2 adalah pilot yang memvalidasi pola sebelum di-roll-out ke semua halaman.

---

## Fase 0 — Fondasi (±½ hari)

### 0.1 Install & adapter

```bash
npm i nuqs   # v2.10.1 saat plan ini ditulis; kompatibel Next 16.2.12 + React 19
```

`app/layout.tsx` — bungkus `<Providers>` yang sudah ada:

```tsx
import { NuqsAdapter } from 'nuqs/adapters/next/app'
// ...
<body className="flex min-h-full flex-col font-sans">
  <NuqsAdapter>
    <Providers>{children}</Providers>
  </NuqsAdapter>
</body>
```

### 0.2 Shared parsers & hooks

Buat file baru `lib/urlState.ts` — konvensi param yang dipakai semua halaman:

```ts
import {
  createParser,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs'

/** Konvensi umum — impor dari sini, jangan definisikan ulang per halaman */
export const searchParser = parseAsString.withDefault('')            // ?q=
export const pageParser = parseAsInteger.withDefault(1)              // ?page= (1-based)
export const tabParser = (defaultTab: string) =>
  parseAsString.withDefault(defaultTab).withOptions({ history: 'push' })
export const localeParser = parseAsString.withDefault('all')         // samakan dgn ALL_LOCALES
export const enumParser = <T extends readonly string[]>(values: T, def: T[number]) =>
  parseAsStringLiteral(values).withDefault(def)

/** Sort "kolom" / "-kolom" ⇄ TanStack SortingState */
export const sortParser = createParser<{ id: string; desc: boolean } | null>({
  parse: (v) => (v ? { id: v.replace(/^-/, ''), desc: v.startsWith('-') } : null),
  serialize: (v) => (v ? (v.desc ? `-${v.id}` : v.id) : ''),
}).withDefault(null)
```

Buat `hooks/useTableUrlState.ts` — state standar halaman list:

```ts
'use client'
import { useQueryStates } from 'nuqs'
import { pageParser, searchParser, sortParser } from '@/lib/urlState'

export function useTableUrlState() {
  return useQueryStates(
    { q: searchParser, page: pageParser, sort: sortParser },
    { history: 'replace' },
  )
}
```

Buat `hooks/useDebouncedQueryState.ts` — pola search input (menggantikan pola `query`/`debouncedQuery` di Events & Blog):

```ts
'use client'
import { useEffect, useState } from 'react'

/** Input lokal yang menulis ke URL setelah diam 300ms. Mengembalikan
 *  [input utk <input/>, setInput, committed (nilai di URL)] */
export function useDebouncedInput(
  committed: string,
  commit: (v: string | null) => void,
  delay = 300,
) {
  const [input, setInput] = useState(committed)
  useEffect(() => setInput(committed), [committed]) // sinkron saat back/forward
  useEffect(() => {
    if (input === committed) return
    const t = setTimeout(() => commit(input.trim() || null), delay)
    return () => clearTimeout(t)
  }, [input])
  return [input, setInput] as const
}
```

### 0.3 Suspense boundary

`useQueryState(s)` memakai `useSearchParams` di baliknya → komponen pemakainya harus berada di bawah `<Suspense>` agar build tidak error/de-opt. Semua page dashboard adalah thin wrapper (contoh `app/dashboard/booking/page.tsx`), jadi cukup:

```tsx
import { Suspense } from 'react'

export default function page() {
  return (
    <Suspense>
      <BookingPage />
    </Suspense>
  )
}
```

Terapkan hanya pada route yang dimigrasi (per fase), bukan sekaligus.

**Definisi selesai Fase 0:** `npm run build` hijau, adapter terpasang, tiga file util ada, belum ada halaman yang berubah perilaku.

---

## Fase 1 — `DataTable` jadi controllable (±½ hari)

File: `components/organisms/table/index.tsx`

Saat ini `sorting` dan `pagination` internal (`useState` + `initialState`). Tambahkan props opsional dengan pola controlled/uncontrolled — **halaman lama tidak perlu diubah**:

```tsx
type DataTableProps<TData> = {
  // ...props lama tetap
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  /** utk server-side pagination */
  manualPagination?: boolean
  pageCount?: number
}
```

Implementasi di dalam komponen:

```tsx
const [internalSorting, setInternalSorting] = useState<SortingState>([])
const isSortingControlled = sortingProp !== undefined
const sorting = isSortingControlled ? sortingProp : internalSorting
// idem untuk pagination; teruskan manualPagination & pageCount ke useReactTable
// state: { ...state lama, ...(paginationProp ? { pagination: paginationProp } : {}) }
```

**Definisi selesai:** halaman existing (Room, User Management, dll.) berperilaku sama persis; unit sanity check dengan satu halaman yang meng-pass `sorting` controlled.

---

## Fase 2 — Pilot: halaman Booking (±½ hari)

File: `components/pages/dashboard/booking/index.tsx` + `app/dashboard/booking/page.tsx` (Suspense).

Ini pilot karena filternya beragam (date, boolean, enum, search) dan TODO server-side filtering sudah menunggu.

```tsx
import { parseAsBoolean, parseAsString, useQueryStates } from 'nuqs'
import { enumParser, searchParser } from '@/lib/urlState'
import { useDebouncedInput } from '@/hooks/useDebouncedQueryState'

const STATUS_VALUES = ['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as const

const [filters, setFilters] = useQueryStates(
  {
    checkIn: parseAsString.withDefault(todayStr()),
    allDates: parseAsBoolean.withDefault(false),
    status: enumParser(STATUS_VALUES, 'all'),
    q: searchParser,
  },
  { history: 'replace' },
)

const [searchInput, setSearchInput] = useDebouncedInput(
  filters.q,
  (v) => setFilters({ q: v }),
)
```

Perubahan lanjutan di halaman ini:

- `useMemo` filter dummy data: ganti deps `[checkInDate, allDates, status, search]` → `[filters]`.
- Semua `setStatus(x)` → `setFilters({ status: x })`; toggle "all dates" → `setFilters({ allDates: v })`.
- Input search bind ke `searchInput`/`setSearchInput` (bukan langsung URL).
- Catatan perilaku: `withDefault(todayStr())` berarti URL tanpa `?checkIn=` selalu berarti "hari ini" — sesuai default sekarang, dan link yang di-share kemarin tanpa param tetap menunjukkan "hari ini", bukan tanggal basi. Ini yang kita mau.

**Definisi selesai (checklist QA pilot):**

1. Set filter → klik detail booking → back: filter utuh.
2. Refresh: filter utuh.
3. Copy URL ke tab baru: tampilan identik.
4. Hapus semua filter: URL kembali bersih tanpa query string.
5. Ketik cepat di search: URL hanya berubah setelah berhenti mengetik; tombol back tidak mengulang per-huruf.

Checklist yang sama dipakai untuk setiap halaman di fase berikutnya.

---

## Fase 3 — Halaman list dengan server pagination (±1–1½ hari)

Halaman-halaman ini sudah mengirim `page`/`search`/filter ke hook query — migrasinya mekanis: `useState` → `useQueryStates`, dan **setiap perubahan filter menyertakan `page: 1`** dalam satu call `setFilters`.

| Halaman | File | Param URL | Catatan khusus |
|---|---|---|---|
| Events | `components/pages/dashboard/events/index.tsx` | `q`, `phase`, `status`, `type`, `scope`, `locale`, `highlighted`, `page` | Hapus state `debouncedQuery` + `useEffect` debounce lama → ganti `useDebouncedInput`; debounce commit `{ q, page: 1 }`. `expanded`, `pendingDelete` tetap `useState`. |
| Blog | `components/pages/dashboard/blog/index.tsx` | `q`, `status`, `locale`, `page`, `sort` (`-date`/`date` gantikan `sortDesc`) | Sama seperti Events. |
| Physical Room | `components/pages/dashboard/physicalRoom/index.tsx` | `q`, `roomType`, `status`, `active`, `page` | Logika "halaman terakhir kosong setelah delete → mundur satu halaman" (`setPage(page-1)`) menjadi `setFilters({ page: page - 1 })`. `limit` tidak perlu di URL. `tooltip` tetap lokal. |
| Content Media | `components/pages/dashboard/contentMedia/index.tsx` | `q`, `type`, `locale`, `page` | `uploadOpen`, `embedOpen` tetap lokal. |
| Loyalty Vouchers | `components/pages/dashboard/loyalty/vouchers/index.tsx` | `q`, `property`, `tier`, `lang`, `sort`, `tab` (`statusTab`, pakai `history: 'push'`) | `expandedIds`, `pendingDelete`, `togglingId`, `actionError` tetap lokal. |

Integrasi TanStack Query tidak berubah bentuk — objek `filters` masuk ke hook seperti sebelumnya (mis. `useEvents({ ...mapping dari filters })`), dan karena hook query sudah menjadikan argumen sebagai `queryKey`, cache per-kombinasi filter otomatis benar.

---

## Fase 4 — Halaman ber-tab & sisa list (±1 hari)

| Halaman | File | Param URL | Catatan |
|---|---|---|---|
| Gallery | `components/pages/dashboard/gallery/index.tsx` | `tab` (scope Global/property), `locale`, `q` | `tab` pakai `tabParser` (history push). `pendingDelete` tetap lokal. |
| Site Pages | `components/pages/dashboard/sitePages/index.tsx` | `tab` (scope), `advanced` (boolean) | Semua state modal/editing tetap lokal. |
| Landing Page | `components/pages/dashboard/landingPage/index.tsx` | `tab` (scope) | `scope` bertipe `'global' \| number` → serialize sebagai string, parse balik dengan `Number()` seperti pola `onValueChange` yang sudah ada. |
| Dashboard home | `components/pages/dashboard/index.tsx` | `overview`, `amount`, `revenue`, `rooms` | Empat tab/range widget; semua `enumParser`, history `push`. Nilai default masing-masing sama dengan default sekarang (`all`, `Monthly`, `1Y`, `available`). |
| Room | `components/pages/dashboard/room/index.tsx` | `q` | `globalFilter` → URL; unit aktif tetap dari store (lihat Fase 5). |
| User Management | `components/pages/dashboard/settings/userManagement/index.tsx` | `q` | Satu param saja. |

Halaman dengan `DataTable` client-side pagination yang ingin `page`-nya juga di-preserve memakai props baru dari Fase 1 + `useTableUrlState`:

```tsx
const [{ page, sort }, setTable] = useTableUrlState()
<DataTable
  pagination={{ pageIndex: page - 1, pageSize: 20 }}
  onPaginationChange={(u) => {
    const next = typeof u === 'function' ? u({ pageIndex: page - 1, pageSize: 20 }) : u
    setTable({ page: next.pageIndex + 1 })
  }}
  sorting={sort ? [sort] : []}
  onSortingChange={(u) => {
    const next = typeof u === 'function' ? u(sort ? [sort] : []) : u
    setTable({ sort: next[0] ?? null, page: 1 })
  }}
/>
```

(Jika boilerplate ini terasa berulang di ≥3 halaman, ekstrak jadi `useDataTableUrlProps()` di hook yang sama.)

---

## Fase 5 — Konteks global, cleanup & QA (±½ hari)

1. **`store/usePropertyFilterStore.ts`** — tambah `persist` middleware (`name: 'xenia-active-unit'`) agar unit/property aktif lintas halaman survive refresh. Tetap di Zustand karena dipakai sidebar + banyak halaman (konteks, bukan filter per halaman).
2. **Tombol back manual** — halaman yang punya tombol back hard-coded ke path list (mis. User Management) diganti `router.back()` bila asalnya selalu list, supaya query string asal ikut kembali.
3. **Cleanup** — hapus state `debouncedQuery` yang tersisa, pastikan tidak ada `useState` filter yang tertinggal (grep `useState.*[Ff]ilter|statusTab|scope`).
4. **QA lintas halaman** — jalankan checklist 5 poin dari Fase 2 pada setiap halaman yang dimigrasi, plus dua skenario tambahan: (a) ganti filter saat berada di `page=3` → page kembali ke 1; (b) pindah antar menu via sidebar lalu kembali → dapat default bersih (by design: URL-lah state-nya; kalau nanti ingin "ingat filter terakhir per menu", itu layer sessionStorage terpisah di luar scope plan ini).
5. **Update dokumentasi** — tambahkan konvensi param ke `AGENTS.md`/`CLAUDE.md` supaya halaman baru langsung mengikuti pola (aturan singkat: state tampilan → `useQueryStates` dari `lib/urlState`, state interaksi → `useState`).

---

## Urutan, Estimasi & Risiko

| Fase | Isi | Estimasi |
|---|---|---|
| 0 | nuqs + adapter + util | ½ hari |
| 1 | DataTable controllable | ½ hari |
| 2 | Pilot Booking + QA pola | ½ hari |
| 3 | Events, Blog, Physical Room, Content Media, Vouchers | 1–1½ hari |
| 4 | Halaman tab + sisa list | 1 hari |
| 5 | Store persist, cleanup, QA, docs | ½ hari |
| **Total** | | **±4–4½ hari kerja** |

**Risiko & mitigasi:**

- *Suspense/build error di route yang lupa dibungkus* → error muncul saat `npm run build`; jalankan build di akhir tiap fase.
- *Loop render karena setter dipanggil saat render* (mis. sinkronisasi input) → semua sinkronisasi lewat `useEffect` seperti di `useDebouncedInput`; jangan panggil `setFilters` di body render.
- *Param name drift antar halaman* → semua parser diimpor dari `lib/urlState.ts`; review PR menolak parser inline baru.
- *Regresi halaman yang belum dimigrasi* → props DataTable opsional (uncontrolled fallback), sehingga fase 1 tidak menyentuh perilaku lama.
- *Konflik dengan `LEGACY_BOOKING_ENABLED`* → pilot Booking berada di balik feature flag; kalau flag mati di env target, jadikan Events sebagai pilot pengganti (pola identik).

---

## Hasil rollout (2 September 2026)

Semua fase sudah dikerjakan. Konvensi ringkasnya sekarang juga ada di
`AGENTS.md` supaya halaman baru langsung mengikuti pola.

### Param per halaman

| Halaman | Param |
| --- | --- |
| Booking (pilot) | `checkIn`, `allDates`, `status`, `q`, `page` |
| Events | `q`, `phase`, `status`, `type`, `scope`, `locale`, `highlighted`, `page` |
| Blog | `q`, `status`, `locale`, `sort` (`-date`/`date`), `page` |
| Physical Room | `q`, `roomType`, `status`, `active`, `page` |
| Media | `q`, `type`, `locale`, `page` |
| Vouchers | `q`, `property`, `tier`, `lang`, `sort`, `tab` (push) |
| Members | `q`, `tier`, `page` |
| Deals / Promo | `q`, `property`, `category`, `benefit`, `workflow`, `availability`, `page` |
| Activities | `q`, `status`, `surface`, `property`, `page` |
| Block Date | `property`, `period`, `inactive` |
| Gallery | `tab` (push), `locale`, `q` |
| Site Pages | `tab` (push), `advanced` |
| Dashboard home | `overview`, `amount`, `revenue`, `rooms` |
| Room / Room Category / Permission / User Management | `q`, `page`, `sort` |
| Rate Plan | `q`, `active` |
| Section detail | `tab` (push), `locale`, `advanced` |
| Page content (kartu & tabbed) | `locale`, `advanced` |
| Public Response | `scope`, `locale` |
| Activities detail & settings, Loyalty tiers | `locale` |
| Gallery detail | `lang` (sebelumnya hanya dibaca, sekarang ditulis juga) |

### Penyimpangan dari plan

- **Dashboard home memakai `history: 'replace'`,** bukan `push`. Empat toggle
  widget di satu layar: kalau tiap klik menambah entry, tombol back jadi
  menelusuri kombinasi widget alih-alih meninggalkan halaman.
- **`sortParser` disimpan sebagai string** (`kolom` / `-kolom`) dengan helper
  `sortToSortingState` / `sortingStateToSort`, bukan custom parser objek —
  lebih mudah dibaca di URL dan bebas dari masalah identitas objek.
- **`useDataTableUrlProps()`** dibuat karena boilerplate updater
  sorting/pagination muncul di lima halaman (Room, Room Category, Permission,
  User Management, dan siap dipakai halaman berikutnya).
- **Form create/update tidak ikut.** Tab bahasa di sana bagian dari proses
  mengisi, bukan tampilan yang perlu di-refresh atau di-share.
- **Tombol back di halaman detail belum diseragamkan.** User Management dan
  Permission sudah `router.back()` (query string ikut kembali), tapi halaman
  detail yang memakai `Heading backUrl="..."` masih menavigasi ke path list
  polos — tombol back browser tetap benar. Kalau mau diseragamkan, itu
  keputusan terpisah: `router.back()` berisiko keluar dari aplikasi kalau
  halaman detail dibuka langsung dari link.

### Bug yang ikut terbawa saat migrasi

- **Physical Room:** `handleSearch` tidak pernah dipasang ke UI, jadi kolom
  search di halaman itu sebelumnya tidak berpengaruh sama sekali.
- **Physical Room:** effect yang me-reset filter saat property global berganti
  juga jalan di render pertama — dengan filter di URL itu berarti link yang
  di-share akan langsung kehilangan filternya. Sekarang run pertama dilewati.
- **Media:** search sebelumnya menembak request tiap ketikan; sekarang
  di-debounce seperti halaman lain.

### Yang masih perlu dicek manual di Mac

`next build` / `next dev` tidak bisa dijalankan dari workspace VM
(node_modules darwin-arm64). Verifikasi di sini hanya `tsc --noEmit` + eslint.
Checklist QA 5 poin di Fase 2 belum dijalankan di browser.
