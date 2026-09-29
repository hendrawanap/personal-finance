"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";

import { MobileHeader } from "@/components/organisms/layout/mobileHeader";
import { MobileBottomNav } from "@/components/organisms/layout/mobileBottomNav";
import { MobileDrawer } from "@/components/organisms/layout/mobileDrawer";
import { QuickActionModal } from "@/components/organisms/layout/quickActionModal";
import RouteGuard from "@/components/organisms/layout/routeGuard";

export default function XeniaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  // Auto-close drawer on route change
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setDrawerOpen(false);
    setQuickActionOpen(false);
  }

  return (
    <div className="h-screen h-[100dvh] w-full bg-[#EDE7D9] text-xenia-ink-900 font-ui flex justify-center items-center overflow-hidden sm:py-3 sm:px-4">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      {/* Mobile App Shell */}
      <div className="relative flex h-full sm:h-[92vh] sm:max-h-[92vh] w-full max-w-lg lg:max-w-xl flex-col bg-xenia-canvas sm:rounded-3xl sm:border sm:border-xenia-border/80 sm:shadow-2xl overflow-hidden">
        {/* Mobile Header Bar */}
        <MobileHeader onOpenDrawer={() => setDrawerOpen(true)} />

        {/* Scrollable Page Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <RouteGuard>{children}</RouteGuard>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav
          onOpenQuickAction={() => setQuickActionOpen(true)}
          onOpenDrawer={() => setDrawerOpen(true)}
        />

        {/* Slide-out Menu Drawer */}
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

        {/* Quick Action FAB Bottom Sheet */}
        <QuickActionModal
          open={quickActionOpen}
          onClose={() => setQuickActionOpen(false)}
        />
      </div>
    </div>
  );
}
