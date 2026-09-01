import { windowStyles } from '@lib/window-styles'

/**
 * The window toolbar, with anchors where the Next version had `router.push`
 * buttons (design 3.2). Close returns to `/`, minimize returns to
 * `/?openPost=<slug>` so the homepage reopens that window. Both are now
 * middle-clickable and keyboard-native, and neither needs JavaScript.
 */

interface BreadcrumbSegment {
  name: string
  href: string
}

interface WindowToolbarProps {
  title: string
  segments?: BreadcrumbSegment[]
  /** `/?openPost=<slug>`; omitted on pages that are not a post or note. */
  minimizeHref?: string
}

export function WindowToolbar({
  title,
  segments = [],
  minimizeHref,
}: WindowToolbarProps) {
  return (
    <header className={windowStyles.toolbar} style={windowStyles.translucentBg}>
      <nav
        className="flex items-center gap-2 text-sm font-mono text-[var(--gray)]"
        aria-label="Breadcrumb"
      >
        <a href="/" className="hover:text-[var(--fg)] transition-colors">
          ~
        </a>
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-2">
            <span>/</span>
            <a
              href={segment.href}
              className="hover:text-[var(--fg)] transition-colors"
            >
              {segment.name}
            </a>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-1">
        {minimizeHref && (
          <a
            href={minimizeHref}
            className={windowStyles.button}
            aria-label="Minimize window"
            title="Minimize"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <rect
                x="4"
                y="4"
                width="8"
                height="8"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </a>
        )}
        <a
          href="/"
          className={windowStyles.button}
          aria-label={`Close ${title}`}
        >
          ✕
        </a>
      </div>
    </header>
  )
}
