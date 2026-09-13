'use client'

import { useEffect } from 'react'
import { useAccountFilterStore } from '@/store/useAccountFilterStore'

/**
 * Rehydrates active account from localStorage after mount.
 */
export function AccountFilterHydrator() {
  useEffect(() => {
    useAccountFilterStore.persist.rehydrate()
  }, [])

  return null
}
