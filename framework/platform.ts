import { writeFeeds, type FeedsOptions, type FeedsResult } from './feeds'
import { prepareFonts, type FontResult } from './fonts'
import { writeOgImages, type OgResult } from './og'
import { writeVercelConfig, type VercelResult } from './vercel'
import type { BuildContext } from './types'

/**
 * Everything that talks to the Vercel platform rather than to React: font
 * subsets, OG images, feeds and the Build Output API config.
 *
 * Fonts run first because `build.ts` needs the returned CSS and preload hrefs
 * for the page shell. The other three only write files.
 */

export interface PlatformResult {
  fonts: FontResult
  og: OgResult
  feeds: FeedsResult
  vercel: VercelResult
  ms: number
}

export interface PlatformOptions {
  /**
   * Renders a post or note body to HTML for the feed. Pass mdx.ts's renderer
   * bound to the build's cacheDir and highlighter. Without it the feed falls
   * back to `marked`, which is what scripts/rss.mts used.
   */
  renderPostHtml?: FeedsOptions['renderPostHtml']
}

export async function runPlatformSteps(
  ctx: BuildContext,
  options: PlatformOptions = {},
): Promise<PlatformResult> {
  const started = performance.now()

  const fonts = await prepareFonts(ctx)
  const og = await writeOgImages(ctx)
  const feeds = await writeFeeds(ctx, {
    renderPostHtml: options.renderPostHtml,
  })
  const vercel = await writeVercelConfig(ctx)

  return { fonts, og, feeds, vercel, ms: performance.now() - started }
}

/** One line per step, for the build log. */
export function formatPlatformResult(result: PlatformResult): string {
  const font = result.fonts.sizes
    .map((f) => `${f.name} ${kb(f.before)}->${kb(f.after)}`)
    .join(', ')
  return [
    `platform ${result.ms.toFixed(0)}ms`,
    `  fonts   ${font}`,
    `  og      ${result.og.total} images (${result.og.rendered} rendered, ` +
      `${result.og.cached} cached) ${result.og.ms.toFixed(0)}ms`,
    `  feeds   ${result.feeds.feedItems} feed items, ` +
      `${result.feeds.sitemapUrls} sitemap urls, ` +
      `${result.feeds.searchItems} search items`,
    `  vercel  ${result.vercel.routes} routes`,
  ].join('\n')
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)}KB`
}

export default runPlatformSteps
