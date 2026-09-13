'use client'

import type { HTMLAttributes, ReactNode } from 'react'

const TONE = {
  plain: 'border-xenia-border bg-white',
  danger: 'border-xenia-danger/30 bg-xenia-danger/5',
} as const

const SIZE = {
  md: 'py-16',
  sm: 'py-10',
} as const

type StatePanelProps = HTMLAttributes<HTMLDivElement> & {
  tone?: keyof typeof TONE
  size?: keyof typeof SIZE
  children: ReactNode
}

export default function StatePanel({
  tone = 'plain',
  size = 'md',
  className = '',
  children,
  ...rest
}: StatePanelProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border ${TONE[tone]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}