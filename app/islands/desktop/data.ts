/**
 * The shapes the desktop island receives through `data-props`, and the URL
 * helpers both the static page and the island use.
 *
 * These are deliberately narrower than `BlogPost`/`Project`: `excerpt` and
 * `content` are never read on the homepage, and every byte here is serialized
 * into the HTML twice over (once as markup, once as the island's props JSON).
 */

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

/** Popular slugs pinned above the recent list. Mirrors `@lib/popular-posts`. */
export const POPULAR_SLUGS = ['weights', 'xios', 'formatting']

export function postHref(post: DesktopPost): string {
  if (post.isThirdParty && post.href) return post.href
  return post.type === 'note' ? `/notes/${post.slug}` : `/blog/${post.slug}`
}

/**
 * The chrome-free variant a window iframes. The `?embed=true` handshake it
 * replaces removed `#blog-toolbar` from the DOM with a blocking inline script
 * so a `useState` initializer would not trip hydration; two HTML files need
 * neither.
 */
export function embedHref(post: DesktopPost): string {
  return `${postHref(post)}/embed`
}

/** Pairs with the `view-transition-name` the article pages put on `<article>`. */
export function postTransitionName(post: DesktopPost): string {
  return post.type === 'note' ? `note-${post.slug}` : `blog-post-${post.slug}`
}

export interface FolderConfig {
  /** The desktop icon's label and its analytics `section`. */
  id: WindowId
  name: string
  route: string
}

export const FOLDERS: FolderConfig[] = [
  { id: 'blog-list', name: 'blog', route: '/blog' },
  { id: 'notes', name: 'notes', route: '/notes' },
  { id: 'projects', name: 'projects', route: '/projects' },
  { id: 'about', name: 'about', route: '/about' },
  { id: 'labs', name: 'labs', route: '/labs' },
  { id: 'talks', name: 'talks', route: '/talks' },
]

export interface ContentWindowConfig extends FolderConfig {
  title: string
  defaultX: number
  defaultY: number
}

export const CONTENT_WINDOWS: ContentWindowConfig[] = [
  {
    id: 'about',
    name: 'about',
    title: 'about',
    route: '/about',
    defaultX: 200,
    defaultY: 100,
  },
  {
    id: 'projects',
    name: 'projects',
    title: 'projects',
    route: '/projects',
    defaultX: 250,
    defaultY: 120,
  },
  {
    id: 'blog-list',
    name: 'blog',
    title: 'blog',
    route: '/blog',
    defaultX: 300,
    defaultY: 140,
  },
  {
    id: 'notes',
    name: 'notes',
    title: 'notes',
    route: '/notes',
    defaultX: 325,
    defaultY: 150,
  },
  {
    id: 'labs',
    name: 'labs',
    title: 'labs',
    route: '/labs',
    defaultX: 350,
    defaultY: 160,
  },
  {
    id: 'talks',
    name: 'talks',
    title: 'talks',
    route: '/talks',
    defaultX: 400,
    defaultY: 180,
  },
]
