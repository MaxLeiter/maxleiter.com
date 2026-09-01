import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { ExternalLinkIcon, FolderIconDefault } from '@components/desktop/icons'
import {
  CalculatorIcon,
  GitHubIcon,
  LinkedInIcon,
  SearchIcon,
  ThemeToggle,
  TwitterIcon,
} from '@components/static/desktop-icons'
import { entryHref, POPULAR_SLUGS } from '@lib/types'
import { windowStyles } from '@lib/window-styles'
import {
  FOLDERS,
  postTransitionName,
  type DesktopPost,
  type DesktopProject,
  type WindowId,
} from './data'

/**
 * The resting desktop: menubar, icon grid and the two widgets.
 *
 * `app/pages/home.tsx` renders this with React at build time and the desktop
 * island renders it again with Preact as its first hydration pass, so the two
 * must agree element for element. Handlers are the only thing that varies, and
 * event listeners are not markup.
 *
 * Nothing here calls `track()`. Every clickable carries `data-track` plus the
 * payload keys the runtime's delegated analytics listener reads off `dataset`,
 * so the four events fire identically with the island loaded, still loading, or
 * disabled entirely -- and exactly once, since only one listener sends them.
 */

export interface ChromeHandlers {
  /** Opens a folder window. Absent on the server and below 768px. */
  onFolder?: (id: WindowId, event: MouseEvent) => void
  onCalculator?: (event: MouseEvent) => void
  onPost?: (post: DesktopPost, event: MouseEvent) => void
  /** Warms the window's iframe before the reader commits to opening it. */
  onPostHover?: (post: DesktopPost) => void
  onPostHoverEnd?: () => void
  /** Live clock text. The server renders '' and the inline script fills it in. */
  clock?: string
}

interface DesktopItem {
  id: string
  name: string
  icon: ReactNode
  href?: string
  external?: boolean
  /** Analytics `section`, which is the window id rather than the label. */
  section?: string
  onClick?: (event: MouseEvent) => void
}

const HOVER_BG = { '--hover-bg': 'rgba(255, 255, 255, 0.05)' } as CSSProperties
const ICON_COLOR: CSSProperties = { color: 'var(--fg)', opacity: 0.8 }

