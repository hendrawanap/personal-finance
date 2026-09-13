'use client'

import { Loading03Icon } from 'hugeicons-react'
import StatePanel from './statePanel'

type LoadingStateProps = {
  message?: string
  size?: 'md' | 'sm'
  className?: string
}

export default function LoadingState({
  message = 'Loading...',
  size = 'md',
  className,
}: LoadingStateProps) {
  return (
    <StatePanel
      size={size}
      className={className}
      role="status"
      aria-live="polite"
    >
      <Loading03Icon
        size={28}
        className="animate-spin text-xenia-moss-600"
        aria-hidden
      />
      <p className="text-sm text-xenia-stone-500">{message}</p>
    </StatePanel>
  )
}