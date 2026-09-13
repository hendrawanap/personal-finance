"use client";

import { usePathname } from "next/navigation";

import ForbiddenState from "@/components/organisms/feedback/forbiddenState";
import LoadingState from "@/components/organisms/feedback/loadingState";
import { usePermissions } from "@/hooks/usePermissions";
import { requiredPermissionLabel } from "@/lib/access";

/**
 * Penjaga route dipasang SEKALI di app/dashboard/layout.tsx, jadi tidak ada
 * halaman yang perlu ingat menjaga dirinya sendiri.
 *
 * Kenapa di client dan bukan di proxy.ts: klaim `rbac` di dalam JWT dashboard
 * terenkripsi dengan kunci milik server, jadi middleware tidak punya cara
 * membaca permission. Konsekuensinya ada jeda singkat sebelum profil selesai
 * dimuat — itu diisi LoadingState, bukan konten halaman, supaya isi halaman
 * yang tidak boleh dilihat tidak sempat terender.
 *
 * Kalau GET /auth/profile gagal, children tetap dirender: axiosPrivate sudah
 * menangani 401 dengan refresh lalu redirect ke /login, dan menahan seluruh
 * dashboard karena satu request gagal hanya mengubah error jaringan menjadi
 * layar buntu.
 */
export default function RouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isLoading, isError, canAccessRoute } = usePermissions();

  if (isLoading) {
    return (
      <div className="px-6 py-10 md:px-10">
        <LoadingState message="Checking your access..." />
      </div>
    );
  }

  if (!isError && !canAccessRoute(pathname)) {
    return (
      <div className="px-6 py-10 md:px-10">
        <ForbiddenState
          requiredPermission={requiredPermissionLabel(pathname)}
        />
      </div>
    );
  }

  return <>{children}</>;
}
