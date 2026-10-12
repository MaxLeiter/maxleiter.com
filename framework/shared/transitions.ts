/**
 * The single owner of the `view-transition-name` convention.
 *
 * The `blog-post-<slug>` / `note-<slug>` rule is used by the article pages,
 * which name their `<article>`, by the mission and film rows on `/blog` and
 * `/notes`, which offer the same name through `data-vt-name`, and by the
 * router, which works out from a destination URL what the clicked element
 * should hand over to. A morph only happens when the outgoing and incoming
 * elements agree exactly, and a mismatch degrades to a cross-fade with no
 * error and no failing test, which is why there is one module.
 *
 * Deliberately dependency-free: framework/client/router.ts is bundled for the
 * browser by esbuild.
 *
 * In `shared/`: this file may import nothing but node builtins and React
 * types, because the build, the client bundle and `tools/` all reach it.
 */

export type TransitionKind = 'blog' | 'note'

const PREFIXES: Record<TransitionKind, string> = {
  blog: 'blog-post-',
  note: 'note-',
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
 * name, because an article on the page may already hold it. Two elements
 * holding one `view-transition-name` cancels the transition outright.
 */
export function isNameLive(name: string): boolean {
  for (const el of document.querySelectorAll<HTMLElement>('[style]')) {
    if (el.style.viewTransitionName === name) return true
  }
  return false
}
