import { createElement } from 'react'
import type {
  BuildContext,
  Head,
  Note,
  PageDef,
  PageHead,
  Post,
  RouteInfo,
} from '../types'
import { absoluteUrl, buildEntries, toProjectCard } from '../build/content'
import { collectImageUrls, loadImageDimensions } from '../platform/image-dims'
import { ogImageUrl } from '../platform/og'
import { collectTweetIds, loadTweets } from '../platform/tweets'
import { collectLanguages, getHighlighter, highlightCss } from './highlight'
import { takeIslandManifest } from './islands'
import { createMdxCompiler, renderPostHtml } from './mdx'
import { renderBody, renderPartial, renderShell, type Fonts } from './render'
import {
  createMdxComponents,
  resetArticleImages,
} from '../../app/mdx/static-components'
import { HomePage } from '../../app/pages/home'
import {
  AboutPage,
  BlogIndexPage,
  LabsPage,
  NotFoundPage,
  NotesIndexPage,
  ProjectsPage,
  TalksPage,
} from '../../app/pages/content-pages'
import { BlogPostPage, NotePage } from '../../app/pages/article-pages'

/**
 * The site: every route it has, and the loop that renders them.
 *
 * These were two files. `routes.ts` was the page registry and `entry-server.ts`
 * was a loop over that registry plus four re-exports, with one importer between
 * them, so reading either alone told you half the story.
 *
 * esbuild bundles this file and everything it imports into one module, which
 * `build.ts` then imports. That is what makes path aliases, JSX and MDX behave
 * identically under bun and node: nothing is resolved by a runtime loader.
 *
 * Rendering happens in two passes. Bodies come first, because rendering them is
 * what registers island names and mints the shiki style classes; only then can
 * the stylesheet and the client bundles be built. `wrapPage` then puts each
 * body inside the shell.
 */

/* ------------------------------------------------------- page registry -- */

const NOTES_TITLE = 'Notes'
const NOTES_DESCRIPTION = 'Short-form thoughts, code snippets, and tips.'

/**
 * What an article falls back to when its frontmatter has no description.
 *
 * A post with an empty description emits no description tags at all, which is
 * what the baseline does and what `posts/nintype.mdx` relies on. A note
 * inherits the section's, because `notes/[slug]` exported no metadata and all
 * eight note pages shared this string.
 */
const SECTION_DESCRIPTION = { blog: '', notes: NOTES_DESCRIPTION } as const

interface Article {
  kind: 'blog' | 'notes'
  title: string
  description: string
  dateISO: string
  ogImage?: string
}

/**
 * The head every article shares.
 *
 * Both sections get the `%s | Max Leiter` template, unlike the baseline:
 * Next's template reached the layouts but not `generateMetadata` on
 * `blog/[slug]`, so posts shipped a bare title, and `notes/[slug]` exported no
 * metadata at all, so all eight notes shared the one section title.
 * CONTRACT item 14.
 */
function articleHead(article: Article): Head {
  return {
    title: article.title,
    description: article.description || SECTION_DESCRIPTION[article.kind],
    ogImage: article.ogImage,
    ogType: 'article',
    publishedTime: article.dateISO,
  }
}

async function getPages(ctx: BuildContext): Promise<PageDef[]> {
  const bodies = [
    ...ctx.posts.map((post) => post.body),
    ...ctx.notes.map((note) => note.body),
  ]

  const [highlighter, tweets, dimensions] = await Promise.all([
    getHighlighter(collectLanguages(bodies)),
    loadTweets(ctx.root, collectTweetIds(bodies)),
    loadImageDimensions(ctx.root, collectImageUrls(bodies)),
  ])
  const mdx = await createMdxCompiler(ctx.cacheDir, highlighter)
  const components = createMdxComponents({
    root: ctx.root,
    tweets,
    dimensions,
  })

  const entries = buildEntries(ctx)
  const projectCards = ctx.projects.map(toProjectCard)

  const pages: PageDef[] = [
    {
      path: '/',
      head: {
        description: 'A website by Max Leiter.',
      },
      render: () =>
        createElement(HomePage, { posts: entries, projects: projectCards }),
    },
    {
      path: '/about',
      head: {
        title: 'About',
        description: 'About this website.',
      },
      variants: { embed: true },
      render: ({ toolbar }) => createElement(AboutPage, { toolbar }),
    },
    {
      path: '/blog',
      head: {
        title: 'Blog',
        description: 'My blog posts',
      },
      variants: { embed: true },
      render: ({ toolbar }) =>
        createElement(BlogIndexPage, { posts: entries, toolbar }),
    },
    {
      path: '/notes',
      head: {
        title: NOTES_TITLE,
        description: NOTES_DESCRIPTION,
      },
      variants: { embed: true },
      render: ({ toolbar }) =>
        createElement(NotesIndexPage, { notes: ctx.notes, toolbar }),
    },
    {
      path: '/labs',
      head: {
        title: 'Labs',
        description: 'Experimental projects and playthings',
      },
      variants: { embed: true },
      render: ({ toolbar }) => createElement(LabsPage, { toolbar }),
    },
    {
      path: '/projects',
      head: {
        title: 'Projects',
        description: 'Most of my projects',
      },
      variants: { embed: true },
      render: ({ toolbar }) =>
        createElement(ProjectsPage, { projects: projectCards, toolbar }),
    },
    {
      path: '/talks',
      head: {
        title: 'Talks',
        description: 'Tech talks I enjoy from around the web',
      },
      variants: { embed: true },
      render: ({ toolbar }) => createElement(TalksPage, { toolbar }),
    },
    {
      path: '/404',
      head: {
        title: '404',
        description: 'Page not found.',
        noindex: true,
      },
      // Vercel's static builder injects an error-phase route to `/404.html`
      // ahead of ours, so the body has to exist under that name too.
      aliases: ['/404.html'],
      render: () => createElement(NotFoundPage),
    },
  ]

  for (const post of ctx.posts) {
    const slug = post.slug
    if (!slug) continue
    pages.push({
      path: `/blog/${slug}`,
      head: articleHead({
        kind: 'blog',
        title: post.title,
        description: post.description,
        dateISO: post.dateISO,
        ogImage: ogImageUrl(ctx, post),
      }),
      variants: { embed: true },
      render: async ({ toolbar }) =>
        createElement(BlogPostPage, {
          slug,
          title: post.title,
          date: post.date,
          dateISO: post.dateISO,
          description: post.description,
          content: await mdx.render(post.body, components),
          toolbar,
        }),
    })
  }

  for (const note of ctx.notes) {
    pages.push({
      path: `/notes/${note.slug}`,
      head: articleHead({
        kind: 'notes',
        title: note.title,
        description: note.description,
        dateISO: note.dateISO,
      }),
      variants: { embed: true },
      render: async ({ toolbar }) =>
        createElement(NotePage, {
          slug: note.slug,
          title: note.title,
          date: note.date,
          dateISO: note.dateISO,
          description: note.description,
          kind: note.type,
          content: await mdx.render(note.body, components),
          toolbar,
        }),
    })
  }

  return pages
}

/* ------------------------------------------------------------ rendering -- */

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
  islands: Record<string, string>
  siteUrl: string
}

/**
 * The full document. `runtime` is required and only the full document has one:
 * a partial is adopted by the runtime already running on the page.
 */
export const wrapPage = (
  page: RenderedPage,
  options: WrapOptions & { runtime: string },
): string => renderShell({ head: page.head, body: page.body, ...options })

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
 * pipeline the pages use. `framework/platform/feeds.ts` takes this as an option and
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
