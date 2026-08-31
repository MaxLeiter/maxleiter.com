'use client'

import dynamic from 'next/dynamic'

// Client-side split so the lightbox code and its CSS only load on posts that
// use <ShotGrid>. Both come from the same module, so they share one chunk and
// the grid/shot context still lines up.
export const ShotGrid = dynamic(() =>
  import('./shot-grid').then((m) => m.ShotGrid),
)

export const Shot = dynamic(() => import('./shot-grid').then((m) => m.Shot))
