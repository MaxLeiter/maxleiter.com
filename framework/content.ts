import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import type { BuildContext, Note, Post, Project, Site } from './types'

/**
 * Content loading. Ports app/lib/get-posts.ts, get-notes.ts, projects.tsx,
 * portfolio-data.ts and external-posts.ts with no next/cache and no React
 * cache() — the build reads each source once.
 *
 * The GitHub star fetch is gone on purpose: `stars` was fetched and then
 * dropped by convertToProject before anything rendered it, and it hard-failed
 * the build when GITHUB_TOKEN was absent on Vercel (feature inventory item 54).
 */

const SITE: Site = {
  url: 'https://maxleiter.com',
  title: 'Max Leiter',
  author: 'Max Leiter',
}

const MARKDOWN = /\.mdx?$/

function toISO(date: string): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return new Date(0).toISOString()
  return parsed.toISOString()
}

/**
 * Total order, not just a date comparison.
 *
 * Three published notes share `date: Mar 30, 2024`. A comparator returning 0
 * for those leaves their order to `fs.readdir`, which node returns sorted and
 * bun returns in raw directory order, so the same source tree produced
 * different feed.xml, sitemap.xml and search-index.json under the two
 * runtimes. Slug breaks the tie.
 */
export function byDateDesc(
  a: { date: string; slug?: string },
  b: { date: string; slug?: string },
): number {
  const delta = new Date(b.date).getTime() - new Date(a.date).getTime()
  if (delta !== 0) return delta
  return (a.slug ?? '').localeCompare(b.slug ?? '')
}

async function readDir(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir)
  // Sorted here too, so the input to the sort is runtime-independent even for
  // entries the comparator still cannot separate.
  return entries.filter((file) => MARKDOWN.test(path.extname(file))).sort()
}

/**
 * Read one content directory: parse frontmatter, drop what `parse` rejects,
 * sort. `posts` and `notes` differ only in that callback.
 */
async function loadCollection<T extends { date: string; slug?: string }>(
  root: string,
  dir: string,
  parse: (data: Record<string, unknown>, body: string) => T | null,
): Promise<T[]> {
  const full = path.join(root, dir)
  const files = await readDir(full)
  const parsed = await Promise.all(
    files.map(async (file) => {
      const source = await fs.readFile(path.join(full, file), 'utf8')
      const { data, content } = matter(source)
      return parse(data, content)
    }),
  )
  return parsed.filter((item) => item !== null).sort(byDateDesc)
}

function loadPosts(root: string): Promise<Post[]> {
  return loadCollection(root, 'posts', (data, content) => {
    // Same filter as app/lib/get-posts.ts: unpublished, or no slug, is out.
    if (data.published === false || !data.slug) return null
    const date = String(data.date ?? '')
    return {
      title: String(data.title ?? ''),
      // `posts/nintype.mdx` has a bare `description:` line. Empty means
      // absent: the shell omits the description tags entirely rather than
      // substituting the site default, which is what Next does.
      description: String(data.description ?? '').trim(),
      href: data.href as string | undefined,
      slug: String(data.slug),
      date,
      dateISO: toISO(date),
      tags: (data.tags as string[] | undefined) ?? [],
      body: content,
      type: 'post',
    } satisfies Post
  })
}

function loadNotes(root: string): Promise<Note[]> {
  return loadCollection(root, 'notes', (data, content) => {
    if (data.published === false) return null
    const date = String(data.date ?? '')
    return {
      title: String(data.title ?? ''),
      description: String(data.description ?? '').trim(),
      slug: String(data.slug),
      date,
      dateISO: toISO(date),
      body: content,
      type: (data.type as Note['type']) ?? 'note',
    } satisfies Note
  })
}

