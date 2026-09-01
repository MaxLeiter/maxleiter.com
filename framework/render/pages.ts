import { createElement } from 'react'
import type { BuildContext, Head, PageDef } from '../shared/types'
import { buildEntries, toProjectCard } from '../content'
import { collectImageUrls, loadImageDimensions } from '../content/dimensions'
import { collectTweetIds, loadTweets } from '../content/tweets'
import { ogImageUrl } from '../platform/og'
import { collectLanguages, getHighlighter } from './highlight'
import { createMdxCompiler } from './mdx'
import { createMdxComponents } from '../../app/mdx/static-components'
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
 * The page registry: every route in the site as a `PageDef`.
 *
 * `generateStaticParams` has no analogue because the render loop in `./index.ts`
 * is that function, and `notFound()` has none because a page is only emitted
 * for a slug that exists.
 */

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

export async function getPages(ctx: BuildContext): Promise<PageDef[]> {
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
