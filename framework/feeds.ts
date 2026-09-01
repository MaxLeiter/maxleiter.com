import fs from 'node:fs/promises'
import path from 'node:path'
import { marked } from 'marked'
import RSS from 'rss'
import { buildEntries, entryHref } from './content'
import type { BuildContext, Note, Post } from './types'

/**
 * feed.xml, sitemap.xml, robots.txt and search-index.json.
 *
 * Replaces scripts/rss.mts, app/sitemap.ts, app/robots.ts and
 * app/api/search-index/route.ts. Three fixes come with the port:
 *
 *  - scripts/rss.mts read posts/ and notes/ straight off disk with no
 *    `published: false` filter, so 11 unpublished drafts were in the public
 *    feed. Here the feed reads the same filtered arrays every page renders
 *    from, so the leak cannot recur.
 *  - app/sitemap.ts omitted /blog, /notes, /labs and /talks, and carried two
 *    @ts-expect-error casts for a `lastModified` field nothing ever set.
 *  - next build and build-rss ran concurrently and both wrote
 *    public/feed.xml, so the shipped feed could be the previous build's.
 */

/** Every top-level page, in sitemap order. */
const TOP_LEVEL = [
  '',
  '/about',
  '/blog',
  '/notes',
  '/labs',
  '/projects',
  '/talks',
] as const

export interface SearchIndexItem {
  type: 'blog' | 'note' | 'project'
  title: string
  href: string
  external: boolean
}

/**
 * Renders one post or note body to HTML for the feed.
 *
 * The contract had this resolved by dynamically importing `renderPostHtml`
 * from framework/mdx.ts. That turned out to be unsafe: mdx.ts's export takes
 * `(source, { cacheDir, highlighter })` rather than a post, and the dynamic
 * import resolved under bun but not under node, so the two runtimes silently
 * produced different feed bodies. Injection is explicit, typed, and identical
 * everywhere. Core passes a bound renderer through `runPlatformSteps`; without
 * one the feed falls back to `marked`, exactly as scripts/rss.mts did.
 */
export type RenderPostHtml = (post: Post | Note) => string | Promise<string>

export interface FeedsOptions {
  renderPostHtml?: RenderPostHtml
}

/** The exact marked configuration scripts/rss.mts used. */
function markedRenderer(): RenderPostHtml {
  const renderer = new marked.Renderer()
  renderer.link = ({ href, tokens }) => {
    const text = tokens[0]?.raw || ''
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
  }
  marked.setOptions({ gfm: true, breaks: true, renderer })
  return (post) => marked.parse(post.body, { async: false }) as string
}

function itemUrl(ctx: BuildContext, item: Post | Note): string {
  if (item.type === 'post' && item.isThirdParty && item.href) return item.href
  const section = item.type === 'post' ? 'blog' : 'notes'
  return `${ctx.site.url}/${section}/${item.slug}`
}

