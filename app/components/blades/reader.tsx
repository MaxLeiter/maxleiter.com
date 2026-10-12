import type { CSSProperties, ReactNode } from 'react'
import { ribbonsSVG } from '@lib/blades/art'
import type { BladeTheme } from '@lib/blades/theme'
import { homeHref } from './blade-page'
import { BladeRoot, CommandPalette, Svg, Topbar } from './chrome'

/**
 * An article as the dashboard's glass reader: a header in the section's blade
 * colour over the item's cover art, then the post on brushed glass.
 *
 * The glass follows the reading theme -- brushed white in light, smoked
 * graphite in dark -- because the MDX components inside it (tweets, the emoji
 * search, the shot grid, code blocks) are all themed against `data-theme`,
 * and a glass that ignored it would put dark widgets on white or the reverse.
 * The chrome around it is the same in both.
 *
 * `<article>` carries the view-transition name, so the homepage preview or a
 * section row morphs into it; the router hands the clicked element the same
 * name.
 */

export interface ReaderProps {
  blade: BladeTheme
  slug: string
  title: string
  date: string
  dateISO: string
  description?: string
  /** A note's kind: `note`, `snippet`, `tip`. */
  kind?: string
  content: ReactNode
  vtName: string
  /** The dashboard row to come back to. */
  backHref: string
  /** Shown in the footer, without the scheme. */
  url: string
  /** False for the `/embed` variants. */
  chrome?: boolean
}

export function Reader({
  blade,
  slug,
  title,
  date,
  dateISO,
  description,
  kind,
  content,
  vtName,
  backHref,
  url,
  chrome = true,
}: ReaderProps) {
  return (
    <BladeRoot blade={blade} className="bl-read" skipTo="main">
      {chrome && <Topbar glassToggle />}
      <main className="reader" id="main" tabIndex={-1}>
        <article
          className="reader-glass"
          style={{ viewTransitionName: vtName } as CSSProperties}
        >
          <header className="reader-head">
            <Svg className="reader-cover" html={ribbonsSVG(slug + blade.id)} />
            <div className="reader-top">
              {chrome && (
                <a className="reader-back" href={backHref} data-esc="">
                  <span className="key" aria-hidden="true">
                    Esc
                  </span>
                  Back
                </a>
              )}
              <p className="reader-kicker">
                <a
                  href={
                    blade.href.startsWith('/?') ? homeHref(blade) : blade.href
                  }
                >
                  {blade.id}
                </a>
                {' · '}
                <time dateTime={dateISO}>{date}</time>
                {kind && kind !== 'note' ? ` · ${kind}` : ''}
              </p>
            </div>
            <h1 className="reader-title">{title}</h1>
            {description && <p className="reader-desc">{description}</p>}
          </header>

          <div className="reader-body">
            <div className="reader-prose">{content}</div>
            <footer className="reader-thanks">
              <p>
                Thanks for reading! If you want to see future content, you can
                follow me{' '}
                <a
                  href="https://twitter.com/maxleiter"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  on X
                </a>{' '}
                or subscribe to my <a href="/feed.xml">RSS feed</a>.
              </p>
            </footer>
          </div>

          {chrome && (
            <footer className="reader-foot" aria-hidden="true">
              <span>
                <span className="key">Esc</span> Back
              </span>
              <span>
                <span className="key">↑↓</span> Scroll
              </span>
              <span className="reader-foot-url">{url}</span>
            </footer>
          )}
        </article>
      </main>
      {chrome && <CommandPalette />}
    </BladeRoot>
  )
}
