import { writeFeeds, type FeedsOptions, type FeedsResult } from './feeds'
import type { FontResult } from './fonts'
import { writeOgImages, type OgResult } from './og'
import { writeVercelConfig, type VercelResult } from './vercel'
import type { BuildContext } from './types'

/**
 * Everything that talks to the Vercel platform rather than to React: OG
 * images, feeds and the Build Output API config.
 *
 * Fonts are the exception: `build.ts` prepares them itself, because the page
 * shell needs their CSS before any of this runs, and passes the result in so
 * the report line can show it.
 */

export interface PlatformResult {
  fonts: FontResult
  og: OgResult
  feeds: FeedsResult
  vercel: VercelResult
  ms: number
}

/**
 * Everything `writeFeeds` needs, plus the fonts `build.ts` already prepared.
 *
 * Fonts are passed in rather than prepared here: the page shell needs their
 * CSS and preload hrefs long before this runs, and preparing them in both
 * places re-read, re-hashed and rewrote both woff2 files on every build.
 */
export interface PlatformOptions extends FeedsOptions {
  fonts: FontResult
}

export async function runPlatformSteps(
  ctx: BuildContext,
  options: PlatformOptions,
): Promise<PlatformResult> {
  const started = performance.now()

  // Disjoint outputs: the per-post PNGs, the feed/sitemap/robots/search-index
  // set, and config.json. None of the three reads what another writes.
  const [og, feeds, vercel] = await Promise.all([
    writeOgImages(ctx),
    writeFeeds(ctx, options),
    writeVercelConfig(ctx),
  ])

  return {
    fonts: options.fonts,
    og,
    feeds,
    vercel,
    ms: performance.now() - started,
  }
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
