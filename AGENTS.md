<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# URL state (filter, tab, search, pagination)

Halaman dashboard menyimpan **state tampilan** di URL search params memakai
[nuqs], bukan `useState` — supaya filter bertahan saat refresh, saat kembali
dari halaman detail, dan bisa di-share sebagai link.

Aturan singkatnya:

- **State tampilan** (apa yang sedang dilihat: filter, tab, search, sort,
  halaman, mode) → `useQueryState`/`useQueryStates` dengan parser dari
  `lib/urlState.ts`.
- **State interaksi** (modal terbuka, baris yang di-expand, konfirmasi hapus,
  draft form yang belum disimpan) → tetap `useState`.
- **Konteks lintas halaman** (unit/property aktif di sidebar) → tetap Zustand
  (`store/usePropertyFilterStore`, di-persist ke localStorage).

Konvensi nama param — impor parser-nya, jangan bikin parser inline baru:

| Param | Parser | Catatan |
| --- | --- | --- |
| `?q=` | `searchParser` | selalu lewat `useDebouncedInput` |
| `?page=` | `pageParser` | 1-based |
| `?sort=` | `sortParser` | `kolom` / `-kolom` |
| `?tab=` | `tabParser(default)` / `tabEnumParser(values, default)` | history `push` |
| filter enum | `enumParser(values, default)` | nilai tak dikenal jatuh ke default |
| filter boolean | `booleanParser` | |

Hal yang mudah terlewat:

1. Nilai default **tidak** ditulis ke URL — bersihkan filter, URL ikut bersih.
2. Setiap perubahan filter/search harus menyertakan `page: 1` dalam **satu**
   call `setFilters`, bukan dua call terpisah.
3. Filter/search/sort memakai `history: 'replace'`; hanya tab yang `push`,
   supaya tombol back mengembalikan tab sebelumnya dan tidak mengulang
   per-huruf ketikan.
4. Halaman yang membaca search params **wajib** dibungkus `<Suspense>` di
   `app/**/page.tsx`-nya, kalau tidak build-nya gagal.
5. Halaman dengan `<DataTable>` paginasi client-side memakai
   `useDataTableUrlProps()` (`hooks/useTableUrlState.ts`) — jangan menulis
   ulang boilerplate updater sorting/pagination.
6. Jangan memanggil setter URL di body render; sinkronisasi lewat `useEffect`
   (lihat `hooks/useDebouncedInput.ts`), dan kalau ada effect yang me-reset
   filter, lewati run pertama supaya filter dari URL tidak terhapus.

Rencana & catatan rollout: `docs/nuqs-implementation-plan.md`,
`docs/preserve-filter-tab-state.md`.

# Back navigation

Setiap tombol back di dashboard adalah **browser back sungguhan**, bukan link
ke route induk — kalau di-hardcode, filter, tab, dan posisi scroll halaman list
yang tersimpan di URL ikut hilang.

- Panah di header → `<Heading backUrl="..." />` atau `<BackButton fallbackUrl="..." />`.
- Cancel di form / back dari dalam handler → `const goBack = useGoBack('...')`.
- Back **melompati** entry riwayat yang pathname-nya sama dan hanya beda query.
  Tab memakai `history: 'push'` (aturan 3 di atas), jadi back dari halaman
  detail yang tab-nya sempat diganti empat kali kembali ke halaman list, bukan
  ke halaman yang sama pada tab sebelumnya. Tombol back browser tetap
  menelusuri tab satu per satu — itu memang gunanya `push`.
- Prop `backUrl` / `fallbackUrl` / `cancelPath` / `cancelHref` **hanya**
  tujuan darurat saat tidak ada lagi halaman lain untuk dituju (URL di-paste,
  tab baru, refresh, atau riwayat isinya halaman ini semua). Bukan tujuan
  normal tombolnya.
- Jangan menulis `<Link href="/dashboard/...">` untuk panah back atau tombol
  Cancel, dan jangan memanggil `router.back()` langsung di komponen — itu
  melewati kedua aturan di atas.

Detail: `docs/back-navigation.md`.

