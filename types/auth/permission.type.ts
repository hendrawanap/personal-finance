/**
 * Permissions registry for Personal Finance.
 */
export const PERMISSIONS = [
  // ── access & identity ────────────────────────────────────────────────────
  "users:read",
  "users:create",
  "users:update",
  "users:delete",
  "users:verify",
  "users:assign-role",
  "users:assign-permission",
  "users:invite",
  "roles:read",
  "roles:create",
  "roles:update",
  "roles:delete",
  "permission:read",
  "permission:create",
  "permission:update",
  "permission:delete",

  // ── personal finance ────────────────────────────────────────────────────
  "finance:read",
  "finance:write",
  "finance:export",
  "transactions:read",
  "transactions:write",
  "accounts:read",
  "accounts:write",
  "budgets:read",
  "budgets:write",
  "analytics:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
