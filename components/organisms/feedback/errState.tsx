'use client'

import type { ReactNode } from 'react'
import { Alert02Icon } from 'hugeicons-react'
import StatePanel from './statePanel'


type ErrorStateProps = {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  size?: 'md' | 'sm'
  className?: string
  children?: ReactNode
}

export default function ErrorState({
  title,
  message = 'Something went wrong.',
  onRetry,
  retryLabel = 'Try again',
  size = 'md',
  className,
  children,
}: ErrorStateProps) {
  return (
    <StatePanel
      tone="danger"
      size={size}
      className={className}
      role="alert"
      aria-live="assertive"
    >
      <Alert02Icon size={28} className="text-xenia-danger" aria-hidden />

      {title && (
        <p className="text-base font-medium text-xenia-danger-ink">{title}</p>
      )}

      <p className="max-w-sm px-6 text-center text-sm text-xenia-danger-ink">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-xenia-danger/30 px-4 py-1.5 text-sm font-medium text-xenia-danger-ink transition-colors hover:bg-xenia-danger/10"
        >
          {retryLabel}
        </button>
      )}

      {children}
    </StatePanel>
  )
}