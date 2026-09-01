import type { BuildContext, Note, PageHead, Post, RouteInfo } from './types'
import { getPages } from './routes'
import { takeIslandManifest } from './islands'
import { collectLanguages, getHighlighter, highlightCss } from './highlight'
import { absoluteUrl } from './content'
import { renderBody, renderPartial, renderShell, type Fonts } from './render'
import { renderPostHtml } from './mdx'
import { resetArticleImages } from '../app/mdx/static-components'

/**
 * The server bundle's entry point.
 *
 * esbuild bundles this file with a plugin for `*.module.css`, then `build.ts`
 * imports the result. That is what makes path aliases, CSS modules and JSX
 * behave identically under bun and node: nothing is resolved by a runtime
 * loader.
 *
 * Rendering happens in two passes. Bodies come first, because rendering them is
 * what registers island names and mints the shiki style classes; only then can
 * the stylesheet and the client bundles be built. `wrapPage` then puts each
 * body inside the shell.
 */

/** A rendered document: its manifest record, its head, and its markup. */
export interface RenderedPage extends RouteInfo {
  head: PageHead
  body: string
  /** Island names this page actually rendered, for its own bootstrap map. */
  islands: string[]
}

/**
 * The union across every page, which is what the client bundler needs. Each
 * page carries only its own names, so a content page's `__islands` JSON does
 * not advertise the desktop.
 */
let allIslands = new Set<string>()

export function islandManifest(): string[] {
  return [...allIslands].sort()
}

export async function renderAll(ctx: BuildContext): Promise<RenderedPage[]> {
  takeIslandManifest()
  allIslands = new Set<string>()
  const pages = await getPages(ctx)
  const rendered: RenderedPage[] = []

  const finish = (
    route: RouteInfo,
    head: PageHead,
    body: string,
  ): RenderedPage => {
    const islands = takeIslandManifest()
    for (const name of islands) allIslands.add(name)
    return { ...route, head, body, islands }
  }

  for (const page of pages) {
    // The canonical URL is the route's own path, always. Deriving it here is
    // what lets a `PageDef` stop restating its own path as a string.
    const canonical = absoluteUrl(ctx, page.path)
    const embed = Boolean(page.variants?.embed)

    // Per document, so the LCP image of every page (and of every embed
    // variant) is the first one in that page's own body.
    resetArticleImages()
    rendered.push(
      finish(
        {
          path: page.path,
          kind: 'page',
          title: page.head.title,
          noindex: Boolean(page.head.noindex),
          ...(embed ? { variants: ['embed' as const] } : {}),
          ...(page.aliases ? { aliases: page.aliases } : {}),
        },
        { ...page.head, canonical },
        renderBody(await page.render({ toolbar: true })),
      ),
    )

    if (embed) {
      resetArticleImages()
      rendered.push(
        finish(
          {
            path: `${page.path}/embed`,
            kind: 'embed',
            title: page.head.title,
            noindex: true,
            variantOf: page.path,
          },
          // An embed keeps the canonical of the page it varies: it is the same
          // document without the chrome, and only one of the two belongs in an
          // index.
          { ...page.head, canonical, noindex: true },
          renderBody(await page.render({ toolbar: false })),
        ),
      )
    }
  }

  return rendered
}

export interface WrapOptions {
  /** Base sheet (identical site-wide) and this route's fragments. */
  css: { base: string; page: string }
  fonts: Fonts
  assets: Record<string, string>
  islands: Record<string, string>
  siteUrl: string
  /** Built runtime source, inlined by the shell; see `ShellOptions.runtime`. */
  runtime?: string
}

export const wrapPage = (page: RenderedPage, options: WrapOptions): string =>
  renderShell({ head: page.head, body: page.body, ...options })

/** The soft-navigation variant of the same page; see `renderPartial`. */
export const wrapPartial = (page: RenderedPage, options: WrapOptions): string =>
  renderPartial({ head: page.head, body: page.body, ...options })

/**
 * `feeds.ts` renders one feed item at a time and `collectLanguages` scans every
 * post and note body, while `getHighlighter` ignores its argument after the
 * first call. Resolving it once turns 38 scans of the whole corpus into one.
 */
let feedHighlighter: ReturnType<typeof getHighlighter> | null = null

/**
 * Renders one post or note body to HTML for the RSS feed, through the same MDX
 * pipeline the pages use. `framework/feeds.ts` takes this as an option and
 * falls back to `marked` without it, which is what leaked JSX components into
 * the feed as raw text.
 */
export async function renderFeedHtml(
  ctx: BuildContext,
  post: Post | Note,
): Promise<string> {
  feedHighlighter ??= getHighlighter(
    collectLanguages([...ctx.posts, ...ctx.notes].map((item) => item.body)),
  )
  return renderPostHtml(post.body, {
    cacheDir: ctx.cacheDir,
    highlighter: await feedHighlighter,
  })
}

export { highlightCss }
