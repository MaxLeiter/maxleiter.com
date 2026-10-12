/**
 * The single owner of the `view-transition-name` convention.
 *
 * The same `blog-post-<slug>` / `note-<slug>` / `page-<name>` rule used to be
 * written out three times, as string templates, a helper in an island and a
 * regex over the destination URL. A cross-document morph only happens when
 * the outgoing and incoming elements agree exactly, and a mismatch degrades to
 * a cross-fade with no error and no failing test. One module: the pages and
 * the homepage dashboard's rows name elements with it, the router reads it.
 *
 * Deliberately dependency-free: framework/client/router.ts is bundled for the
 * browser by esbuild.
 *
 * In `shared/`: this file may import nothing but node builtins and React
 * types, because the build, the client bundle and `tools/` all reach it.
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

/**
 * True when some element already claims `name` as a live inline style.
 *
 * Browser-only. The router asks before handing a clicked card the outgoing
 * name, because a page may already render it as a style of its own. Two
 * elements holding one `view-transition-name` cancels the transition outright.
 */
export function isNameLive(name: string): boolean {
  for (const el of document.querySelectorAll<HTMLElement>('[style]')) {
    if (el.style.viewTransitionName === name) return true
  }
  return false
}
