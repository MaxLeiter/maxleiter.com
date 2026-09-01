import type { CSSProperties, ReactNode } from 'react'
import { WindowToolbar } from '@components/static/window-toolbar'
import Palette from '@islands/palette'
import { Island } from '../../framework/islands'

/**
 * The frame every non-homepage route renders inside: toolbar, main region and
 * the command-palette shell.
 *
 * The palette's overlay, input and empty list are server-rendered into every
 * page inside a `hidden` div. The runtime unhides it and focuses the input on
 * the first Cmd/Ctrl+K, so typing is never swallowed while the island module
 * and the search index load. Today's implementation puts the palette behind
 * `next/dynamic({ssr:false})`, so the first press waits on a round trip.
 */

interface BreadcrumbSegment {
  name: string
  href: string
}

export interface PageShellProps {
  title: string
  segments?: BreadcrumbSegment[]
  /** `/?openPost=<slug>` on post and note pages. */
  minimizeHref?: string
  /** Emitted as `view-transition-name` on `<main>`. */
  vtName?: string
  /** False for the `/embed` variants, which drop the toolbar entirely. */
  toolbar?: boolean
  children: ReactNode
}

/**
 * The fallback and the island are one component, rendered by React here and by
 * preact/compat on the client, so the server markup and the first client render
 * agree exactly and hydration patches nothing. Its first render is the overlay,
 * the input and the three navigation entries; the search index arrives later.
 */
export function CommandPalette() {
  return (
    <Island name="palette" on="interaction" hidden>
      <Palette />
    </Island>
  )
}

export function PageShell({
  title,
  segments = [],
  minimizeHref,
  vtName,
  toolbar = true,
  children,
}: PageShellProps) {
  const style: CSSProperties | undefined = vtName
    ? ({ viewTransitionName: vtName } as CSSProperties)
    : undefined

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col">
      {toolbar && (
        <WindowToolbar
          title={title}
          segments={segments}
          minimizeHref={minimizeHref}
        />
      )}
      <main className="flex-1 overflow-auto p-6" style={style}>
        {children}
      </main>
      {toolbar && <CommandPalette />}
    </div>
  )
}
