"use client";
import { Selects } from "@/components/atoms/selects";
import { usePermissions } from "@/hooks/usePermissions";
import { useLogout } from "@/hooks/mutation/auth/useLogout";
import { useAccountFilterStore } from "@/store/useAccountFilterStore";
import {
  ArrowDown01Icon,
  Cancel01Icon,
  Logout03Icon,
  Wallet02Icon,
} from "hugeicons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface sidebarProps {
  sidebarOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ sidebarOpen, onClose }: sidebarProps) {
  const pathname = usePathname();
  const { navEntries, profile } = usePermissions();

  const [toggledGroups, setToggledGroups] = useState<Record<string, boolean>>({});

  const isLinkActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : Boolean(pathname?.startsWith(href));

  const groupEntries = navEntries.filter(
    (entry): entry is Extract<typeof entry, { kind: "group" }> =>
      entry.kind === "group",
  );

  const allGroupsOpen =
    groupEntries.length > 0 &&
    groupEntries.every((entry) => toggledGroups[entry.key] ?? true);

  const toggleAllGroups = () => {
    const shouldExpand = !allGroupsOpen;
    const nextState: Record<string, boolean> = {};
    for (const group of groupEntries) {
      nextState[group.key] = shouldExpand;
    }
    setToggledGroups(nextState);
  };

  const selectedAccountId = useAccountFilterStore((s) => s.selectedAccountId);
  const setSelectedAccountId = useAccountFilterStore((s) => s.setSelectedAccountId);

  const handleLogout = useLogout();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#142219] transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:z-auto md:translate-x-0 md:transition-[width] ${sidebarOpen ? "md:w-64" : "md:w-0"} overflow-hidden`}
    >
      <div className="flex h-full w-64 flex-col py-6">
        {/* ── TOP ZONE ── */}
        <div className="shrink-0 px-5">
          {/* Logo + close button (mobile only) */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#4F6B52]">
                <div className="absolute inset-0 rounded-full bg-[#B4884F] opacity-20 blur-[6px]" />
                <Wallet02Icon
                  size={16}
                  className="relative text-[#F2ECDD]"
                  strokeWidth={1.75}
                />
              </div>
              <span className="font-display text-lg font-medium tracking-tight text-[#F2ECDD]">
                Personal Finance
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA894] transition-colors hover:bg-[#1B2B21] hover:text-[#E4E9DC] md:hidden"
            >
              <Cancel01Icon size={18} />
            </button>
          </div>

          {/* Welcome */}
          <div className="mt-8 px-1">
            <p className="font-display text-xl leading-tight font-medium text-[#F2ECDD]">
              Welcome, <span className="text-[#B4884F]">{profile?.name ?? "User"}</span>
            </p>
            <p className="mt-1 text-xs text-[#7C9878]">
              Your financial health & overview
            </p>
          </div>

          {/* Account Filter */}
          <div className="mt-6 px-1">
            <p className="text-[11px] font-medium tracking-wider text-[#5C6E5F] uppercase">
              Filter Account
            </p>
            <Selects
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              variant="dark"
              className="mt-2"
              options={[
                { value: "all", label: "All Accounts" },
                { value: "checking", label: "Checking Account" },
                { value: "savings", label: "Savings Account" },
                { value: "credit-card", label: "Credit Card" },
                { value: "investments", label: "Investment Portfolio" },
              ]}
            />
          </div>
        </div>

        {/* ── MIDDLE ZONE: menus ── */}
        <div className="sidebar-scroll -mr-2 min-h-0 flex-1 overflow-y-auto px-5">
          <div className="mt-8">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-medium tracking-wider text-[#5C6E5F] uppercase">
                Main menu
              </p>
              {groupEntries.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllGroups}
                  className="cursor-pointer text-[11px] font-medium text-[#7C9878] transition-colors hover:text-[#E4E9DC]"
                >
                  {allGroupsOpen ? "Collapse" : "Expand"}
                </button>
              )}
            </div>

            <nav className="mt-2 flex flex-col gap-0.5">
              {navEntries.map((entry) => {
                if (entry.kind === "link") {
                  const isActive = isLinkActive(entry.href);
                  return (
                    <Link
                      key={entry.label}
                      href={entry.href}
                      className={`group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "bg-[#24382B] text-[#F2ECDD]"
                          : "text-[#9CA894] hover:bg-[#1B2B21] hover:text-[#E4E9DC]"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#B4884F] shadow-[0_0_8px_1px_rgba(180,136,79,0.6)]" />
                      )}
                      <entry.icon
                        size={17}
                        strokeWidth={1.75}
                        className={`shrink-0 ${isActive ? "text-[#B4884F]" : ""}`}
                      />
                      <span
                        className={`truncate ${isActive ? "font-medium" : ""}`}
                      >
                        {entry.label}
                      </span>
                    </Link>
                  );
                }

                const isOpen = toggledGroups[entry.key] ?? true;
                const hasActiveChild = entry.items.some((c) =>
                  isLinkActive(c.href),
                );

                return (
                  <div key={entry.key} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() =>
                        setToggledGroups((prev) => ({
                          ...prev,
                          [entry.key]: !(prev[entry.key] ?? true),
                        }))
                      }
                      aria-expanded={isOpen}
                      className={`group relative -mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        hasActiveChild && !isOpen
                          ? "bg-[#24382B] text-[#F2ECDD]"
                          : "text-[#9CA894] hover:bg-[#1B2B21] hover:text-[#E4E9DC]"
                      }`}
                    >
                      {hasActiveChild && !isOpen && (
                        <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#B4884F] shadow-[0_0_8px_1px_rgba(180,136,79,0.6)]" />
                      )}
                      <entry.icon
                        size={17}
                        strokeWidth={1.75}
                        className={`shrink-0 ${hasActiveChild ? "text-[#B4884F]" : ""}`}
                      />
                      <span
                        title={entry.label}
                        className={`min-w-0 flex-1 truncate ${hasActiveChild ? "font-medium" : ""}`}
                      >
                        {entry.label}
                      </span>
                      <ArrowDown01Icon
                        size={15}
                        strokeWidth={1.75}
                        className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="mt-1 ml-3 flex flex-col gap-0.5 border-l border-[#24382B] pl-2">
                        {entry.items.map((child) => {
                          const isActive = isLinkActive(child.href);
                          return (
                            <Link
                              key={child.label}
                              href={child.href}
                              className={`group relative flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                isActive
                                  ? "bg-[#24382B] text-[#F2ECDD]"
                                  : "text-[#9CA894] hover:bg-[#1B2B21] hover:text-[#E4E9DC]"
                              }`}
                            >
                              {isActive && (
                                <span className="absolute top-1/2 left-0 h-4 w-[2.5px] -translate-y-1/2 rounded-full bg-[#B4884F] shadow-[0_0_8px_1px_rgba(180,136,79,0.6)]" />
                              )}
                              <child.icon
                                size={16}
                                strokeWidth={1.75}
                                className={`shrink-0 ${isActive ? "text-[#B4884F]" : ""}`}
                              />
                              <span
                                className={`truncate ${isActive ? "font-medium" : ""}`}
                              >
                                {child.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* ── BOTTOM ZONE: logout ── */}
        <div className="shrink-0 border-t border-[#24382B] px-5 pt-4">
          <button
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#E4574C] transition-colors hover:bg-[#3A1E1C] hover:text-[#FF6F62]"
          >
            <Logout03Icon size={17} strokeWidth={1.75} />
            <span>Logout</span>
          </button>

          <div className="px-1 pt-4 text-[10px] leading-relaxed text-[#5C6E5F]">
            Track finances, grow wealth, achieve freedom.
          </div>
        </div>
      </div>
    </aside>
  );
}
