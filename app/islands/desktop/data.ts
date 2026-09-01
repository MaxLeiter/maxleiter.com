/**
 * The shapes the desktop island receives through `data-props`, and the URL
 * helpers both the static page and the island use.
 *
 * These are deliberately narrower than `BlogPost`/`Project`: `excerpt` and
 * `content` are never read on the homepage, and every byte here is serialized
 * into the HTML twice over (once as markup, once as the island's props JSON).
 */

import { entryHref } from '@lib/types'
import { transitionName } from '@framework/shared/transitions'

export type WindowId =
  | 'calculator'
  | 'about'
  | 'projects'
  | 'blog-list'
  | 'labs'
  | 'talks'
  | 'notes'

export interface DesktopPost {
  slug: string
  title: string
  date: string
  href?: string
  isThirdParty?: boolean
  type: 'post' | 'note'
}

export interface DesktopProject {
  id: string
  name: string
  description: string
  link: string
  tech: string[]
}

export interface DesktopProps {
  posts: DesktopPost[]
  projects: DesktopProject[]
}

/**
 * Below this width the desktop is not a desktop: folder icons and post cards
 * are plain navigations, no window ever opens, and the embed prefetch in
 * app/pages/home.tsx is gated on the same number through a `media` query.
 */
export const DESKTOP_MIN_WIDTH = 768

/**
 * The chrome-free variant a window iframes. The `?embed=true` handshake it
 * replaces removed `#blog-toolbar` from the DOM with a blocking inline script
 * so a `useState` initializer would not trip hydration; two HTML files need
 * neither.
 */
export function embedHref(post: DesktopPost): string {
  return `${entryHref(post)}/embed`
}

/** Pairs with the `view-transition-name` the article pages put on `<article>`. */
export function postTransitionName(post: DesktopPost): string {
  return transitionName(post.type === 'note' ? 'note' : 'blog', post.slug)
}

export interface FolderConfig {
  /** The desktop icon's label and its analytics `section`. */
  id: WindowId
  name: string
  route: string
  /** Drawn as a document rather than a folder. */
  file?: boolean
}

/** Desktop order. The icon grid is five across, so About leads the second row. */
export const FOLDERS: FolderConfig[] = [
  { id: 'blog-list', name: 'blog', route: '/blog' },
  { id: 'notes', name: 'notes', route: '/notes' },
  { id: 'projects', name: 'projects', route: '/projects' },
  { id: 'talks', name: 'talks', route: '/talks' },
  { id: 'labs', name: 'labs', route: '/labs' },
  { id: 'about', name: 'ABOUT.md', route: '/about', file: true },
]

export interface ContentWindowConfig extends FolderConfig {
  title: string
  defaultX: number
  defaultY: number
}

/**
 * Where each folder's window opens, cascaded so a second one is not hidden by
 * the first. Derived from FOLDERS rather than restated: the id, name and route
 * were written out twice, so adding a folder to one list and not the other left
 * an icon whose window silently never opened.
 */
const WINDOW_ORIGINS: Record<WindowId, { x: number; y: number }> = {
  about: { x: 200, y: 100 },
  projects: { x: 250, y: 120 },
  'blog-list': { x: 300, y: 140 },
  notes: { x: 325, y: 150 },
  labs: { x: 350, y: 160 },
  talks: { x: 400, y: 180 },
  calculator: { x: 200, y: 100 },
}

export const CONTENT_WINDOWS: ContentWindowConfig[] = FOLDERS.map((folder) => ({
  ...folder,
  title: folder.name,
  defaultX: WINDOW_ORIGINS[folder.id].x,
  defaultY: WINDOW_ORIGINS[folder.id].y,
}))
