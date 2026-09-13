'use client'

import type { ComponentProps, ReactNode } from 'react'
import { ArrowLeft01Icon } from 'hugeicons-react'

import { useGoBack } from '@/hooks/useGoBack'

interface BackButtonProps
    extends Omit<ComponentProps<'button'>, 'onClick' | 'type' | 'children'> {
    /**
     * Where to land when this tab has no in-app history to go back to
     * (pasted URL, new tab, hard refresh). Never used for a normal back.
     */
    fallbackUrl?: string
    children?: ReactNode
}

/**
 * Back affordance for the dashboard. Renders a button — not a link — because
 * back is an action, not a destination: it returns the user to the page they
 * came from, preserving that page's filters and tab state.
 */
export function BackButton({
    fallbackUrl,
    children,
    className = '',
    'aria-label': ariaLabel = 'Go back',
    ...rest
}: BackButtonProps) {
    const goBack = useGoBack(fallbackUrl)

    return (
        <button type="button" onClick={goBack} aria-label={ariaLabel} className={className} {...rest}>
            {children ?? <ArrowLeft01Icon size={18} />}
        </button>
    )
}
