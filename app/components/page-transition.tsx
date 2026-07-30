'use client'

import { ViewTransition } from 'react'
import type { ReactNode } from 'react'

/**
 * Persistent view transition boundary around the routed content.
 *
 * React only starts a view transition when a boundary survives the update, so
 * this has to live above the router outlet. Boundaries that live inside a page
 * mount and unmount with it, which never triggers a transition on its own.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <ViewTransition>{children}</ViewTransition>
}