/** The six hardcoded Vercel posts. No RSS is fetched at build. */
export const externalPosts: Post[] = [
  {
    title: 'How we made v0 an effective coding agent',
    description:
      'Learn how we built v0 to be an effective AI coding agent through careful system design and iteration.',
    body: '',
    date: 'Jan 7, 2026',
    dateISO: toISO('Jan 7, 2026'),
    slug: '',
    tags: [],
    isThirdParty: true,
    href: 'https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent',
    type: 'post',
  },
  {
    title: 'Introducing the v0 composite model family',
    description: 'Introducing the v0 composite model family.',
    body: '',
    date: 'Jun 1, 2025',
    dateISO: toISO('Jun 1, 2025'),
    slug: '',
    tags: [],
    isThirdParty: true,
    href: 'https://vercel.com/blog/v0-composite-model-family',
    type: 'post',
  },
  {
    title: 'Introducing AI SDK 3.0 with Generative UI support',
    description:
      'Stream React Components from LLMs to deliver richer user experiences.',
    body: '',
    date: 'Mar 1, 2024',
    dateISO: toISO('Mar 1, 2024'),
    slug: '',
    tags: [],
    isThirdParty: true,
    href: 'https://vercel.com/blog/ai-sdk-3-generative-ui',
    type: 'post',
  },
  {
    title: 'Introducing the Vercel AI SDK',
    description:
      'An interoperable, streaming-enabled, edge-ready software development kit for AI apps built with React and Svelte.',
    body: '',
    date: 'Jun 15, 2023',
    dateISO: toISO('Jun 15, 2023'),
    slug: '',
    tags: [],
    isThirdParty: true,
    href: 'https://vercel.com/blog/introducing-the-vercel-ai-sdk',
    type: 'post',
  },
  {
    title: 'Improving the accessibility of our Next.js site',
    description:
      "We've made some improvements to the accessibility of our Next.js site. Here's how we did it.",
    body: '',
    date: 'Sep 30, 2022',
    dateISO: toISO('Sep 30, 2022'),
    slug: '',
    tags: [],
    isThirdParty: true,
    href: 'https://vercel.com/blog/improving-the-accessibility-of-our-nextjs-site',
    type: 'post',
  },
  {
    title: 'New edge dev infrastructure',
    description: 'New edge dev infrastructure.',
    body: '',
    date: 'Jul 21, 2020',
    dateISO: toISO('Jul 21, 2020'),
    slug: '',
    tags: [],
    isThirdParty: true,
    href: 'https://vercel.com/blog/new-edge-dev-infrastructure',
    type: 'post',
  },
]

/** Hardcoded, in source order; sorted for display by `sortProjects`. */
const PROJECTS: Project[] = [
  {
    title: 'X11 on iOS',
    description:
      'Patched, compiled, and packaged X11 for iOS devices instead of studying for finals.',
    href: '/blog/X11',
    role: 'Creator',
    years: ['2020'],
    type: 'project',
  },
  {
    title: 'Drift',
    description:
      'A self-hostable and open-source alternative to GitHub Gist and Pastebin.',
    href: 'https://github.com/maxleiter/drift',
    role: 'Creator',
    years: ['2022', '2023'],
    type: 'project',
  },
  {
    title: 'The Lounge',
    description:
      'Self-hosted, always-on IRC client built with Node.js, Vue, and other web technologies.',
    href: 'https://github.com/thelounge/thelounge',
    role: 'Maintainer',
    years: ['2016', 'present'],
    type: 'project',
  },
  {
    title: 'SortableJS-vue3',
    description: 'A TypeScript wrapper for SortableJS built for Vue 3.',
    href: 'https://github.com/maxleiter/sortablejs-vue3/',
    role: 'Creator',
    years: ['2022', '2026'],
    type: 'project',
  },
  {
    title: 'KnightOS',
    description:
      'Open-source unix-like operating system for z80-based calculators written entirely in z80 asm. I wrote a significant portion of the libc and contribued to system libraries.',
    href: 'https://github.com/knightos/knightos',
    role: 'Maintainer',
    years: ['2017', '2019'],
    type: 'project',
  },
  {
    title: 'MSHW0184 driver for Linux kernel',
    description: 'I finally found an excuse to contribute to the Linux kernel',
    href: 'blog/MSHW0184',
    role: 'Creator',
    years: ['2021'],
    type: 'project',
  },
  {
    title: 'jsonTree',
    description: 'My first open-source project',
    href: 'https://github.com/maxleiter/jsontree',
    role: 'Creator',
    years: ['2015'],
    type: 'project',
  },
  {
    title: 'easyarty.com',
    description:
      'A tiny tool I made for a video game I like but it now gets 250,000+ visitors a year',
    href: 'https://easyarty.com',
    role: 'Creator',
    years: ['2021'],
    type: 'project',
  },
  {
    title: 'v0',
    description:
      'I co-created v0.app with with Shu Ding, Jared Palmer, and shadcn while on the AI team at Vercel.',
    href: 'https://v0.app',
    role: 'Developer',
    years: ['2023', '2026'],
    type: 'project',
  },
  {
    title: 'AI SDK',
    description:
      'I worked with Shu Ding and later Lars Grammel on the first three versions of the Vercel AI SDK.',
    href: 'https://github.com/vercel/ai',
    role: 'Developer',
    years: ['2023', '2024'],
    type: 'project',
  },
  {
    title:
      'Accuracy of computer-assisted vertical cup-to-disk ratio grading for glaucoma screening',
    description:
      'I had the opportunity to work with the great Proctor Foundation at UCSF to write a Java program for helping medical practitioners estimate vertical cup to disk ratios from retinal images.',
    href: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0220362',
    role: '',
    years: ['2017'],
    type: 'project',
  },
]

