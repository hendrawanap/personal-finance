'use client'

import type { ReactNode } from 'react'
import StatePanel from './statePanel'


type EmptyStateProps = {
  title?: string
  message?: string
  icon?: ReactNode
  action?: ReactNode
  size?: 'md' | 'sm'
  className?: string
}

export default function EmptyState({
  title,
  message = 'No data found.',
  icon,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  return (
    <StatePanel size={size} className={className}>
      {icon && <div className="text-xenia-stone-400">{icon}</div>}
      {title && <p className="text-base font-medium text-xenia-ink-900">{title}</p>}
      <p className="max-w-sm px-6 text-center text-sm text-xenia-stone-500">
        {message}
      </p>
      {action}
    </StatePanel>
  )
}