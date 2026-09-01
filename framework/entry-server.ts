import type { BuildContext, Head, Note, Post } from './types'
import { getPages } from './routes'
import { resetIslandManifest, takeIslandManifest } from './islands'
import { collectLanguages, getHighlighter, highlightCss } from './highlight'
import { renderBody, renderShell, type Fonts } from './render'
import { renderPostHtml } from './mdx'
import { resetArticleImages } from '../app/mdx/static-components'

/**
 * The server bundle's entry point.
 *
 * esbuild bundles this file with plugins for `*.module.css` and the `next/*`
 * aliases, then `build.ts` imports the result. That is what makes path
 * aliases, CSS modules and JSX behave identically under bun and node: nothing
 * is resolved by a runtime loader.
 *
 * Rendering happens in two passes. Bodies come first, because rendering them is
 * what registers island names and mints the shiki style classes; only then can
 * the stylesheet and the client bundles be built. `wrapPages` then puts each
 * body inside the shell.
 */

export interface RenderedPage {
  /** URL path, leading slash, no trailing slash. */
  path: string
  head: Head
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
  resetIslandManifest()
  allIslands = new Set<string>()
  const pages = await getPages(ctx)
  const rendered: RenderedPage[] = []

  const finish = (path: string, head: Head, body: string): RenderedPage => {
    const islands = takeIslandManifest()
    for (const name of islands) allIslands.add(name)
    return { path, head, body, islands }
  }

  for (const page of pages) {
    // Per document, so the LCP image of every page (and of every embed
    // variant) is the first one in that page's own body.
    resetArticleImages()
    rendered.push(
      finish(
        page.path,
        page.head,
        renderBody(await page.render({ toolbar: true })),
      ),
    )

    if (page.variants?.embed) {
      resetArticleImages()
      rendered.push(
        finish(
          `${page.path}/embed`,
          { ...page.head, canonical: page.head.canonical, noindex: true },
          renderBody(await page.render({ toolbar: false })),
        ),
      )
    }
  }

  return rendered
}

export interface WrapOptions {
  css: string
  fonts: Fonts
  assets: Record<string, string>
  islands: Record<string, string>
  extraBodyHtml?: string
}

export function wrapPage(page: RenderedPage, options: WrapOptions): string {
  return renderShell({
    head: page.head,
    body: page.body,
    css: options.css,
    fonts: options.fonts,
    assets: options.assets,
    islands: options.islands,
    extraBodyHtml: options.extraBodyHtml,
  })
}

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
  const highlighter = await getHighlighter(
    collectLanguages([...ctx.posts, ...ctx.notes].map((item) => item.body)),
  )
  return renderPostHtml(post.body, {
    cacheDir: `${ctx.root}/.cache`,
    highlighter,
  })
}

export { highlightCss }
