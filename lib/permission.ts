/**
 * Helper permission bersama — dipakai kolom tabel Permissions, halaman
 * detail user, dan picker permission di dialog role/user.
 */

/** Prefix resource dari `name` — handle ":" dan "." (`blog:create` → `blog`). */
export function resourceOf(name: string): string {
  return name.split(/[:.]/)[0] || 'other'
}

/**
 * Kelompokkan permission per resource, urutan mengikuti kemunculan pertama.
 * Mengembalikan `[resource, permissions][]` supaya gampang di-map.
 */
export function groupByResource<T extends { name: string }>(
  permissions: readonly T[],
): Array<[string, T[]]> {
  const groups = new Map<string, T[]>()
  for (const p of permissions) {
    const resource = resourceOf(p.name)
    const existing = groups.get(resource)
    if (existing) existing.push(p)
    else groups.set(resource, [p])
  }
  return Array.from(groups.entries())
}

/** Filter katalog permission berdasarkan label/name (case-insensitive). */
export function filterPermissions<T extends { name: string; label: string }>(
  permissions: readonly T[] | undefined,
  search: string,
): T[] {
  if (!permissions) return []
  const q = search.trim().toLowerCase()
  if (q === '') return [...permissions]
  return permissions.filter(
    (p) =>
      p.label.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
  )
}
