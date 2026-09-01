/**
 * How a URL becomes a file in `static/`. One table, three consumers.
 *
 * `framework/platform/vercel.ts` translates the rules below into Build Output
 * API routes, `framework/dev.ts` interprets them to serve locally, and
 * `tools/snapshot.ts --dir` interprets them to read the build the way Vercel
 * would. Those three used to be hand-written separately and had already
 * drifted: only config.json knew about the redirects, only the snapshot tool
 * rewrote `?embed`, and it rewrote it on every path rather than on the two
 * sections the platform actually rewrites.
 *
 * Nothing here imports anything but node builtins, so `tools/*.ts` can import
 * it unbundled (bun, or node's type stripping) as
 * `../framework/shared/routing.ts`.
 *
 * In `shared/`: this file may import nothing but node builtins and React
 * types, because the build, the client bundle and `tools/` all reach it.
 */

/** A permanent redirect, in the order config.json emits them. */
export interface Redirect {
  source: string
  destination: string
}

export const REDIRECTS: readonly Redirect[] = [
  { source: '/X11', destination: '/blog/X11' },
  { source: '/atom', destination: '/feed.xml' },
  { source: '/feed', destination: '/feed.xml' },
  { source: '/rss', destination: '/feed.xml' },
]

/**
 * Sections where `/<section>/<slug>?embed=true` is rewritten onto the
 * standalone embed page. Those links predate the embed routes and are still
 * out in the world; the list-page embeds never had a query form.
 */
export const EMBED_SECTIONS = ['blog', 'notes'] as const

/** Hashed output lives here and is served immutable. */
export const ASSET_PREFIX = '/_assets/'

export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'

const EMBED_MATCH = new RegExp(`^/(${EMBED_SECTIONS.join('|')})/([^/]+)$`)

/**
 * Directory output: `/blog/weights` -> `blog/weights/index.html`, `/` ->
 * `index.html`, and anything whose last segment carries an extension is a real
 * file (`/favicon.ico`, `/404.html`).
 */
export function staticPathFor(routePath: string): string {
  const clean = routePath.replace(/^\/+/, '').replace(/\/+$/, '')
  if (clean === '') return 'index.html'
  const last = clean.split('/').pop() ?? ''
  return last.includes('.') ? clean : `${clean}/index.html`
}

export interface Resolved {
  /** Redirect target, when the request is one. Nothing else is set. */
  redirect?: string
  /** File inside `static/`, relative and slash-separated. */
  file?: string
  /**
   * A miss must 404 outright instead of falling through to the 404 page: a
   * missing hashed asset must never inherit the immutable header, or one bad
   * deploy poisons every CDN edge for a year.
   */
  noFallback?: boolean
}

/**
 * Resolve one request the way `config.json` does, in the same order: trailing
 * slash, redirects, the `?embed` rewrite, then the filesystem.
 */
export function resolveRequest(pathname: string, query = ''): Resolved {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return { redirect: pathname.replace(/\/+$/, '') }
  }

  for (const redirect of REDIRECTS) {
    if (redirect.source === pathname) return { redirect: redirect.destination }
  }

  const embed = new URLSearchParams(query).has('embed')
  const match = embed ? EMBED_MATCH.exec(pathname) : null
  if (match) return { file: staticPathFor(`${pathname}/embed`) }

  return {
    file: staticPathFor(pathname),
    ...(pathname.startsWith(ASSET_PREFIX) ? { noFallback: true } : {}),
  }
}

/**
 * Content types for the static tree. The dev server and the snapshot reader
 * both model how Vercel serves these files, so they must agree down to the
 * charset or the harness compares against a slightly different server than the
 * one `pnpm dev` exercises.
 */
export const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mem': 'application/octet-stream',
  '.rom': 'application/octet-stream',
}

export function contentTypeFor(file: string): string {
  const dot = file.lastIndexOf('.')
  const ext = dot === -1 ? '' : file.slice(dot).toLowerCase()
  return CONTENT_TYPES[ext] ?? 'application/octet-stream'
}
