import type { CSSProperties, ReactNode } from 'react'
import { SECTION_HUES } from '@components/channels/data'
import { TopBar } from '@components/top-bar'
import Palette from '@islands/palette'
import { Island } from '@framework/render/islands'

/**
 * The frame every route but the homepage renders inside: the room, the top
 * bar, and the glass reader panel the homepage's tiles open into.
 *
 * The palette's overlay, input and empty list are server-rendered into every
 * page inside a `hidden` div. The runtime unhides it and focuses the input on
 * the first Cmd/Ctrl+K, so typing is never swallowed while the island module
 * and the search index load, rather than waiting on a round trip before the
 * first keystroke can land.
 */

export type Section = keyof typeof SECTION_HUES

interface Crumb {
  name: string
  href: string
  /** This page, rather than a section above it. */
  current?: boolean
}

export interface PageShellProps {
  /** Picks the accent. */
  section: Section
  /** The trail after Home. */
  crumbs: Crumb[]
  /** Shown in the panel bar after the trail, like an article's date. */
  meta?: ReactNode
  /** Where Back goes: the homepage row or tile this page opened from. */
  back: string
  /** Emitted as `view-transition-name` on the panel. */
  vtName?: string
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

export function roomStyle(section: Section): CSSProperties {
  return { '--ui-hue': SECTION_HUES[section] } as CSSProperties
}

export function PageShell({
  section,
  crumbs,
  meta,
  back,
  vtName,
  toolbar = true,
  children,
}: PageShellProps) {
  const panelStyle: CSSProperties | undefined = vtName
    ? ({ viewTransitionName: vtName } as CSSProperties)
    : undefined
  const trail = [{ name: 'Home', href: '/' }, ...crumbs]

  return (
    <div
      className={toolbar ? 'ui-room' : 'ui-room ui-embed'}
      style={roomStyle(section)}
    >
      {toolbar && (
        <>
          <a className="ui-skip" href="#main">
            Skip to content
          </a>
          <TopBar />
        </>
      )}
      <main id="main" className="ui-panel" style={panelStyle}>
        {toolbar && (
          <div className="ui-bar">
            <nav className="ui-crumbs" aria-label="Breadcrumb">
              <ol>
                {trail.map((crumb) => (
                  <li key={crumb.href}>
                    <a
                      href={crumb.href}
                      aria-current={crumb.current ? 'page' : undefined}
                    >
                      {crumb.name}
                    </a>
                  </li>
                ))}
              </ol>
              {meta && <span className="ui-crumbs-meta">{meta}</span>}
            </nav>
            <a className="ui-back" href={back}>
              <span className="ui-key" aria-hidden="true">
                <svg viewBox="0 0 16 16">
                  <path d="M13 8H3.5M7.5 4 3.5 8l4 4" />
                </svg>
              </span>
              Back
            </a>
          </div>
        )}
        <div className="ui-body">{children}</div>
      </main>
      {toolbar && <CommandPalette />}
    </div>
  )
}
