import { createElement } from 'react'
import type { BuildContext, Head, PageDef } from '../shared/types'
import { toProjectCard } from '../content'
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
import { buildCampaign } from '../../app/lib/meridian'

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

  // Every route renders from one model of the content: missions with read
  // times counted from their full bodies, films, forge objects, playlists
  // and the service record computed from the real dates.
  const campaign = buildCampaign({
    posts: ctx.posts.flatMap((post) =>
      post.slug ? [{ ...post, slug: post.slug }] : [],
    ),
    notes: ctx.notes,
    projects: ctx.projects.map(toProjectCard),
    external: ctx.externalPosts,
  })
  const counts = {
    missions: campaign.missions.length,
    films: campaign.films.length,
    objects: campaign.objects.length,
    playlists: campaign.playlists.length,
  }
  const section = { campaign, counts }
  // Mission numbers run oldest first; `campaign.missions` is newest first.
  const missionAt = new Map(
    campaign.missions.map((mission) => [mission.num, mission]),
  )

  const pages: PageDef[] = [
    {
      path: '/',
      head: {
        description: 'A website by Max Leiter.',
      },
      render: () => createElement(HomePage, section),
    },
    {
      path: '/about',
      head: {
        title: 'About',
        description: 'About this website.',
      },
      variants: { embed: true },
      render: ({ toolbar }) =>
        createElement(AboutPage, { ...section, toolbar }),
    },
    {
      path: '/blog',
      head: {
        title: 'Blog',
        description: 'My blog posts',
      },
      variants: { embed: true },
      render: ({ toolbar }) =>
        createElement(BlogIndexPage, { ...section, toolbar }),
    },
    {
      path: '/notes',
      head: {
        title: NOTES_TITLE,
        description: NOTES_DESCRIPTION,
      },
      variants: { embed: true },
      render: ({ toolbar }) =>
        createElement(NotesIndexPage, { ...section, toolbar }),
    },
    {
      path: '/labs',
      head: {
        title: 'Labs',
        description: 'Experimental projects and playthings',
      },
      variants: { embed: true },
      render: ({ toolbar }) => createElement(LabsPage, { ...section, toolbar }),
    },
    {
      path: '/projects',
      head: {
        title: 'Projects',
        description: 'Most of my projects',
      },
      variants: { embed: true },
      render: ({ toolbar }) =>
        createElement(ProjectsPage, { ...section, toolbar }),
    },
    {
      path: '/talks',
      head: {
        title: 'Talks',
        description: 'Tech talks I enjoy from around the web',
      },
      variants: { embed: true },
      render: ({ toolbar }) =>
        createElement(TalksPage, { ...section, toolbar }),
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
      render: () => createElement(NotFoundPage, { counts }),
    },
  ]

  for (const post of ctx.posts) {
    const slug = post.slug
    if (!slug) continue
    const mission = campaign.missions.find((entry) => entry.slug === slug)
    if (!mission) continue
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
          mission,
          previous: missionAt.get(mission.num - 1),
          next: missionAt.get(mission.num + 1),
          content: await mdx.render(post.body, components, post.file),
          counts,
          toolbar,
        }),
    })
  }

  for (const note of ctx.notes) {
    const film = campaign.films.find((entry) => entry.slug === note.slug)
    if (!film) continue
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
          film,
          content: await mdx.render(note.body, components, note.file),
          counts,
          toolbar,
        }),
    })
  }

  return pages
}
