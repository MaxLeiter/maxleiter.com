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

export interface Head {
  /** Rendered as `${title} | Max Leiter`, or `Max Leiter` when absent. */
  title?: string
  /**
   * Set false to emit `title` verbatim. Next's `%s | Max Leiter` template
   * reaches the layouts but not `generateMetadata` on a post, so post pages
   * ship a bare title today and the baseline records that.
   */
  titleSuffix?: boolean
  description: string
  /** Absolute URL. */
  canonical: string
  /** Absolute URL to a PNG. Defaults to the site card. */
  ogImage?: string
  ogType?: 'website' | 'article'
  /** ISO, articles only. */
  publishedTime?: string
  noindex?: boolean
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
}

/** What `framework/entry-server.tsx` exports. */
export type GetPages = (ctx: BuildContext) => Promise<PageDef[]>