function DesktopIcon({ item }: { item: DesktopItem }) {
  const content = (
    <div
      className="flex flex-col items-center gap-2 3xl:gap-3 p-3 3xl:p-4 rounded-lg transition-colors duration-200 cursor-pointer relative"
      style={HOVER_BG}
    >
      <div
        className="h-12 3xl:h-16 flex items-center justify-center transition-colors 3xl:scale-125"
        style={ICON_COLOR}
      >
        {item.icon}
      </div>
      <span
        className="text-xs 3xl:text-sm font-mono text-center truncate w-16 3xl:w-20"
        style={ICON_COLOR}
      >
        {item.name}
      </span>
      {item.external && (
        <div className="absolute top-1 right-1 3xl:top-2 3xl:right-2">
          <ExternalLinkIcon />
        </div>
      )}
    </div>
  )

  if (item.href) {
    return item.external ? (
      <a href={item.href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    ) : (
      <a
        href={item.href}
        data-track={item.section && 'nav_click'}
        data-section={item.section}
        onClick={item.onClick}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      type="button"
      aria-label={`Open ${item.name}`}
      data-track={item.section && 'nav_click'}
      data-section={item.section}
      onClick={item.onClick}
    >
      {content}
    </button>
  )
}

function buildItems(handlers: ChromeHandlers): DesktopItem[] {
  return [
    ...FOLDERS.map((folder) => ({
      id: folder.name,
      name: folder.name,
      icon: <FolderIconDefault />,
      href: folder.route,
      section: folder.id,
      onClick: handlers.onFolder
        ? (event: MouseEvent) => handlers.onFolder?.(folder.id, event)
        : undefined,
    })),
    {
      // The calculator opens a window rather than navigating, and the baseline
      // sends no event for it.
      id: 'calculator',
      name: 'calc',
      icon: <CalculatorIcon />,
      onClick: handlers.onCalculator,
    },
    {
      id: 'github',
      name: 'github',
      icon: <GitHubIcon />,
      href: 'https://github.com/maxleiter',
      external: true,
    },
    {
      id: 'linkedin',
      name: 'linkedin',
      icon: <LinkedInIcon />,
      href: 'https://www.linkedin.com/in/MaxLeiter',
      external: true,
    },
    {
      id: 'twitter',
      name: 'X',
      icon: <TwitterIcon />,
      href: 'https://twitter.com/maxleiter',
      external: true,
    },
  ]
}

const CARD_CLASS =
  'block px-4 3xl:px-5 py-3 3xl:py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group'
const FOOTER_CLASS =
  'block px-4 3xl:px-5 py-2 3xl:py-3 text-center text-xs 3xl:text-sm font-mono text-[var(--gray)] hover:text-[var(--fg)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-t border-[var(--border-color)]'
const WIDGET_CLASS =
  'border border-[var(--border-color)] rounded-lg overflow-hidden backdrop-blur-sm'
const WIDGET_BG: CSSProperties = { backgroundColor: 'var(--bg-widget)' }
const WIDGET_HEAD_CLASS =
  'border-b border-[var(--border-color)] px-4 3xl:px-5 py-3 3xl:py-4'
const WIDGET_TITLE_CLASS =
  'text-xs 3xl:text-sm font-mono font-semibold text-[var(--fg)] uppercase'

function PostRow({
  post,
  handlers,
}: {
  post: DesktopPost
  handlers: ChromeHandlers
}) {
  const external = post.isThirdParty
  const href = entryHref(post)

  const body = (
    <>
      <h3 className="text-sm 3xl:text-base font-mono text-[var(--fg)] group-hover:text-[var(--gray)] transition-colors mb-1">
        {post.title}
      </h3>
      <p className="text-xs 3xl:text-sm text-[var(--gray)]">
        {post.date}
        {external && <span className="ml-2 opacity-50">· external</span>}
        {post.type === 'note' && (
          <span className="ml-2 opacity-50">· note</span>
        )}
      </p>
    </>
  )

  if (external) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={CARD_CLASS}
        >
          {body}
        </a>
      </li>
    )
  }

  return (
    <li>
      <a
        href={href}
        className={CARD_CLASS}
        data-track="blog_click"
        data-slug={post.slug}
        data-vt-name={postTransitionName(post)}
        onClick={
          handlers.onPost
            ? (event: MouseEvent) => handlers.onPost?.(post, event)
            : undefined
        }
        onMouseEnter={
          handlers.onPostHover ? () => handlers.onPostHover?.(post) : undefined
        }
        onMouseLeave={handlers.onPostHoverEnd}
      >
        {body}
      </a>
    </li>
  )
}

export function WidgetRecentPosts({
  posts,
  recentLimit = 3,
  handlers,
}: {
  posts: DesktopPost[]
  recentLimit?: number
  handlers: ChromeHandlers
}) {
  const popular = POPULAR_SLUGS.map((slug) =>
    posts.find((post) => post.slug === slug && !post.isThirdParty),
  ).filter((post): post is DesktopPost => post !== undefined)

  const recent = posts
    .filter((post) => !POPULAR_SLUGS.includes(post.slug) || post.isThirdParty)
    .slice(0, recentLimit)

  return (
    <div className={WIDGET_CLASS} style={WIDGET_BG}>
      <div className={WIDGET_HEAD_CLASS}>
        <h2 className={WIDGET_TITLE_CLASS}>Writing</h2>
      </div>

      <div className="px-4 3xl:px-5 pt-3 3xl:pt-4 pb-1">
        <h3 className="text-xs font-mono text-[var(--gray)]">popular/</h3>
      </div>
      <ul className="divide-y divide-[var(--border-color)]">
        {popular.map((post) => (
          <PostRow key={post.slug} post={post} handlers={handlers} />
        ))}
      </ul>

      <div className="px-4 3xl:px-5 pt-3 3xl:pt-4 pb-1 border-t border-[var(--border-color)]">
        <h3 className="text-xs font-mono text-[var(--gray)]">recent/</h3>
      </div>
      <ul className="divide-y divide-[var(--border-color)]">
        {recent.map((post) => (
          <PostRow key={post.slug} post={post} handlers={handlers} />
        ))}
      </ul>

      <a
        href="/blog"
        className={FOOTER_CLASS}
        data-track="nav_click"
        data-section="blog"
        data-source="widget"
      >
        View all posts →
      </a>
    </div>
  )
}

