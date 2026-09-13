"use client";

import { useMemo } from "react";

import { useProfile } from "@/hooks/query/auth/profile";
import {
  allowedPropertyIds,
  canAccessProperty,
  canAccessRoute,
  canEditEstateWide,
  hasAll,
  hasAny,
  hasPermission,
  hasRole,
  isPropertyUnrestricted,
  searchableDestinations,
  visibleNavEntries,
  visibleSettingCards,
} from "@/lib/access";
import type { Permission } from "@/types/auth/permission.type";

/**
 * Satu-satunya cara komponen membaca permission.
 *
 * `isLoading` penting: sebelum GET /auth/profile selesai, `can()` mengembalikan
 * false untuk semua. Merender tombol berdasarkan itu membuat tombolnya berkedip
 * hilang lalu muncul — jadi tunggu `isLoading` selesai dulu, atau pakai <Can>
 * yang sudah menanganinya.
 */
export function usePermissions() {
  const { data: profile, isLoading, isError } = useProfile();

  return useMemo(
    () => ({
      profile,
      isLoading,
      isError,
      can: (permission: Permission) => hasPermission(profile, permission),
      canAll: (...permissions: Permission[]) => hasAll(profile, ...permissions),
      canAny: (...permissions: Permission[]) => hasAny(profile, ...permissions),
      hasRole: (role: string) => hasRole(profile, role),
      canAccessRoute: (pathname: string) => canAccessRoute(profile, pathname),
      navEntries: visibleNavEntries(profile),
      settingCards: visibleSettingCards(profile),
      // Tujuan global search (⌘K) — proyeksi ROUTE_ACCESS yang sama, tapi juga
      // memuat sub-halaman yang tidak punya entry menu.
      searchDestinations: searchableDestinations(profile),

      // ── batas property ──────────────────────────────────────────────────
      // Daftar yang datang dari API sudah tersaring, jadi ini dipakai untuk
      // AKSI, bukan untuk menyaring ulang data: sembunyikan tombol yang pasti
      // 403 alih-alih membiarkan orang mengisi form lalu ditolak.
      allowedPropertyIds: allowedPropertyIds(profile),
      isPropertyUnrestricted: isPropertyUnrestricted(profile),
      canAccessProperty: (propertyId: number | null | undefined) =>
        canAccessProperty(profile, propertyId),
      canEditEstateWide: canEditEstateWide(profile),
    }),
    [profile, isLoading, isError],
  );
}
