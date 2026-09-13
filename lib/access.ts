import {
  NAV_GROUPS,
  ROUTE_ACCESS,
  type NavGroupKey,
  type NavIcon,
  type RouteAccess,
} from "@/constant/routeAccess";
import type { SearchDestination } from "@/lib/globalSearch";
import type { Permission } from "@/types/auth/permission.type";
import type { AuthProfile, PropertyScope } from "@/types/auth/profile";

/**
 * Pembacaan permission untuk UI. Semua pengecekan di dashboard lewat sini atau
 * lewat hooks/usePermissions.ts — jangan menyentuh `profile.permissions`
 * langsung di komponen.
 *
 * Ingat: ini pagar UX. Yang menolak request beneran adalah PermissionsGuard di
 * xenia-dashboard-be. Lihat catatan di constant/routeAccess.ts.
 */

export function hasPermission(
  profile: AuthProfile | undefined,
  permission: Permission,
): boolean {
  return profile?.permissions.includes(permission) ?? false;
}

export function hasRole(
  profile: AuthProfile | undefined,
  role: string,
): boolean {
  return profile?.roles.includes(role) ?? false;
}

/** Butuh SEMUA permission yang disebut. */
export function hasAll(
  profile: AuthProfile | undefined,
  ...permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(profile, p));
}

/** Cukup SALAH SATU. Daftar kosong = true, sama seperti Array.some terbalik. */
export function hasAny(
  profile: AuthProfile | undefined,
  ...permissions: Permission[]
): boolean {
  if (permissions.length === 0) return true;
  return permissions.some((p) => hasPermission(profile, p));
}

function satisfies(
  profile: AuthProfile | undefined,
  required: Permission | readonly Permission[],
): boolean {
  return Array.isArray(required)
    ? hasAny(profile, ...(required as Permission[]))
    : hasPermission(profile, required as Permission);
}

export function canAccess(
  profile: AuthProfile | undefined,
  entry: Pick<RouteAccess, "permission">,
): boolean {
  return satisfies(profile, entry.permission);
}

/**
 * Skor kecocokan pattern terhadap pathname. Segmen literal bernilai 2 dan
 * wildcard (':id') bernilai 1, jadi "/dashboard/room/category" menang atas
 * "/dashboard/room/:slug" untuk path yang sama — tanpa itu halaman kategori
 * ikut terjaga oleh permission halaman detail kamar.
 */
function matchScore(pattern: string, pathname: string): number | null {
  const p = pattern.split("/");
  const a = pathname.split("/");
  if (p.length !== a.length) return null;

  let score = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) score += 1;
    else if (p[i] === a[i]) score += 2;
    else return null;
  }
  return score;
}