function ProjectLinkIcon() {
  return (
    <svg
      height="14"
      width="14"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      className="text-[var(--gray)] group-hover:text-[var(--fg)] transition-colors"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.5 10.25V13.25C13.5 13.3881 13.3881 13.5 13.25 13.5H2.75C2.61193 13.5 2.5 13.3881 2.5 13.25L2.5 2.75C2.5 2.61193 2.61193 2.5 2.75 2.5H5.75H6.5V1H5.75H2.75C1.7835 1 1 1.7835 1 2.75V13.25C1 14.2165 1.7835 15 2.75 15H13.25C14.2165 15 15 14.2165 15 13.25V10.25V9.5H13.5V10.25ZM9 1H9.75H14.2495C14.6637 1 14.9995 1.33579 14.9995 1.75V6.25V7H13.4995V6.25V3.56066L8.53033 8.52978L8 9.06011L6.93934 7.99945L7.46967 7.46912L12.4388 2.5H9.75H9V1Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function WidgetTopProjects({
  projects,
  limit = 5,
}: {
  projects: DesktopProject[]
  limit?: number
}) {
  return (
    <div className={WIDGET_CLASS} style={WIDGET_BG}>
      <div className={WIDGET_HEAD_CLASS}>
        <h2 className={WIDGET_TITLE_CLASS}>Projects</h2>
      </div>
      <ul className="divide-y divide-[var(--border-color)]">
        {projects.slice(0, limit).map((project) => {
          const linked = Boolean(project.link) && project.link !== '#'
          const body = (
            <>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm 3xl:text-base font-mono text-[var(--fg)] group-hover:text-[var(--gray)] transition-colors flex-1">
                  {project.name}
                </h3>
                {linked && <ProjectLinkIcon />}
              </div>
              <p className="text-xs 3xl:text-sm text-[var(--gray)] mb-2">
                {project.description}
              </p>
              {project.tech && project.tech.length > 0 && (
                <div className="flex flex-wrap gap-1 3xl:gap-1.5">
                  {project.tech.map((tech) => (
                    <span
                      key={tech}
                      className="inline-block px-1.5 3xl:px-2 py-0.5 3xl:py-1 text-xs 3xl:text-sm bg-black/10 dark:bg-white/10 text-[var(--gray)] rounded border border-[var(--border-color)]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </>
          )

          return (
            <li key={project.id}>
              {linked ? (
                <a
                  className={CARD_CLASS}
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="project_click"
                  data-project={project.id}
                >
                  {body}
                </a>
              ) : (
                <div className={CARD_CLASS}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>
      <a
        href="/projects"
        className={FOOTER_CLASS}
        data-track="nav_click"
        data-section="projects"
        data-source="widget"
      >
        View all projects →
      </a>
    </div>
  )
}

export interface DesktopChromeProps {
  posts: DesktopPost[]
  projects: DesktopProject[]
  handlers?: ChromeHandlers
  /** Windows, snap previews and the preload iframe. Empty on the server. */
  children?: ReactNode
}

export function DesktopChrome({
  posts,
  projects,
  handlers = {},
  children,
}: DesktopChromeProps) {
  return (
    <div className="h-screen bg-(--bg) text-(--fg) overflow-hidden flex flex-col">
      <h1 className="sr-only">Max Leiter&apos;s website</h1>
      <header
        className="h-10 3xl:h-12 border-b border-(--border-color) flex items-center px-4 3xl:px-6 gap-4 3xl:gap-6 text-xs 3xl:text-sm font-mono sticky top-0 z-10"
        style={windowStyles.translucentBg}
      >
        <span className="text-(--gray)" aria-hidden>
          ~
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            data-open-palette
            className="text-(--gray) hover:text-(--fg) transition-colors p-1"
            aria-label="Search (⌘K)"
            title="Search (⌘K)"
          >
            <SearchIcon />
          </button>
          <time id="menubar-clock" className="text-(--gray)">
            {handlers.clock ?? ''}
          </time>
        </div>
      </header>

      <main className="flex-1 p-8 3xl:p-12 overflow-auto relative">
        <div className="flex flex-col lg:flex-row gap-8 3xl:gap-12 relative z-10">
          <nav className="shrink-0" aria-label="Desktop applications">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-8 3xl:gap-12 w-fit">
              {buildItems(handlers).map((item) => (
                <DesktopIcon key={item.id} item={item} />
              ))}
            </div>
          </nav>

          <aside className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 3xl:gap-10 max-w-6xl 3xl:max-w-7xl items-start">
            <WidgetRecentPosts posts={posts} handlers={handlers} />
            <WidgetTopProjects projects={projects} />
          </aside>
        </div>
      </main>

      {children}
    </div>
  )
}
