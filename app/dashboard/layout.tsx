"use client";
import { useState } from "react";
import Sidebar from "@/components/organisms/layout/sidebar";
import Header from "@/components/organisms/layout/header";
import { Toaster } from "react-hot-toast";
import RouteGuard from "@/components/organisms/layout/routeGuard";

export default function XeniaLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen w-full overflow-hidden bg-xenia-canvas text-xenia-ink-900 font-ui">
      <Toaster position="top-right" />
      <div className="flex h-screen overflow-hidden">
        {/* Backdrop — mobile only, closes sidebar on tap */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] md:hidden"
            aria-hidden="true"
          />
        )}

        <Sidebar sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex h-full flex-1 flex-col overflow-y-auto">
          <Header setSidebarOpen={setSidebarOpen} sidebarOpen={sidebarOpen} />
          {/* Sidebar dan header tetap dirender di luar penjaga: kalau satu
              halaman ditolak, orangnya masih bisa pindah ke halaman lain. */}
          <RouteGuard>{children}</RouteGuard>
        </div>
      </div>
    </div>
  );
}
