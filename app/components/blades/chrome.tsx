import type { CSSProperties, ReactNode } from 'react'
import { bladeVars, type BladeTheme } from '@lib/blades/theme'
import { glyphHTML } from '@lib/blades/art'
import Palette from '@islands/palette'
import { Island } from '@framework/render/islands'

/**
 * The frame every page shares: the themed root, its backdrop, the skip link,
 * the top bar and the command palette.
 *
 * `BladeRoot` puts the blade's colours on one element as custom properties,
 * so everything inside -- the backdrop, the buttons, the reader's header --
 * reads its section's colour without a class per blade.
 */

const SEARCH_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7 1.5a5.5 5.5 0 0 1 4.4 8.8l3.4 3.4-1.1 1.1-3.4-3.4A5.5 5.5 0 1 1 7 1.5zm0 1.6a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8z"/></svg>'

export function Svg({ html, className }: { html: string; className?: string }) {
  return (
    <span
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export function themeStyle(blade: BladeTheme): CSSProperties {
  return bladeVars(blade) as CSSProperties
}

/**
 * The fallback and the island are one component, rendered by React here and by
 * preact/compat on the client, so the server markup and the first client render
 * agree exactly and hydration patches nothing.
 */
export function CommandPalette() {
  return (
    <Island name="palette" hidden>
      <Palette />
    </Island>
  )
}

export interface TopbarProps {
  /** The homepage links nowhere from its own name and carries the clock. */
  home?: boolean
  /** The reading-glass toggle, on article pages. */
  glassToggle?: boolean
  children?: ReactNode
}

export function Topbar({ home, glassToggle, children }: TopbarProps) {
  const presence = (
    <>
      <i aria-hidden="true" />
      <b>MaxLeiter</b>
      <span>&nbsp;· online · maxleiter.com</span>
    </>
  )
  return (
    <header className="topbar">
      {home ? (
        <div className="presence">{presence}</div>
      ) : (
        <a className="presence" href="/" aria-label="MaxLeiter, home">
          {presence}
        </a>
      )}
      <span className="spacer" />
      {children}
      {glassToggle && (
        <button
          className="pill js-only"
          type="button"
          data-theme-toggle
          title="Switch between light and dark reading glass"
        >
          <Svg html={glyphHTML('theme')} />
          <span className="pill-l">Glass</span>
        </button>
      )}
      <button
        className="pill js-only"
        type="button"
        data-open-palette
        aria-keyshortcuts="Meta+K Control+K"
        title="Search (Ctrl K)"
      >
        <Svg html={SEARCH_ICON} />
        <span className="pill-l">Search</span>
      </button>
    </header>
  )
}

export interface BladeRootProps {
  blade: BladeTheme
  className: string
  /** Where the skip link lands. */
  skipTo: string
  children: ReactNode
}

export function BladeRoot({
  blade,
  className,
  skipTo,
  children,
}: BladeRootProps) {
  return (
    <div className={`bl-root ${className}`} style={themeStyle(blade)}>
      <a className="skip" href={`#${skipTo}`} id="skip">
        Skip to content
      </a>
      <div className="bl-bg" aria-hidden="true" />
      {children}
    </div>
  )
}