# Komponen wajib (konsistensi UI)

Halaman dashboard **tidak boleh** mendefinisikan sendiri: warna hex di
`className`, `inputClass`/`Field`/`SectionCard`, `<h1>` header, modal/overlay,
badge status, atau pembungkus halaman. Semua sudah ada — kalau kurang,
tambahkan prop di komponen bersama, jangan bikin versi lokal.

| Kebutuhan | Pakai | Jangan |
| --- | --- | --- |
| Pembungkus halaman | `<PageShell width="default\|narrow\|full">` (`molecules/dashboard/pageShell`) | `<main className="flex-1 bg-[#F2ECDD] p-6">`, `min-h-screen` |
| Judul halaman | `<Heading title subtitle backUrl noIcon badge actions>` | `<h1>` manual, `BackButton` di samping `Heading noIcon` |
| Tombol | `<Buttons style size loading icon>` / `<Links path style size>` | `<button className="bg-[#4F6B52]…">`, `<Link><Buttons/></Link>` |
| Warna | token `xenia-*` (`bg-xenia-moss-600`, `text-xenia-stone-500`, `border-xenia-border`, `text-xenia-danger`) | `#4F6B52`, `red-600`, `neutral-500`, `sand-50`, `forest-950` |
| Input/textarea/select | `Field` + `TextInput`/`TextArea`/`NativeSelect` (`molecules/inputs/form`), `Selects` untuk opsi array, `Input` untuk sanitasi angka | `inputClass` lokal, `<label className="text-xs …">` |
| Kelompok field | `<FormSection title description actions>` | `SectionCard`/`FormCard`/`ActivityFormCard` |
| Footer form | `<FormFooter sticky start>` + `Buttons` (Cancel via `useGoBack`, submit paling kanan) | footer manual |
| Switch / checkbox | `Switch` (polos), `Toggles` (berlabel), `CheckboxFields` | switch manual |
| Tabel | `DataTable` (+ `useDataTableUrlProps`, `manualPagination`, `getSubRows`, `totalItems`) | `<table>` manual, pager manual |
| Pager list non-tabel | `<Pagination page pageCount totalItems pageSize>` | tombol Prev/Next manual |
| Search & filter toolbar | `SearchBars className` + `Selects variant="filter"` | `<input>` search manual |
| Switcher kecil (locale, view, status) | `<PillTabs options value onChange>` — nilainya di URL | pill manual `bg-[#EAE3D2] p-1` |
| Tab konten berpanel | `ui/tabs` | tab manual |
| Status chip | `<StatusBadge status>` (+ `constant/status.ts`) | `STATUS_BADGE` lokal, `<span className="rounded-full bg-[#E4EFE2]">` |
| Konfirmasi | `<ConfirmDialog title description isPending error typedConfirmation>` | `window.confirm`, `DeleteXModal` lokal |
| Modal lain | `<DialogShell open onClose title footer size>` | `fixed inset-0 bg-black/40` manual |
| Loading / error / kosong | `LoadingState` / `ErrorState` / `EmptyState` (`organisms/feedback`) | `<p>Loading…</p>`, `<td>` teks, skeleton manual |
| Banner inline | `<NoticeBox tone="success\|error\|warning\|info">` | kotak berwarna manual |
| Label–nilai di detail | `<DetailList><DetailRow label>…` | `InfoRow`/`Row`/`Fact` lokal |
| Umpan balik mutasi | `toast.success/error` (react-hot-toast), pesan Bahasa Inggris | notice inline, tanpa feedback |

Aturan tambahan:

- Bahasa UI: **Inggris**, termasuk toast di hook dan aria-label.
- Halaman list/hub: `Heading noIcon`. Sub-halaman: `Heading backUrl="…"` (wajib diisi).
- ESLint memberi `warn` untuk hex/palet Tailwind di `className` dan
  `window.confirm`; folder yang sudah dimigrasi dinaikkan ke `error`.
- Contoh halaman yang sudah memakai semua ini: `components/pages/dashboard/settings/userManagement/**`.
- Detail & alasan: `docs/ui-foundation.md`.
