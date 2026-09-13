"use client";
import { useCallback, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/organisms/layout/sidebar";
import Header from "@/components/organisms/layout/header";
import { Toaster } from "react-hot-toast";
import RouteGuard from "@/components/organisms/layout/routeGuard";

const subscribeMedia = (callback: () => void) => {
  const mql = window.matchMedia("(min-width: 768px)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};
const getIsDesktopSnapshot = () =>
  typeof window !== "undefined"
    ? window.matchMedia("(min-width: 768px)").matches
    : true;
const getServerSnapshot = () => true;

export default function XeniaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDesktop = useSyncExternalStore(
    subscribeMedia,
    getIsDesktopSnapshot,
    getServerSnapshot,
  );

  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Auto-close drawer on mobile when navigating routes
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileDrawerOpen(false);
  }

  const sidebarOpen = isDesktop ? desktopSidebarOpen : mobileDrawerOpen;

  const handleSetSidebarOpen = useCallback(
    (value: boolean) => {
      if (typeof window !== "undefined" && window.innerWidth >= 768) {
        setDesktopSidebarOpen(value);
      } else {
        setMobileDrawerOpen(value);
      }
    },
    [],
  );

  return (
    <div className="h-screen w-full overflow-hidden bg-xenia-canvas text-xenia-ink-900 font-ui">
      <Toaster position="top-right" />
      <div className="flex h-screen overflow-hidden">
        {/* Backdrop — mobile only, closes sidebar on tap */}
        {!isDesktop && mobileDrawerOpen && (
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] md:hidden"
            aria-hidden="true"
          />
        )}

        <Sidebar
          sidebarOpen={sidebarOpen}
          onClose={() => handleSetSidebarOpen(false)}
        />

        <div className="flex h-full flex-1 flex-col overflow-y-auto">
          <Header
            setSidebarOpen={handleSetSidebarOpen}
            sidebarOpen={sidebarOpen}
          />
          {/* Sidebar dan header tetap dirender di luar penjaga: kalau satu
              halaman ditolak, orangnya masih bisa pindah ke halaman lain. */}
          <RouteGuard>{children}</RouteGuard>
        </div>
      </div>
    </div>
  );
}
