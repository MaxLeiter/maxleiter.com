import type { ReactNode } from 'react'
import { Avatar } from './avatar'

/**
 * The bar across the top of every page: the profile card, which is the way
 * home, and the tools. Search and the theme toggle are plain buttons the
 * runtime handles through `[data-open-palette]` and `[data-theme-toggle]`;
 * the homepage passes its own extra controls through `children`.
 */

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

function ThemeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
    </svg>
  )
}

export interface TopBarProps {
  /** False on the homepage, which stays dark: it is a room, not a page. */
  themeToggle?: boolean
  children?: ReactNode
}

export function TopBar({ themeToggle = true, children }: TopBarProps) {
  return (
    <header className="ui-top">
      <a className="ui-card" href="/" aria-label="Max Leiter, home">
        <Avatar className="ui-pfp" />
        <span className="ui-card-text">
          <b>Max Leiter</b>
          <span>
            <i className="ui-dot" />
            Software engineer
          </span>
        </span>
      </a>
      <div className="ui-tools">
        {children}
        <button
          type="button"
          className="ui-pill"
          data-open-palette
          aria-label="Search"
          aria-keyshortcuts="Control+K Meta+K"
        >
          <SearchIcon />
          <span className="ui-pill-label">Search</span>
        </button>
        {themeToggle && (
          <button
            type="button"
            className="ui-pill"
            data-theme-toggle
            aria-label="Toggle light and dark theme"
          >
            <ThemeIcon />
          </button>
        )}
      </div>
    </header>
  )
}
