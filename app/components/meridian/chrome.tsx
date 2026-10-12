import type { ReactNode } from 'react'

/**
 * The MERIDIAN chrome every page shares: the painted backdrop, the top bar,
 * the panels and the selection bar. Server-rendered everywhere; the homepage
 * island renders the same components again as its first hydration pass, so
 * nothing here may read anything a second render could see differently.
 *
 * Class names are spelled out in full (`mx-` prefix, app/styles/meridian.css)
 * because every sheet is pruned against the literal classes in the output.
 */

/** Section counts for the hint bar, one record per page. */
export interface MeridianCounts {
  missions: number
  films: number
  objects: number
  playlists: number
}

export interface Crumb {
  label: string
  href?: string
}

/**
 * The painted sky: a gas giant, the ring's lit arc, a sun and a star field,
 * entirely in CSS gradients. Content pages get only this; the homepage puts
 * its GPU scene on top of it, so the scene's first frame replaces a picture
 * of itself rather than an empty page. `night` keeps it dark under the day
 * theme, which the homepage always is.
 */
export function Sky({ night = false }: { night?: boolean }) {
  return (
    <div className={night ? 'mx-sky mx-night' : 'mx-sky'} aria-hidden="true">
      <div className="mx-sky-planet" />
      <div className="mx-sky-ring" />
    </div>
  )
}

/**
 * The selection bar: the bracketed, pulsing highlight behind a menu row. Its
 * markup is three empty elements the stylesheet draws; CSS shows it on hover
 * and focus, and the homepage island adds `mx-sel` for arrow selection.
 */
export function SelBar() {
  return (
    <span className="mx-bar" aria-hidden="true">
      <i />
      <b />
      <i />
    </span>
  )
}

export function Brand() {
  return (
    <a className="mx-brand" href="/" aria-label="Meridian: main menu">
      Meridian
    </a>
  )
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="mx-crumb" aria-label="Breadcrumb">
      <ol>
        {crumbs.map((crumb, index) =>
          crumb.href && index < crumbs.length - 1 ? (
            <li key={crumb.label}>
              <a href={crumb.href}>{crumb.label}</a>
            </li>
          ) : (
            <li key={crumb.label} aria-current="page">
              <b>{crumb.label}</b>
            </li>
          ),
        )}
      </ol>
    </nav>
  )
}

/** The search and theme chips; the runtime owns both buttons' clicks. */
export function TopChips() {
  return (
    <>
      <span className="mx-net">
        <i aria-hidden="true" />
        Online
      </span>
      <button
        type="button"
        className="mx-chip"
        data-open-palette
        aria-label="Search (⌘K)"
      >
        <svg className="mx-chip-ico" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M7 2a5 5 0 1 0 0 10A5 5 0 0 0 7 2zm4 9 3.5 3.5" />
        </svg>
        <span className="mx-chip-label">Search</span>
        <span className="mx-key" aria-hidden="true">
          ⌘K
        </span>
      </button>
      <button
        type="button"
        className="mx-chip mx-theme"
        data-theme-toggle
        aria-label="Switch between night and day themes"
      >
        <span className="mx-theme-night">Night</span>
        <span className="mx-theme-day">Day</span>
      </button>
    </>
  )
}

export function TopBar({
  crumbs,
  children,
}: {
  crumbs: Crumb[]
  /** The right-hand group. Content pages pass `TopChips`. */
  children: ReactNode
}) {
  return (
    <header className="mx-top">
      <div className="mx-wrap mx-top-in">
        <div className="mx-top-l">
          <Brand />
          <span className="mx-brand-sep" aria-hidden="true" />
          <Breadcrumbs crumbs={crumbs} />
        </div>
        <div className="mx-top-r">{children}</div>
      </div>
    </header>
  )
}

export function Counts({ counts }: { counts: MeridianCounts }) {
  return (
    <p className="mx-hints-r">
      <b>{counts.missions}</b> missions · <b>{counts.films}</b> films ·{' '}
      <b>{counts.objects}</b> objects · <b>{counts.playlists}</b> playlists
    </p>
  )
}

/** A panel header: the bright left tick, a label, and a dim aside. */
export function PanelHead({
  children,
  aside,
  id,
  as: Tag = 'h2',
}: {
  children: ReactNode
  aside?: ReactNode
  id?: string
  /** `p` where the header is decoration and a heading would break the outline. */
  as?: 'h2' | 'h3' | 'p'
}) {
  return (
    <Tag className="mx-ph" id={id}>
      <span>{children}</span>
      {aside !== undefined && <small>{aside}</small>}
    </Tag>
  )
}

/** The big tracked screen title and its kicker line. */
export function ScreenHead({
  title,
  sub,
  as: Tag = 'h1',
}: {
  title: string
  sub: ReactNode
  /** `p` on article pages, whose `<h1>` is the article's own title. */
  as?: 'h1' | 'p'
}) {
  return (
    <div className="mx-head">
      <Tag className="mx-title">{title}</Tag>
      <p className="mx-sub">{sub}</p>
    </div>
  )
}

export function Key({ children }: { children: ReactNode }) {
  return (
    <span className="mx-key" aria-hidden="true">
      {children}
    </span>
  )
}
