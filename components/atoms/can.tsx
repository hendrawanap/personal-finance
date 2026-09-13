"use client";

import type { ReactNode } from "react";

import { usePermissions } from "@/hooks/usePermissions";
import type { Permission } from "@/types/auth/permission.type";

type CanProps = {
  /** Satu permission, atau daftar. */
  permission: Permission | Permission[];
  /** true = butuh SEMUA yang disebut. Default: cukup salah satu. */
  requireAll?: boolean;
  /** Ditampilkan saat tidak berhak. Default: tidak merender apa pun. */
  fallback?: ReactNode;
  children: ReactNode;
};

/**
 * Bentuk deklaratif untuk menyembunyikan tombol/aksi.
 *
 *   <Can permission="property:force-delete">
 *     <Button onClick={...}>Force delete</Button>
 *   </Can>
 *
 * Saat profil masih dimuat, komponen ini merender `fallback` — bukan children —
 * supaya tombol tidak sempat muncul lalu hilang. Efek sampingnya: tombol baru
 * muncul setelah GET /auth/profile selesai (react-query menyimpannya 5 menit,
 * jadi hanya terasa di load pertama).
 */
export default function Can({
  permission,
  requireAll = false,
  fallback = null,
  children,
}: CanProps) {
  const { can, canAll, canAny, isLoading } = usePermissions();

  if (isLoading) return <>{fallback}</>;

  const list = Array.isArray(permission) ? permission : [permission];
  const allowed =
    list.length === 1
      ? can(list[0])
      : requireAll
        ? canAll(...list)
        : canAny(...list);

  return <>{allowed ? children : fallback}</>;
}
