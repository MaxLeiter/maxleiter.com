import type { ReactNode } from 'react'
import Palette from '@islands/palette'
import { Island } from '@framework/render/islands'
import {
  Counts,
  Key,
  Sky,
  TopBar,
  TopChips,
  type Crumb,
  type MeridianCounts,
} from '@components/meridian/chrome'

/**
 * The frame every non-homepage route renders inside: the painted sky, the
 * MERIDIAN top bar, the main region, the hint bar and the command-palette
 * shell.
 *
 * The palette's overlay, input and empty list are server-rendered into every
 * page inside a `hidden` div. The runtime unhides it and focuses the input on
 * the first Cmd/Ctrl+K, so typing is never swallowed while the island module
 * and the search index load, rather than waiting on a round trip before the
 * first keystroke can land.
 */

export interface PageShellProps {
  /** Breadcrumb trail after the brand; the last entry is this page. */
  crumbs: Crumb[]
  /** Where the hint bar's Back goes: the screen this one was entered from. */
  back: { href: string; label: string }
  counts: MeridianCounts
  /** False for the `/embed` variants, which drop the chrome entirely. */
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
    <Island name="palette" hidden>
      <Palette />
    </Island>
  )
}

export function PageShell({
  crumbs,
  back,
  counts,
  toolbar = true,
  children,
}: PageShellProps) {
  if (!toolbar) {
    return (
      <>
        <Sky />
        <main className="mx-wrap mx-main mx-embed">{children}</main>
      </>
    )
  }
  return (
    <>
      <Sky />
      <a className="mx-skip" href="#main">
        Skip to content
      </a>
      <div className="mx-page">
        <TopBar crumbs={crumbs}>
          <TopChips />
        </TopBar>
        <main id="main" className="mx-wrap mx-main" tabIndex={-1}>
          {children}
        </main>
        <footer className="mx-hints">
          <div className="mx-wrap mx-hints-in">
            <div className="mx-hints-l">
              <a className="mx-hint" href={back.href}>
                <Key>‹</Key>
                {back.label}
              </a>
              <button type="button" className="mx-hint" data-open-palette>
                <Key>⌘K</Key>
                Search
              </button>
              <a className="mx-hint" href="/feed.xml">
                <Key>RSS</Key>
                Subscribe
              </a>
            </div>
            <Counts counts={counts} />
          </div>
        </footer>
      </div>
      <CommandPalette />
    </>
  )
}
