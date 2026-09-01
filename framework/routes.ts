import { createElement } from 'react'
import type { BuildContext, Head, PageDef } from './types'
import { buildEntries, toProjectCard, type ListEntry } from './content'
import { collectLanguages, getHighlighter } from './highlight'
import { createMdxCompiler } from './mdx'
import { collectTweetIds, loadTweets } from './tweets'
import { collectImageUrls, loadImageDimensions } from './image-dims'
import { ogImageUrl } from './og'
import { createMdxComponents } from '../app/mdx/static-components'
import { HomePage } from '../app/pages/home'
import {
  AboutPage,
  BlogIndexPage,
  LabsPage,
  NotFoundPage,
  NotesIndexPage,
  ProjectsPage,
  TalksPage,
} from '../app/pages/content-pages'
import { BlogPostPage, NotePage } from '../app/pages/article-pages'
import type { BlogPost } from '../app/lib/blog-post'

/**
 * The page registry: every route in the site as a `PageDef`.
 *
 * `generateStaticParams` has no analogue because the build loop is that
 * function, and `notFound()` has none because a page is only emitted for a slug
 * that exists.
 */

const SITE = 'https://maxleiter.com'
const NOTES_TITLE = 'Notes'
const NOTES_DESCRIPTION = 'Short-form thoughts, code snippets, and tips.'

function head(partial: Head): Head {
  return partial
}

function toBlogPost(entry: ListEntry): BlogPost {
  return {
    slug: entry.slug,
    title: entry.title,
    date: entry.date,
    excerpt: entry.excerpt,
    content: '',
    href: entry.href,
    isThirdParty: entry.isThirdParty,
    type: entry.type,
  }
}

export async function getPages(ctx: BuildContext): Promise<PageDef[]> {
  const bodies = [
    ...ctx.posts.map((post) => post.body),
    ...ctx.notes.map((note) => note.body),
  ]

  const cacheDir = `${ctx.root}/.cache`
  const [highlighter, tweets, dimensions] = await Promise.all([
    getHighlighter(collectLanguages(bodies)),
    loadTweets(ctx.root, collectTweetIds(bodies)),
    loadImageDimensions(ctx.root, collectImageUrls(bodies)),
  ])
  const mdx = await createMdxCompiler(cacheDir, highlighter)
  const components = createMdxComponents({
    root: ctx.root,
    tweets,
    dimensions,
  })

  const entries = buildEntries(ctx)
  const listPosts = entries.map(toBlogPost)
  const projectCards = ctx.projects.map(toProjectCard)

  const pages: PageDef[] = [
    {
      path: '/',
      head: head({
        description: 'A website by Max Leiter.',
        canonical: SITE,
      }),
      render: () =>
        createElement(HomePage, { posts: listPosts, projects: projectCards }),
    },
    {
      path: '/about',
      head: head({
        title: 'About',
        description: 'About this website.',
        canonical: `${SITE}/about`,
      }),
      variants: { embed: true },
      render: ({ toolbar }) => createElement(AboutPage, { toolbar }),
    },
    {
      path: '/blog',
      head: head({
        title: 'Blog',
        description: 'My blog posts',
        canonical: `${SITE}/blog`,
      }),
      variants: { embed: true },
      render: ({ toolbar }) =>
        createElement(BlogIndexPage, { posts: listPosts, toolbar }),
    },
    {
      path: '/notes',
      head: head({
        title: NOTES_TITLE,
        description: NOTES_DESCRIPTION,
        canonical: `${SITE}/notes`,
      }),
      variants: { embed: true },
      render: ({ toolbar }) =>
        createElement(NotesIndexPage, { notes: ctx.notes, toolbar }),
    },
    {
      path: '/labs',
      head: head({
        title: 'Labs',
        description: 'Experimental projects and playthings',
        canonical: `${SITE}/labs`,
      }),
      variants: { embed: true },
      render: ({ toolbar }) => createElement(LabsPage, { toolbar }),
    },
    {
      path: '/projects',
      head: head({
        title: 'Projects',
        description: 'Most of my projects',
        canonical: `${SITE}/projects`,
      }),
      variants: { embed: true },
      render: ({ toolbar }) =>
        createElement(ProjectsPage, { projects: projectCards, toolbar }),
    },
    {
      path: '/talks',
      head: head({
        title: 'Talks',
        description: 'Tech talks I enjoy from around the web',
        canonical: `${SITE}/talks`,
      }),
      variants: { embed: true },
      render: ({ toolbar }) => createElement(TalksPage, { toolbar }),
    },
    {
      path: '/404',
      head: head({
        title: '404',
        description: 'Page not found.',
        canonical: `${SITE}/404`,
        noindex: true,
      }),
      render: () => createElement(NotFoundPage),
    },
  ]

  for (const post of ctx.posts) {
    const slug = post.slug
    if (!slug) continue
    pages.push({
      path: `/blog/${slug}`,
      head: head({
        // The template applies here, unlike the baseline: Next's `%s | Max
        // Leiter` reaches the layouts but not `generateMetadata` on
        // `blog/[slug]`, so posts shipped a bare title. CONTRACT item 14.
        title: post.title,
        description: post.description,
        canonical: `${SITE}/blog/${slug}`,
        ogImage: ogImageUrl(ctx, post),
        ogType: 'article',
        publishedTime: post.dateISO,
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
      head: head({
        // The baseline titled every note page `Notes | Max Leiter` and gave
        // them all the section description, because `notes/[slug]` exports no
        // metadata at all. Each note now carries its own title, and its own
        // description when the frontmatter has one.
        title: note.title,
        description: note.description || NOTES_DESCRIPTION,
        canonical: `${SITE}/notes/${note.slug}`,
        ogType: 'article',
        publishedTime: note.dateISO,
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
