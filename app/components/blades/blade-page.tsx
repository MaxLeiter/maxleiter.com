import type { CSSProperties, ReactNode } from 'react'
import { iconHTML, type IconKind } from '@lib/blades/art'
import { BLADES, HOME_BLADE, type BladeTheme } from '@lib/blades/theme'
import { BladeRoot, CommandPalette, Svg, themeStyle, Topbar } from './chrome'

/**
 * A section page: one blade, open, in its own colour, with the other four
 * filed beside it as edges -- the ones before it on the left, the ones after
 * it on the right, exactly where they sit on the dashboard. Every edge is a
 * link to that section, so the page is the dashboard's at-rest frame with the
 * document, not the blade, doing the scrolling.
 *
 * No JavaScript of its own. The `/embed` variant drops the bar and the edges.
 */

export interface BladePageProps {
  blade: BladeTheme
  /** The blade's big lowercase title, which is this page's h1. */
  title: string
  /** `26 posts`. */
  count?: string
  /** False for the `/embed` variants. */
  chrome?: boolean
  vtName: string
  /** The right-hand column; the list runs full width without one. */
  side?: ReactNode
  children: ReactNode
}

/** Where a section's Back goes: the dashboard, open on this blade. */
export function homeHref(blade: BladeTheme): string {
  const i = BLADES.indexOf(blade)
  return i === HOME_BLADE ? '/' : `/?blade=${blade.id}`
}

function Edge({ blade, current }: { blade: BladeTheme; current: boolean }) {
  return (
    <a
      className={current ? 'edge is-cur' : 'edge'}
      href={blade.href.startsWith('/?') ? homeHref(blade) : blade.href}
      style={themeStyle(blade)}
      {...(current ? { 'aria-current': 'page' as const } : {})}
    >
      <span>{blade.id}</span>
    </a>
  )
}

export function BladePage({
  blade,
  title,
  count,
  chrome = true,
  vtName,
  side,
  children,
}: BladePageProps) {
  const index = BLADES.indexOf(blade)
  const frame = {
    '--nl': chrome ? index : 0,
    '--nr': chrome ? BLADES.length - 1 - index : 0,
  } as CSSProperties
  return (
    <BladeRoot blade={blade} className="bl-page" skipTo="main">
      {chrome && <Topbar />}
      <div className="pb-frame" style={frame}>
        {chrome && (
          <nav className="edges" aria-label="Sections">
            <div className="edge-l">
              {BLADES.slice(0, index).map((b) => (
                <Edge key={b.id} blade={b} current={false} />
              ))}
            </div>
            <Edge blade={blade} current />
            <div className="edge-r">
              {BLADES.slice(index + 1).map((b) => (
                <Edge key={b.id} blade={b} current={false} />
              ))}
            </div>
          </nav>
        )}
        <main
          className="page-blade"
          id="main"
          tabIndex={-1}
          style={{ viewTransitionName: vtName } as CSSProperties}
        >
          <div className="blade-surface" />
          <span className="pb-tab" aria-hidden="true">
            <span>{blade.id}</span>
          </span>
          <div className="pb-body">
            <header className="bh">
              <h1 className="bt">{title}</h1>
              <p className="bs">{blade.sub}</p>
              {chrome && (
                <a className="pb-back" href={homeHref(blade)} data-esc="">
                  <span className="key" aria-hidden="true">
                    Esc
                  </span>
                  Dashboard
                </a>
              )}
              {count && <span className="bcount">{count}</span>}
            </header>
            <div className={side ? 'pb-cols' : 'pb-cols pb-solo'}>
              <div className="pb-main">{children}</div>
              {side && <aside className="pb-side">{side}</aside>}
            </div>
          </div>
        </main>
      </div>
      {chrome && <CommandPalette />}
    </BladeRoot>
  )
}

export interface RowProps {
  href: string
  title: string
  desc?: string
  meta?: string
  icon: IconKind
  external?: boolean
  vt?: string
  tags?: string[]
}

/** One glossy row on a section page: icon, title, a line of description. */
export function Row({
  href,
  title,
  desc,
  meta,
  icon,
  external,
  vt,
  tags,
}: RowProps) {
  return (
    <li>
      <a
        className="row"
        href={href}
        {...(vt ? { 'data-vt-name': vt } : {})}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        <Svg className="ico" html={iconHTML(icon)} />
        <span className="row-x">
          <span className="row-t">
            {title}
            {external && <span className="sr-only"> (opens in a new tab)</span>}
          </span>
          {desc && <span className="row-d">{desc}</span>}
          {tags && tags.length > 0 && (
            <span className="row-tags">
              {tags.map((tag) => (
                <span key={tag} className="row-tag">
                  {tag}
                </span>
              ))}
            </span>
          )}
        </span>
        {meta && <span className="row-m">{meta}</span>}
      </a>
    </li>
  )
}

/** A heading and a list of rows inside a section page. */
export function Rows({
  heading,
  children,
}: {
  heading?: string
  children: ReactNode
}) {
  return (
    <section className="rows-group">
      {heading && <h2 className="rows-h">{heading}</h2>}
      <ul className="rows">{children}</ul>
    </section>
  )
}

/** The brushed-glass side panel: a short note in the blade's voice. */
export function SidePanel({
  kicker,
  title,
  children,
}: {
  kicker: string
  title: string
  children: ReactNode
}) {
  return (
    <div className="pb-panel">
      <span className="chip">{kicker}</span>
      <h2 className="pb-panel-t">{title}</h2>
      <div className="pb-panel-x">{children}</div>
    </div>
  )
}