const yearBound = (
  years: string[],
  pick: (...values: number[]) => number,
): number => {
  const parsed = years.map((y) => parseInt(y, 10)).filter((y) => !isNaN(y))
  return parsed.length > 0 ? pick(...parsed) : 0
}

/** An in-progress project sorts above every finished one. */
const latestYear = (years: string[]): number =>
  years.includes('present') ? Infinity : yearBound(years, Math.max)

const earliestYear = (years: string[]): number => yearBound(years, Math.min)

/** Newest first, ties broken by which project started more recently. */
function loadProjects(): Project[] {
  return [...PROJECTS].sort(
    (a, b) =>
      latestYear(b.years) - latestYear(a.years) ||
      earliestYear(b.years) - earliestYear(a.years),
  )
}

/** The `id` used by the projects page and the search index. */
function projectId(project: Project): string {
  return project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/** The display shape the projects page and the desktop widget consume. */
export interface ProjectCard {
  id: string
  name: string
  description: string
  link: string
  tech: string[]
  content: string
}

export function toProjectCard(project: Project): ProjectCard {
  return {
    id: projectId(project),
    name: project.title,
    description: project.description,
    link: project.href || '#',
    tech: project.years || [],
    content: `${project.title}\n\n${project.description}\n\nRole: ${project.role}\nYears: ${project.years.join(', ')}`,
  }
}

/**
 * One flat, date-sorted list of local posts, external posts and notes, which
 * is what /blog and the homepage render. Mirrors getBlogPosts().
 */
export interface ListEntry {
  slug: string
  title: string
  date: string
  dateISO: string
  excerpt: string
  href?: string
  isThirdParty?: boolean
  type: 'post' | 'note'
  /** Notes only. */
  noteType?: Note['type']
}

export function buildEntries(ctx: BuildContext): ListEntry[] {
  const posts: ListEntry[] = [...ctx.posts, ...ctx.externalPosts]
    .map((post) => {
      // Third-party posts have no slug; their href doubles as the identifier.
      const slug = post.slug || (post.isThirdParty && post.href) || ''
      if (!slug) return null
      return {
        slug,
        title: post.title,
        date: post.date,
        dateISO: post.dateISO,
        excerpt: post.description,
        href: post.href,
        isThirdParty: post.isThirdParty,
        type: 'post' as const,
      }
    })
    .filter((entry) => entry !== null)

  const notes: ListEntry[] = ctx.notes.map((note) => ({
    slug: note.slug,
    title: note.title,
    date: note.date,
    dateISO: note.dateISO,
    excerpt: note.description,
    type: 'note' as const,
    noteType: note.type,
  }))

  return [...posts, ...notes].sort(byDateDesc)
}

/** Absolute URL for a route path. The one place `/` becomes the bare origin. */
export function absoluteUrl(ctx: BuildContext, routePath: string): string {
  return routePath === '/' ? ctx.site.url : `${ctx.site.url}${routePath}`
}

export async function createBuildContext(root: string): Promise<BuildContext> {
  const [posts, notes] = await Promise.all([loadPosts(root), loadNotes(root)])
  const outDir = path.join(root, '.vercel', 'output')
  return {
    root,
    outDir,
    staticDir: path.join(outDir, 'static'),
    cacheDir: path.join(root, '.cache'),
    posts,
    notes,
    projects: loadProjects(),
    externalPosts,
    site: SITE,
    assets: {},
  }
}
