# Fondasi UI dashboard

Ditulis setelah audit konsistensi (Sep 2026, lihat project doc
`dashboard-fe-ui-consistency-audit`). Ringkasan masalah yang ditemukan:
3.642 warna hex vs 849 token, 365 `<button>` manual, 7 varian pembungkus
halaman, ≥15 modal hapus lokal, ≥12 `inputClass` lokal, `font-display` dan
`text-text` yang tidak pernah terdefinisi.

## 1. Token warna — `app/globals.css`

Namespace kanonik: **`xenia-*`**. Nama lama (`sand-*`, `forest-*`, `moss-*`,
`ink*`, `line*`, `surface*`, `brand*`, `danger*`, `text*`) tetap ada sebagai
alias supaya kode lama tidak rusak, tapi dilarang di kode baru.

| Peran | Token |
| --- | --- |
| Latar halaman / panel / hover | `xenia-canvas`, `xenia-cream`, `xenia-surface-hover`, `xenia-sand-100`, `xenia-sage-100` |
| Garis | `xenia-border`, `xenia-divider` |
| Teks | `xenia-ink-900`, `xenia-stone-700`, `xenia-stone-500`, `xenia-stone-400` |
| Aksen | `xenia-moss-600` (utama), `xenia-moss-700` (hover), `xenia-moss-800`, `xenia-forest-900/950`, `xenia-brass-500` |
| Semantik | `xenia-danger`, `xenia-danger-ink`, `xenia-danger-soft`, `xenia-danger-line`, `xenia-ok-bg/ink`, `xenia-warn-bg/ink`, `xenia-info-bg/ink`, `xenia-idle-bg/ink` |
| Overlay dialog | `bg-xenia-forest-950/60` |

Variabel shadcn (`--primary`, `--border`, `--ring`, `--muted`, …) kini
menunjuk palet yang sama, jadi `ui/*` dan kelas `bg-primary`/`border-border`
ikut tema (sebelumnya hitam/abu default).

`--font-display` dan `--font-ui` didaftarkan (menunjuk ke sans). Kalau
heading mau serif, ganti `--font-display` ke `var(--font-cormorant-garamond)`
di satu tempat.

## 2. Komponen

- `molecules/dashboard/pageShell` — `PageShell`
- `molecules/dashboard/head` — `Heading` (satu gaya; `variant` deprecated; prop baru `actions`)
- `atoms/buttons`, `atoms/links`, `atoms/buttonStyles` — `style: main|second|outline|ghost|third|fourth`, `size: sm|md|icon`, `loading`
- `molecules/inputs/form` — `Field`, `TextInput`, `TextArea`, `NativeSelect`, `Switch`, `FormSection`, `FormFooter`, `controlClass`, `LABEL_CLASS`
- `molecules/inputs/inputs` — `Input` (palet sudah Xenia; API sama)
- `molecules/inputs/formFields` — alias `Field`
- `atoms/toggle` — `Toggles` (`variant="card|plain"`), `atoms/checkboxFields`, `atoms/searchBar` (`className` mengatur lebar), `atoms/selects` (`filter` = toolbar, `form` = di form)
- `molecules/dashboard/unit/dialogShell` — `DialogShell`
- `molecules/dashboard/unit/confirmDialog` — `ConfirmDialog` (`open`, `isPending`, `error`, `tone`, `typedConfirmation`; label default Inggris)
- `atoms/statusBadge` + `constant/status` — `StatusBadge`
- `atoms/pillTabs` — `PillTabs`
- `molecules/dashboard/unit/noticeBox` — `NoticeBox`
- `molecules/dashboard/unit/detailList` — `DetailList`, `DetailRow`
- `molecules/dashboard/unit/pagination` — `Pagination` (dipakai footer `DataTable`)
- `organisms/table` — `DataTable` (+ `totalItems`)
- `organisms/contentMedia/mediaDialog` — kini pembungkus tipis `DialogShell` (deprecated)

## 3. Urutan migrasi halaman

1. settings (sudah — contoh referensi)
2. booking, contentMedia
3. loyalty
4. room / roomCategory / physicalRoom / facility
5. property / ratePlan / promo
6. blog / events / gallery / activities / sitePages

Per halaman: ganti wrapper → `PageShell`; `h1` → `Heading`; tombol →
`Buttons`/`Links`; form → form kit; modal → `ConfirmDialog`/`DialogShell`;
badge → `StatusBadge`; hex → token; lalu naikkan aturan ESLint folder itu ke
`error`.
