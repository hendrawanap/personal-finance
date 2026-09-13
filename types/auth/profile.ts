import { Permission } from "./permission.type";

/**
 * Batas property akun ini, apa adanya seperti yang dikirim GET /auth/profile.
 *
 * Bentuknya cermin dari PropertyScope di xenia-dashboard-be
 * (src/common/security/property-scope.ts). Isinya datang dari klaim `rbac` di
 * JWT, jadi ia ikut basi bersama permission: perubahan jatah baru terasa
 * setelah token di-refresh.
 *
 * `kind: 'selected'` dengan `propertyIds: []` BUKAN sama dengan `kind: 'all'` —
 * itu akun yang dibatasi tapi belum diberi satu pun property, dan memang tidak
 * boleh melihat apa-apa.
 */
export type PropertyScope =
  | { kind: "all" }
  | { kind: "selected"; propertyIds: number[] };

export interface AuthProfile {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: Permission[];
  /**
   * Opsional karena token yang terbit SEBELUM fitur ini ada tidak membawanya.
   * Tidak ada = tidak dibatasi, sama seperti yang dilakukan BE.
   */
  propertyScope?: PropertyScope;
}