async function writeFeed(
  ctx: BuildContext,
  render: RenderPostHtml,
): Promise<number> {
  const combined: (Post | Note)[] = [
    ...ctx.posts,
    ...ctx.notes,
    ...ctx.externalPosts,
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const feed = new RSS({
    title: ctx.site.title,
    site_url: ctx.site.url,
    feed_url: `${ctx.site.url}/feed.xml`,
    language: 'en',
    description: "Max Leiter's blog",
  })

  for (const item of combined) {
    const isThirdParty = item.type === 'post' && Boolean(item.isThirdParty)
    const url = itemUrl(ctx, item)
    const description = isThirdParty
      ? `${item.description || ''}<br><br><a href="${url}">Read on ${
          new URL(url).hostname
        }</a>`
      : await render(item)

    feed.item({
      title: item.title,
      description,
      date: new Date(item.date),
      author: isThirdParty ? new URL(url).hostname : ctx.site.author,
      url,
      categories: [item.type],
      guid: url,
    })
  }

  // rss@1.2.2 stamps `lastBuildDate: new Date().toUTCString()` unconditionally
  // (lib/rss.js line 42) with no option to override it, so feed.xml changed on
  // every build and every rebuild showed up as a diff. Pin it to the newest
  // item, which is what the element is supposed to mean anyway.
  const newest = combined[0] ? new Date(combined[0].date) : new Date(0)
  const xml = feed
    .xml({ indent: true })
    .replace(
      /<lastBuildDate>[^<]*<\/lastBuildDate>/,
      `<lastBuildDate>${newest.toUTCString()}</lastBuildDate>`,
    )

  await fs.writeFile(path.join(ctx.staticDir, 'feed.xml'), xml)
  return combined.length
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function day(iso: string): string {
  return iso.slice(0, 10)
}

async function writeSitemap(ctx: BuildContext): Promise<number> {
  const content = [...ctx.posts, ...ctx.notes]
  // Deterministic: the newest piece of content, not the build clock. A
  // build-time `new Date()` made every sitemap byte-diff against the last one.
  const newest = content.reduce(
    (latest, item) => (item.dateISO > latest ? item.dateISO : latest),
    new Date(0).toISOString(),
  )

  const urls = [
    ...TOP_LEVEL.map((route) => ({
      loc: `${ctx.site.url}${route}`,
      lastmod: day(newest),
    })),
    ...ctx.posts
      .filter((post) => Boolean(post.slug))
      .map((post) => ({
        loc: `${ctx.site.url}/blog/${post.slug}`,
        lastmod: day(post.dateISO),
      })),
    ...ctx.notes.map((note) => ({
      loc: `${ctx.site.url}/notes/${note.slug}`,
      lastmod: day(note.dateISO),
    })),
  ]

  const body = urls
    .map(
      ({ loc, lastmod }) =>
        `<url><loc>${xmlEscape(loc)}</loc><lastmod>${lastmod}</lastmod></url>`,
    )
    .join('\n')

  await fs.writeFile(
    path.join(ctx.staticDir, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
  )
  return urls.length
}

async function writeRobots(ctx: BuildContext): Promise<void> {
  // Byte-identical to what app/robots.ts made Next serialize.
  const body =
    `User-Agent: *\nAllow: /\n\n` +
    `Host: ${ctx.site.url}\n` +
    `Sitemap: ${ctx.site.url}/sitemap.xml\n`
  await fs.writeFile(path.join(ctx.staticDir, 'robots.txt'), body)
}

/** The command palette's index. Same shape and order as /api/search-index. */
export function searchIndex(ctx: BuildContext): SearchIndexItem[] {
  const entries = buildEntries(ctx).map((entry) => {
    const href = entryHref(entry)
    return {
      type: entry.type === 'note' ? ('note' as const) : ('blog' as const),
      title: entry.title,
      href,
      external: href.startsWith('http'),
    }
  })

  const projects = ctx.projects.map((project) => {
    const link = project.href || '#'
    return {
      type: 'project' as const,
      title: project.title,
      href: link !== '#' ? link : '/projects',
      external: link.startsWith('http'),
    }
  })

  return [...entries, ...projects]
}

export interface FeedsResult {
  feedItems: number
  sitemapUrls: number
  searchItems: number
  ms: number
}

export async function writeFeeds(
  ctx: BuildContext,
  options: FeedsOptions = {},
): Promise<FeedsResult> {
  const render = options.renderPostHtml ?? markedRenderer()
  const started = performance.now()
  await fs.mkdir(ctx.staticDir, { recursive: true })

  const items = searchIndex(ctx)
  const [feedItems, sitemapUrls] = await Promise.all([
    writeFeed(ctx, render),
    writeSitemap(ctx),
    writeRobots(ctx),
    fs.writeFile(
      path.join(ctx.staticDir, 'search-index.json'),
      JSON.stringify(items),
    ),
  ])

  return {
    feedItems,
    sitemapUrls,
    searchItems: items.length,
    ms: performance.now() - started,
  }
}

export default writeFeeds
