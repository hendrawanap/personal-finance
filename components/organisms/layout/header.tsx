'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Cancel01Icon, Menu01Icon, PanelLeftCloseIcon, PanelLeftOpenIcon, Search01Icon } from 'hugeicons-react'

import GlobalSearch from '@/components/organisms/layout/globalSearch'
import { useProfile } from '@/hooks/query/auth/profile';
import { useFinanceStore } from '@/store/useFinanceStore';

interface HeaderProps {
    setSidebarOpen: (value: boolean) => void;
    sidebarOpen: boolean
}

/**
 * Pintasan global search. Dipasang di header karena header selalu terpasang di
 * layout dashboard — jadi ⌘K berlaku di semua halaman tanpa listener kedua.
 */
function useSearchShortcut(onOpen: () => void) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault()
                onOpen()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onOpen])
}

function useSidebarShortcut(onToggle: () => void) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
                const target = event.target as HTMLElement | null
                if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                    return
                }
                event.preventDefault()
                onToggle()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onToggle])
}

/**
 * Apakah ini Mac — dibaca lewat useSyncExternalStore, bukan useState+useEffect.
 *
 * Render pertama di klien HARUS sama dengan hasil server (snapshot server =
 * false), tapi menyetelnya dari dalam effect berarti setState di effect.
 * useSyncExternalStore memang untuk ini: nilainya tidak pernah berubah, jadi
 * `subscribe` tidak berlangganan apa pun.
 */
const noSubscribe = () => () => {}
const readIsMac = () =>
    /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export default function Header({
    setSidebarOpen,
    sidebarOpen,
}: HeaderProps) {
    const { data: profile, isLoading } = useProfile()
    const storeProfile = useFinanceStore((s) => s.profile)

    const [searchOpen, setSearchOpen] = useState(false)
    const openSearch = useCallback(() => setSearchOpen(true), [])
    // Identitasnya harus stabil: DialogShell memasang ulang listener Esc dan
    // mengembalikan fokus setiap kali `onClose` berganti.
    const closeSearch = useCallback(() => setSearchOpen(false), [])
    useSearchShortcut(openSearch)

    const toggleSidebar = useCallback(() => setSidebarOpen(!sidebarOpen), [setSidebarOpen, sidebarOpen])
    useSidebarShortcut(toggleSidebar)

    const isMac = useSyncExternalStore(noSubscribe, readIsMac, () => false)

    return (
        <>
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#E2D9C2] bg-[#F2ECDD]/90 px-4 py-3 sm:px-6 sm:py-4 backdrop-blur">
            <button
                type="button"
                onClick={toggleSidebar}
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                aria-keyshortcuts="Meta+B Control+B"
                title={sidebarOpen ? `Collapse sidebar (${isMac ? '⌘B' : 'Ctrl+B'})` : `Expand sidebar (${isMac ? '⌘B' : 'Ctrl+B'})`}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-xenia-border bg-white/60 text-xenia-stone-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:border-xenia-brass-500 hover:bg-white hover:text-xenia-stone-800 hover:shadow-xs focus-visible:border-xenia-brass-500 focus-visible:bg-white focus-visible:outline-none active:scale-95"
            >
                {/* Desktop icon */}
                <span className="hidden md:flex items-center justify-center">
                    {sidebarOpen ? (
                        <PanelLeftOpenIcon size={18} strokeWidth={1.75} />
                    ) : (
                        <PanelLeftCloseIcon size={18} strokeWidth={1.75} />
                    )}
                </span>
                {/* Mobile icon */}
                <span className="flex md:hidden items-center justify-center">
                    {sidebarOpen ? (
                        <Cancel01Icon size={18} strokeWidth={1.75} />
                    ) : (
                        <Menu01Icon size={18} strokeWidth={1.75} />
                    )}
                </span>
            </button>

            {/* Pemicu, bukan input: yang mengetik adalah kotak di dalam dialog,
                jadi tidak ada dua kotak yang harus disinkronkan. */}
            <button
                type="button"
                onClick={openSearch}
                aria-label="Search pages"
                aria-keyshortcuts="Meta+K Control+K"
                className="ml-1 flex max-w-md flex-1 items-center gap-2 rounded-lg border border-xenia-border bg-white/60 px-3 py-2 text-left text-sm text-xenia-stone-500 transition-colors hover:border-xenia-brass-500 hover:bg-white focus-visible:border-xenia-brass-500 focus-visible:bg-white focus-visible:outline-none"
            >
                <Search01Icon size={15} className="shrink-0" />
                <span className="truncate">Search pages</span>
                <kbd className="ml-auto hidden shrink-0 rounded border border-xenia-border bg-xenia-cream px-1.5 py-0.5 font-sans text-[10px] text-xenia-stone-700 sm:inline">
                    {isMac ? '\u2318 K' : 'Ctrl K'}
                </kbd>
            </button>

            <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-2 border-l border-[#E2D9C2] pl-3">
                    {isLoading ? (
                        <>
                            <div className="h-9 w-9 animate-pulse rounded-full bg-[#E4E9DC]" />
                            <div className="hidden space-y-1 sm:block">
                                <div className="h-3 w-20 animate-pulse rounded bg-[#E4E9DC]" />
                                <div className="h-3 w-28 animate-pulse rounded bg-[#E4E9DC]" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E4E9DC] text-xs font-semibold text-[#4F6B52] ring-2 ring-[#B4884F]/40">
                                {getInitials(profile?.name || storeProfile?.name || 'User')}
                            </div>
                            <div className="hidden text-left text-xs leading-tight sm:block">
                                <p className="font-medium text-[#1D1B16]">
                                    {profile?.name || storeProfile?.name || 'User'}
                                </p>
                                <p className="text-[#8A8271]">
                                    {profile?.email || storeProfile?.email || 'user@finance.io'}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>

        {/* Di LUAR <header>: dialog bukan bagian dari landmark banner, dan
            `backdrop-blur` di header menjadikannya containing block untuk
            elemen position:fixed di dalamnya. DialogShell sudah memakai portal,
            ini menjaga markup-nya tetap jujur. */}
        <GlobalSearch open={searchOpen} onClose={closeSearch} />
        </>
    )
}