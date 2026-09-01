export interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
  href?: string
  isThirdParty?: boolean
  type: 'post' | 'note'
}

export interface Project {
  id: string
  name: string
  description: string
  link: string
  tech: string[]
  content: string
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
 *
 * It lives here rather than in `framework/content.ts` because the desktop
 * island imports it, and nothing the client bundle reaches may pull in
 * `node:fs` or gray-matter.
 */
export function entryHref(entry: HrefEntry, base = ''): string {
  if (entry.isThirdParty && entry.href) return entry.href
  const section = entry.type === 'post' ? 'blog' : 'notes'
  return `${base}/${section}/${entry.slug}`
}
