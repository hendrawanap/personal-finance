import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * false on the server, true after hydration. For components that read
 * localStorage (e.g. zustand persist) so the first render does not mismatch.
 */
export function useMounted(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    )
}
