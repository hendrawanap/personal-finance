import {
  DashboardSquare01Icon,
  Invoice01Icon,
  CreditCardIcon,
  Wallet02Icon,
  Coins01Icon,
  ChartLineData02Icon,
  Analytics01Icon,
  Settings01Icon,
  UserGroupIcon,
  PreferenceHorizontalIcon,
} from "hugeicons-react";

import type { Permission } from "@/types/auth/permission.type";

export type NavIcon = React.ComponentType<{
  size?: number;
  className?: string;
  strokeWidth?: number;
}>;

export const NAV_GROUPS = {
  finance: { label: "Finance", icon: Wallet02Icon },
  insights: { label: "Insights", icon: Analytics01Icon },
  system: { label: "System", icon: Settings01Icon },
} as const satisfies Record<string, { label: string; icon: NavIcon }>;

export type NavGroupKey = keyof typeof NAV_GROUPS;

export type RouteAccess = {
  pattern: string;
  permission: Permission | readonly Permission[];
  nav?: { label: string; icon: NavIcon; group?: NavGroupKey };
  card?: { title: string; description: string; icon: NavIcon };
  search?: { title?: string; keywords?: string[]; under?: string };
};

export const ROUTE_ACCESS: readonly RouteAccess[] = [
  // ── Dashboard Overview ──
  {
    pattern: "/dashboard",
    permission: [],
    nav: { label: "Overview", icon: DashboardSquare01Icon },
    search: { keywords: ["home", "stats", "summary", "balance"] },
  },

  // ── Finance Group ──
  {
    pattern: "/dashboard/transactions",
    permission: [],
    nav: { label: "Transactions", icon: Invoice01Icon, group: "finance" },
    search: { keywords: ["expenses", "income", "history", "payments"] },
  },
  {
    pattern: "/dashboard/accounts",
    permission: [],
    nav: { label: "Accounts", icon: CreditCardIcon, group: "finance" },
    search: { keywords: ["bank", "wallet", "cash", "crypto", "cards"] },
  },
  {
    pattern: "/dashboard/budgets",
    permission: [],
    nav: { label: "Budgets", icon: Coins01Icon, group: "finance" },
    search: { keywords: ["limits", "savings", "planning", "categories"] },
  },

  // ── Insights Group ──
  {
    pattern: "/dashboard/analytics",
    permission: [],
    nav: { label: "Analytics", icon: ChartLineData02Icon, group: "insights" },
    search: { keywords: ["charts", "reports", "cash flow", "breakdown"] },
  },

  // ── System / Settings Group ──
  {
    pattern: "/dashboard/settings",
    permission: [],
    nav: { label: "Settings", icon: Settings01Icon, group: "system" },
    search: { keywords: ["preferences", "configuration"] },
  },
  {
    pattern: "/dashboard/settings/user",
    permission: ["users:read"],
    card: {
      title: "User Management",
      description: "Manage dashboard users, roles, and invitation status.",
      icon: UserGroupIcon,
    },
    search: { keywords: ["team", "members", "accounts"] },
  },
  {
    pattern: "/dashboard/settings/user/invite",
    permission: ["users:invite"],
    search: { title: "Invite User", keywords: ["new user", "add member"] },
  },
  {
    pattern: "/dashboard/settings/roles",
    permission: ["roles:read"],
    card: {
      title: "Role Management",
      description: "Configure role permissions and access control.",
      icon: PreferenceHorizontalIcon,
    },
    search: { keywords: ["permissions", "rbac", "access"] },
  },
] as const;
