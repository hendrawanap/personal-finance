/**
 * Works out where a dashboard back button should actually land.
 *
 * Back buttons in the dashboard are *real* back navigation, never a hardcoded
 * link to a parent route, so the user returns to the list they came from with
 * its filters, tab, page and scroll position intact.
 *
 * Two things complicate a plain `router.back()`:
 *
 *  1. **Same-path entries.** Tabs push (`tabParser` / `tabEnumParser` in
 *     `lib/urlState.ts` use `history: 'push'`), so flipping through four tabs
 *     on a detail page leaves four history entries that all share that page's
 *     pathname. A single back step lands on the *same page* with an older
 *     `?tab=`, which reads as a broken button. Back must skip the whole run
 *     and pop to the nearest entry with a **different pathname**.
 *  2. **Cold loads.** A pasted URL, a new tab or a hard refresh has no in-app
 *     history at all, and back would leave the dashboard entirely.
 *
 * `resolveBackTarget()` answers both at once. Note this governs only the
 * in-app back affordance; the browser's own back button still steps through
 * tab changes one at a time, which is what pushing them was for.
 *
 * Two signals, best first:
 *  1. The Navigation API (`window.navigation`), whose entry list is same-origin
 *     only and exposes each entry's URL — so the same-path run can be measured
 *     exactly and jumped over in one `traverseTo()`.
 *  2. Otherwise a counter of client-side pathname changes, fed by
 *     `NavigationHistoryTracker`. It cannot see query-only pushes, so on those
 *     browsers back degrades to a single step.
 */

let depth = 0

/** Called by NavigationHistoryTracker on every client-side route change. */
export function recordNavigation(): void {
    depth += 1
}

/** Test seam / hard reset. */
export function resetNavigationDepth(): void {
    depth = 0
}

export function getNavigationDepth(): number {
    return depth
}

/**
 * What a back button should do.
 *
 * - `traverse` — jump straight to that history entry (skipping same-path ones).
 * - `back` — one plain step back; all we can safely do without the Navigation API.
 * - `fallback` — no in-app page to return to; the caller uses its fallback route.
 */
export type BackTarget =
    | { kind: 'traverse'; key: string }
    | { kind: 'back' }
    | { kind: 'fallback' }

type NavigationHistoryEntryLike = {
    key: string
    url: string | null
}

type NavigationApi = {
    canGoBack?: boolean
    currentEntry?: (NavigationHistoryEntryLike & { index: number }) | null
    entries?: () => NavigationHistoryEntryLike[]
    traverseTo?: (key: string) => {
        committed?: Promise<unknown>
        finished?: Promise<unknown>
    }
}

function getNavigationApi(): NavigationApi | undefined {
    if (typeof window === 'undefined') return undefined
    return (window as unknown as { navigation?: NavigationApi }).navigation
}

/** Path part of a history entry URL, or null when the entry is opaque to us. */
function pathnameOf(url: string | null | undefined): string | null {
    if (!url) return null
    try {
        return new URL(url, 'http://localhost').pathname
    } catch {
        return null
    }
}

/**
 * Where back should go from the entry the user is on right now.
 * Conservative by design: when unsure, returns `fallback` and the caller uses
 * its fallback route — a back button that lands somewhere sensible beats one
 * that leaves the dashboard.
 */
export function resolveBackTarget(): BackTarget {
    if (typeof window === 'undefined') return { kind: 'fallback' }

    const nav = getNavigationApi()
    const entries = nav?.entries?.()
    const current = nav?.currentEntry

    if (
        entries &&
        current &&
        typeof current.index === 'number' &&
        typeof nav?.traverseTo === 'function'
    ) {
        const currentPathname = pathnameOf(current.url)

        for (let i = current.index - 1; i >= 0; i -= 1) {
            const pathname = pathnameOf(entries[i]?.url)
            // An opaque entry is not a page of ours — stop rather than jump
            // into something we cannot identify.
            if (pathname === null) break
            if (pathname !== currentPathname) {
                return { kind: 'traverse', key: entries[i].key }
            }
        }

        // Every entry behind us is the same page with a different query
        // (or there is nothing behind us at all).
        return { kind: 'fallback' }
    }

    // No usable Navigation API. The depth counter only sees pathname changes,
    // so it cannot tell how many query-only pushes sit on top of them; one
    // step back is the most we can promise.
    if (nav && typeof nav.canGoBack === 'boolean') {
        return nav.canGoBack ? { kind: 'back' } : { kind: 'fallback' }
    }
    return depth > 0 ? { kind: 'back' } : { kind: 'fallback' }
}

/**
 * Jump to a history entry by key. Returns a promise that settles when the
 * traversal commits, or null when the browser cannot do it — the caller then
 * uses its fallback route.
 */
export function traverseTo(key: string): Promise<unknown> | null {
    const nav = getNavigationApi()
    if (typeof nav?.traverseTo !== 'function') return null

    try {
        const result = nav.traverseTo(key)
        // The entry can have been disposed, or another navigation can win the
        // race; swallow `finished` so a handled failure never surfaces as an
        // unhandled rejection.
        result?.finished?.catch(() => {})
        return result?.committed ?? Promise.resolve()
    } catch {
        return null
    }
}

/** True when going back keeps the user on a different in-app page. */
export function canGoBack(): boolean {
    return resolveBackTarget().kind !== 'fallback'
}
