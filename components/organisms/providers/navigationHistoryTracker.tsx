'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

import { recordNavigation } from '@/lib/navigationHistory'

/**
 * Counts client-side route changes so `useGoBack` knows whether
 * `router.back()` stays inside the app. Renders nothing.
 *
 * Mounted once in `Providers`. It deliberately does not read search params:
 * `useSearchParams()` here would force every page to be dynamic (see
 * AGENTS.md), and the Navigation API already covers query-only pushes on
 * browsers that support it.
 */
export function NavigationHistoryTracker() {
    const pathname = usePathname()

    useEffect(() => {
        recordNavigation()
    }, [pathname])

    return null
}
