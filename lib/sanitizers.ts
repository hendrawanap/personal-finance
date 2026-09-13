/**
 * Sanitizer input bersama untuk form dashboard (dipakai form property
 * create/update). Perilaku identik dengan helper lokal yang digantikannya —
 * jangan mengubah tanpa mengecek kedua form.
 */

/** Digits only — for phone & postal code */
export const onlyDigits = (v: string) => v.replace(/\D/g, '')

/** Decimal with optional leading minus — for latitude/longitude */
export const toSignedDecimal = (v: string) => {
  let s = v.replace(/,/g, '.').replace(/[^\d.-]/g, '')
  // minus is only allowed in the first position
  s = s.charAt(0) + s.slice(1).replace(/-/g, '')
  // only one decimal point allowed
  const dot = s.indexOf('.')
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '')
  return s
}

/** Emails never contain spaces */
export const noSpaces = (v: string) => v.replace(/\s/g, '')

/** input type="time" gives "HH:MM", BE expects "HH:MM:SS" */
export const toHms = (v: string) => (v.length === 5 ? `${v}:00` : v)

/** Slug is also used as the upload directory name on the file service */
export const toSlug = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
