/**
 * The client-safe view of the content model.
 *
 * `framework/shared/types.ts` owns the build-side record types -- `Post`, `Note`,
 * `Project`, `BuildContext` -- which are loaded with gray-matter and `node:fs`.
 * These are the flattened shapes that reach a component, and they live here
 * because the desktop island imports them and nothing the client bundle reaches
 * may pull in `node:fs`. Anything shared between the build and an island has to
 * be a leaf module.
 */

/**
 * One row in a list of content: local posts, external posts and notes, flat and
 * date-sorted. `framework/content` builds these with `buildEntries`; /blog,
 * the homepage and the desktop island all render them.
 */
export interface ListEntry {
  /** A third-party post has no slug, so its href doubles as the identifier. */
  slug: string
  title: string
  /** The human string from frontmatter, e.g. `Jun 3, 2026`. */
  date: string
  /** ISO 8601 form of `date`. */
  dateISO: string
  excerpt: string
  href?: string
  isThirdParty?: boolean
  type: 'post' | 'note'
}

/** The display shape the projects page and the desktop widget consume. */
export interface ProjectCard {
  id: string
  name: string
  description: string
  link: string
  tech: string[]
}

/** The minimum an entry needs for `entryHref` to place it. */
export interface HrefEntry {
  /** Absent only on a third-party post, which returns its `href` instead. */
  slug: string | undefined
  /**
   * The loader's discriminant: only a post carries `post`, while a note
   * carries `snippet`, `tip` or `note`.
   */
  type: string
  href?: string
  isThirdParty?: boolean
}

/**
 * Where a piece of content lives. The one implementation of the rule, shared
 * by the feed, the search index, the list pages and the desktop island; pass
 * `base` for an absolute URL.
 */
export function entryHref(entry: HrefEntry, base = ''): string {
  if (entry.isThirdParty && entry.href) return entry.href
  const section = entry.type === 'post' ? 'blog' : 'notes'
  return `${base}/${section}/${entry.slug}`
}

/**
 * The posts pinned above the recent list on /blog and on the desktop widget.
 * One declaration: there used to be three.
 */
export const POPULAR_SLUGS = ['weights', 'xios', 'formatting']
