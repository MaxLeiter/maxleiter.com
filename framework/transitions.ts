/**
 * The single owner of the `view-transition-name` convention.
 *
 * The same `blog-post-<slug>` / `note-<slug>` / `page-<name>` rule used to be
 * written out three times: string templates in app/pages/article-pages.tsx, a
 * helper in app/islands/desktop/data.ts, and a regex over the destination URL
 * in framework/client/runtime.ts. A cross-document morph only happens when the
 * outgoing and incoming elements agree exactly, and a mismatch degrades to a
 * cross-fade with no error and no failing test. One module, three importers.
 *
 * Deliberately dependency-free: framework/client/runtime.ts is bundled for the
 * browser by esbuild, and app/islands/desktop/data.ts ships inside the desktop
 * island chunk.
 */

export type TransitionKind = 'blog' | 'note' | 'page'

const PREFIXES: Record<TransitionKind, string> = {
  blog: 'blog-post-',
  note: 'note-',
  page: 'page-',
}

export function transitionName(kind: TransitionKind, slug: string): string {
  return `${PREFIXES[kind]}${slug}`
}

/**
 * The name an article URL's `<article>` carries, or null for any other URL.
 *
 * Used by the runtime to work out what the outgoing page should hand over to.
 * The kind comes from the path segment, so a note card can pair with its note;
 * hardcoding the post prefix once meant it never could.
 */
export function transitionNameForUrl(url: string): string | null {
  const match = /\/(blog|notes)\/([^/?#]+)/.exec(url)
  if (!match) return null
  const [, section, slug] = match
  return transitionName(section === 'notes' ? 'note' : 'blog', slug)
}
