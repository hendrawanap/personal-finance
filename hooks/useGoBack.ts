'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { resolveBackTarget, traverseTo } from '@/lib/navigationHistory'

/**
 * The one way to go back in the dashboard.
 *
 * Performs real back navigation so the user returns to wherever they actually
 * came from — including that page's filters, tab and scroll position — with
 * two corrections:
 *
 * - History entries that only differ from the current URL by their query
 *   string are skipped. Tabs push (see `lib/urlState.ts`), so backing out of a
 *   detail page you flipped four tabs on returns you to the list, not to the
 *   same page on tab three.
 * - `fallbackUrl` is used *only* when nothing is left to go back to (pasted
 *   URL, new tab, hard refresh, or a history made up entirely of this same
 *   page), so back never dead-ends outside the app.
 */
export function useGoBack(fallbackUrl = '/dashboard') {
    const router = useRouter()

    return useCallback(() => {
        const target = resolveBackTarget()

        if (target.kind === 'traverse') {
            const committed = traverseTo(target.key)
            if (committed) {
                committed.catch(() => router.replace(fallbackUrl))
                return
            }
        } else if (target.kind === 'back') {
            router.back()
            return
        }

        router.replace(fallbackUrl)
    }, [router, fallbackUrl])
}