/** Entry paling spesifik untuk sebuah pathname, atau undefined kalau tidak terdaftar. */
export function routeAccessFor(pathname: string): RouteAccess | undefined {
  let best: RouteAccess | undefined;
  let bestScore = -1;

  for (const entry of ROUTE_ACCESS) {
    const score = matchScore(entry.pattern, pathname);
    if (score !== null && score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Route yang tidak terdaftar di ROUTE_ACCESS dibiarkan LEWAT, bukan ditolak.
 *
 * Alasannya: menolak berarti route baru yang lupa didaftarkan tampil sebagai
 * "Forbidden" untuk semua orang termasuk admin — kegagalan yang terlihat
 * seperti bug produk. Melewatkan berarti halamannya terbuka tapi API-nya tetap
 * menolak, yang jauh lebih mudah didiagnosis. Peringatan di bawah supaya tidak
 * ada yang lolos diam-diam saat development.
 */
export function canAccessRoute(
  profile: AuthProfile | undefined,
  pathname: string,
): boolean {
  const entry = routeAccessFor(pathname);
  if (!entry) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[access] "${pathname}" belum terdaftar di ROUTE_ACCESS — dibiarkan terbuka. Tambahkan entry-nya di constant/routeAccess.ts.`,
      );
    }
    return true;
  }
  return canAccess(profile, entry);
}

export type NavLink = {
  kind: "link";
  href: string;
  label: string;
  icon: NavIcon;
};

export type NavGroup = {
  kind: "group";
  key: NavGroupKey;
  label: string;
  icon: NavIcon;
  items: Omit<NavLink, "kind">[];
};

export type NavEntry = NavLink | NavGroup;

/**
 * Entry sidebar yang boleh dilihat profil ini, urut sesuai ROUTE_ACCESS.
 *
 * Entry ber-`nav.group` dikumpulkan jadi satu NavGroup yang menempati posisi
 * anggota pertamanya, jadi urutan menu tetap ditentukan oleh satu tempat:
 * urutan array ROUTE_ACCESS. Grup yang semua anaknya tersaring permission
 * tidak pernah dibuat, jadi tidak ada grup kosong di sidebar.
 */
export function visibleNavEntries(profile: AuthProfile | undefined): NavEntry[] {
  const entries: NavEntry[] = [];
  const groupAt = new Map<NavGroupKey, NavGroup>();

  for (const entry of ROUTE_ACCESS) {
    if (!entry.nav || !canAccess(profile, entry)) continue;

    const item = {
      href: entry.pattern,
      label: entry.nav.label,
      icon: entry.nav.icon,
    };

    const groupKey = entry.nav.group;
    if (!groupKey) {
      entries.push({ kind: "link", ...item });
      continue;
    }

    let group = groupAt.get(groupKey);
    if (!group) {
      group = { kind: "group", key: groupKey, ...NAV_GROUPS[groupKey], items: [] };
      groupAt.set(groupKey, group);
      entries.push(group);
    }
    group.items.push(item);
  }

  return entries;
}

/* ───────────────────────────── global search ──────────────────────────────
 *
 * Proyeksi KEEMPAT dari ROUTE_ACCESS: daftar halaman yang bisa dilompati dari
 * kotak pencarian (⌘K). Aturannya sama dengan sidebar — yang tidak lolos
 * permission tidak pernah sampai ke browser sebagai hasil — bedanya cakupannya
 * jauh lebih luas: bukan cuma menu, tapi juga sub-halaman seperti Room
 * Categories atau Master Facility for Property yang tidak punya entry menu.
 */

/** Pattern dengan segmen ':id' bukan tujuan konkret — tidak ada URL-nya. */
function isJumpable(pattern: string): boolean {
  return !pattern.split("/").some((segment) => segment.startsWith(":"));
}

/** Judul baris: `search.title` menang, lalu nav, lalu kartu Settings. */
function searchTitleOf(entry: RouteAccess): string | undefined {
  return entry.search?.title ?? entry.nav?.label ?? entry.card?.title;
}

/**
 * Section sebuah halaman = entry ber-`nav` TERDEKAT di atasnya (atau dirinya
 * sendiri), diambil label grupnya kalau menu itu bergrup.
 *
 * Diturunkan, bukan ditulis ulang per entry, supaya memindahkan menu ke grup
 * lain ikut memindahkan seluruh sub-halamannya di hasil pencarian. Hasilnya
 * persis level teratas sidebar: Dashboard · Properties · Booking · Content ·
 * Loyalty · Settings.
 */
function sectionOf(pattern: string): string | undefined {
  let best: string | undefined;
  let bestLength = -1;

  for (const entry of ROUTE_ACCESS) {
    if (!entry.nav) continue;
    const owner = entry.pattern;
    const owns = pattern === owner || pattern.startsWith(`${owner}/`);
    if (!owns || owner.length <= bestLength) continue;

    bestLength = owner.length;
    best = entry.nav.group
      ? NAV_GROUPS[entry.nav.group].label
      : entry.nav.label;
  }

  return best;
}

/**
 * Semua halaman yang boleh dibuka profil ini, urut sesuai ROUTE_ACCESS.
 *
 * Peringatan yang sama seperti di seluruh file ini: ini pagar UX. Menyembunyikan
 * sebuah halaman dari pencarian tidak mengamankan apa pun — yang menolak
 * request tetap PermissionsGuard di xenia-dashboard-be. Gunanya supaya orang
 * tidak melompat ke layar yang pasti menyambutnya dengan Forbidden.
 */
export function searchableDestinations(
  profile: AuthProfile | undefined,
): SearchDestination[] {
  const destinations: SearchDestination[] = [];

  for (const entry of ROUTE_ACCESS) {
    if (!isJumpable(entry.pattern)) continue;
    const title = searchTitleOf(entry);
    if (!title) continue;
    if (!canAccess(profile, entry)) continue;

    destinations.push({
      href: entry.pattern,
      title,
      section: sectionOf(entry.search?.under ?? entry.pattern),
      keywords: entry.search?.keywords,
    });
  }

  return destinations;
}

/** Kartu di halaman Settings yang boleh dilihat profil ini. */
export function visibleSettingCards(profile: AuthProfile | undefined) {
  return ROUTE_ACCESS.filter(
    (entry) => entry.card && canAccess(profile, entry),
  ).map((entry) => ({
    href: entry.pattern,
    ...entry.card!,
  }));
}

/**
 * Nama permission yang dibutuhkan sebuah route, untuk ditampilkan di layar
 * Forbidden. `readonly Permission[]` tidak dipersempit oleh Array.isArray,
 * jadi normalisasinya dikerjakan di sini sekali saja.
 */
export function requiredPermissionLabel(pathname: string): string | undefined {
  const entry = routeAccessFor(pathname);
  if (!entry) return undefined;

  const required: readonly Permission[] =
    typeof entry.permission === "string"
      ? [entry.permission]
      : entry.permission;

  return required.join(" or ");
}

/* ────────────────────────────── batas property ────────────────────────────
 *
 * Pasangan dari permission, bukan penggantinya: permission menjawab "boleh
 * kata kerja apa", ini menjawab "atas property yang mana". Cermin dari
 * @common/security/property-scope.ts di xenia-dashboard-be.
 *
 * Sama seperti pengecekan permission di atas, ini PAGAR UX. Yang benar-benar
 * menolak adalah PropertyScopeInterceptor dan pemeriksaan di tiap service.
 * Daftar yang sampai ke browser pun sudah tersaring di API — jadi kebanyakan
 * layar tidak perlu memanggil apa pun di sini; yang butuh cuma layar yang
 * menawarkan aksi LINTAS property.
 */

/** Profil tanpa klaim scope (token lama) dibaca sebagai tidak dibatasi. */
export function propertyScopeOf(
  profile: AuthProfile | undefined,
): PropertyScope {
  return profile?.propertyScope ?? { kind: "all" };
}

export function isPropertyUnrestricted(
  profile: AuthProfile | undefined,
): boolean {
  return propertyScopeOf(profile).kind === "all";
}

/** Id property yang boleh disentuh, atau undefined kalau tidak dibatasi. */
export function allowedPropertyIds(
  profile: AuthProfile | undefined,
): number[] | undefined {
  const scope = propertyScopeOf(profile);
  return scope.kind === "all" ? undefined : scope.propertyIds;
}

export function canAccessProperty(
  profile: AuthProfile | undefined,
  propertyId: number | null | undefined,
): boolean {
  const scope = propertyScopeOf(profile);
  if (scope.kind === "all") return true;
  // null = baris global (gallery/event/section tanpa property). Boleh dibaca
  // semua orang; yang dilarang adalah menulisnya — lihat canEditEstateWide.
  if (propertyId === null || propertyId === undefined) return true;
  return scope.propertyIds.includes(Number(propertyId));
}

/**
 * Boleh mengubah sesuatu yang berlaku untuk SELURUH estate — section global,
 * gallery global, urutan tampil property, skema CMS.
 *
 * Cuma akun tanpa batasan. Pakai ini untuk menyembunyikan tombolnya, supaya
 * orangnya tidak menemukan 403 setelah mengisi satu form penuh.
 */
export function canEditEstateWide(profile: AuthProfile | undefined): boolean {
  return isPropertyUnrestricted(profile);
}
