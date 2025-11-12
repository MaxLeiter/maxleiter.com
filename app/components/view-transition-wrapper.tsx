"use client"

import { ViewTransition } from 'react'
import type { ReactNode } from 'react'

interface ViewTransitionWrapperProps {
  name: string
  children: ReactNode
}

export function ViewTransitionWrapper({ name, children }: ViewTransitionWrapperProps) {
  return <ViewTransition name={name}>{children}</ViewTransition>
}
