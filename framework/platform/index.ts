import { writeFeeds, type FeedsOptions, type FeedsResult } from './feeds'
import { writeOgImages, type OgResult } from './og'
import { writeVercelConfig, type VercelResult } from './vercel'
import type { FontResult } from '../assets/fonts'
import type { BuildContext } from '../shared/types'

/**
 * Everything that talks to the Vercel platform rather than to React: OG images,
 * feeds and the Build Output API config.
 *
 * Exactly three writers, run together because their outputs are disjoint. The
 * fonts used to be documented here as an exception, because `build.ts` prepares
 * them itself before any page is written; they now sit in `../assets` with the
 * other two producers the shell depends on, so there is no exception left to
 * apologise for. The prepared result is still passed in, so the log line can
 * report it alongside the rest.
 */

export interface PlatformResult {
  fonts: FontResult
  og: OgResult
  feeds: FeedsResult
  vercel: VercelResult
  ms: number
}

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
