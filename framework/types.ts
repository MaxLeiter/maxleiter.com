import type { ReactElement } from 'react'

/**
 * Shared types for the bespoke build pipeline.
 *
 * `framework/types.ts` is the interface every other framework module imports.
 * See `docs/rewrite/CONTRACT.md` "Shared types".
 */

export type Base = {
  title: string
  description: string
  href?: string
}

export type Post = Base & {
  /** Not defined for third-party posts. */
  slug: string | undefined
  /** The human string from frontmatter, e.g. `Jun 3, 2026`. */
  date: string
  /** ISO 8601 form of `date`, for feeds, sitemap, OG and `<time datetime>`. */
  dateISO: string
  tags: string[]
  body: string
  /** Third-party only. */
  isThirdParty?: boolean
  type: 'post'
}

export type Project = Base & {
  role: string
  years: string[]
  type: 'project'
}

export type Note = Base & {
  date: string
  dateISO: string
  body: string
  slug: string
  type: 'snippet' | 'tip' | 'note'
}

/** Logical asset name -> hashed public URL. */
export type AssetManifest = Record<string, string>

export interface Site {
  url: 'https://maxleiter.com'
  title: 'Max Leiter'
  author: 'Max Leiter'
}

export interface BuildContext {
  /** Repo root, absolute. */
  root: string
  /** `${root}/.vercel/output` */
  outDir: string
  /** `${outDir}/static` */
  staticDir: string
  /** `${root}/.cache`, gitignored: MDX, shiki and OG artifacts. */
  cacheDir: string
  /** Published only, date descending, with body. */
  posts: Post[]
  /** Published only, date descending, with body. */
  notes: Note[]
  projects: Project[]
  /** Hardcoded Vercel posts, merged into indexes and the feed. */
  externalPosts: Post[]
  site: Site
  /** e.g. `runtime.js` -> `/_assets/runtime.3f9a.js` */
  assets: AssetManifest
}

/**
 * What a route declares about its document. The canonical URL is deliberately
 * absent: it is always the route's own path against `ctx.site.url`, so
 * `entry-server.ts` derives it once rather than every `PageDef` restating its
 * own path as a string.
 */
export interface Head {
  /** Rendered as `${title} | Max Leiter`, or `Max Leiter` when absent. */
  title?: string
  description: string
  /** Absolute URL to a PNG. Defaults to the site card. */
  ogImage?: string
  ogType?: 'website' | 'article'
  /** ISO, articles only. */
  publishedTime?: string
  noindex?: boolean
}

/** A `Head` with the canonical URL the build resolved for the route. */
export interface PageHead extends Head {
  /** Absolute URL. An embed variant carries the URL of the page it varies. */
  canonical: string
}

export interface PageVariants {
  /** Also emit `${path}/embed/index.html`, rendered with `toolbar={false}`. */
  embed?: boolean
}

export interface PageDef {
  /** URL path, leading slash, no trailing slash. e.g. `/blog/weights` */
  path: string
  head: Head
  render: (opts: { toolbar: boolean }) => Promise<ReactElement> | ReactElement
  variants?: PageVariants
  /**
   * Extra output paths that get this page's markup verbatim. `/404` declares
   * `/404.html` here because Vercel's static builder injects an error-phase
   * route to that filename ahead of ours; the write loop stays generic.
   */
  aliases?: string[]
}

/** What `framework/entry-server.tsx` exports. */
export type GetPages = (ctx: BuildContext) => Promise<PageDef[]>

/**
 * One route in `.vercel/output/routes.json`, which the build emits beside
 * `static/` (so Vercel ignores it) as the single record of what it produced.
 *
 * The sitemap, the dev server and the snapshot harness all read this instead
 * of keeping their own transcription of the page registry. Deterministic on
 * purpose: no timestamps, registry order preserved.
 */
export interface RouteInfo {
  /** URL path, leading slash, no trailing slash. */
  path: string
  kind: 'page' | 'embed'
  /** `Head.title`, before the site suffix. Absent on the homepage. */
  title?: string
  noindex: boolean
  /** Present on a page that also has variants. */
  variants?: 'embed'[]
  /** For an embed, the page it varies. */
  variantOf?: string
  /** Extra filenames written with this page's markup. */
  aliases?: string[]
}

export interface RouteManifest {
  routes: RouteInfo[]
}
