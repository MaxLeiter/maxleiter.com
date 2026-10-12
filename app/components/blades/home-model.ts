import type { Note, Post, Project } from '@framework/shared/types'
import { transitionName } from '@framework/shared/transitions'
import type { BladeItem, ProfileCard } from '@lib/blades/items'
import { BLADES, shortDate, type BladeTheme } from '@lib/blades/theme'
import { excerptOf } from '@lib/blades/excerpt'

/**
 * The dashboard's content, built from the real `BuildContext`: one list per
 * blade, the profile card, and each blade's tip.
 *
 * Build-side only (it reads post bodies for the excerpts), so the island
 * receives the result as props rather than importing this.
 */

export interface BladeModel {
  theme: BladeTheme
  items: BladeItem[]
  /** The listbox's accessible name. */
  list: string
  /** `26 posts`, `10 options`. */
  unit: string
  tip?: readonly [string, string]
  /** The blog blade carries the profile card above its list. */
  card?: boolean
}

export interface HomeContent {
  posts: Post[]
  notes: Note[]
  externalPosts: Post[]
  projects: Project[]
}

const ABOUT =
  "I'm currently working on Claude Code at Anthropic. Previously, I helped start v0 and the AI SDK at Vercel. I'm interested in politics, tech, and building a fast, accessible web."

/** `blog/MSHW0184` is relative in the project list; every href here is rooted. */
function rooted(href: string): string {
  return /^https?:/.test(href) || href.startsWith('/') ? href : `/${href}`
}

function projectItem(project: Project): BladeItem {
  const href = rooted(project.href || '/projects')
  const external = /^https?:/.test(href)
  const slug = /^\/blog\/([^/?#]+)/.exec(href)?.[1]
  const years = project.years.join('–')
  return {
    kind: 'project',
    slug: project.title,
    title: project.title,
    sub: years,
    href,
    ...(external ? { external: true } : {}),
    desc: project.description,
    ...(project.role ? { date: `${project.role} · ${years}` } : {}),
    ...(slug ? { vt: transitionName('blog', slug) } : {}),
  }
}

const SYSTEM: BladeItem[] = [
  {
    kind: 'about',
    slug: 'about',
    title: 'About Max',
    sub: 'about',
    href: '/about',
    desc: ABOUT,
  },
  {
    kind: 'page',
    slug: 'labs',
    title: 'Labs',
    sub: 'labs',
    href: '/labs',
    desc: 'Experimental projects and playthings: an emulator, a markdown viewer, a git-backed key-value store and more.',
  },
  {
    kind: 'page',
    slug: 'talks',
    title: 'Talks',
    sub: 'talks',
    href: '/talks',
    desc: 'Tech talks I enjoy from around the web, from the Apollo Guidance Computer to TypeScript types running DOOM.',
  },
  {
    kind: 'link',
    slug: 'github',
    title: 'GitHub',
    sub: 'maxleiter',
    href: 'https://github.com/maxleiter',
    external: true,
    desc: 'Source for this site, Drift, md-viewer, Sandcastle and a long tail of experiments.',
  },
  {
    kind: 'link',
    slug: 'x',
    title: 'X',
    sub: '@maxleiter',
    href: 'https://twitter.com/maxleiter',
    external: true,
    desc: 'Short-form thoughts, mostly about the web, Linux, tooling and AI.',
  },
  {
    kind: 'link',
    slug: 'rss',
    title: 'RSS feed',
    sub: 'feed.xml',
    href: '/feed.xml',
    desc: 'Every post and note, in your reader of choice.',
  },
  {
    kind: 'theme',
    slug: 'theme',
    title: 'Reading glass',
    sub: 'Auto',
    desc: 'Posts open on light or dark glass. It follows your system setting until you choose one here.',
  },
  {
    kind: 'sound',
    slug: 'sound',
    title: 'Sound',
    sub: 'Off',
    desc: 'Interface sounds are synthesized live with WebAudio: filtered-noise swishes, FM chimes and a reverb built from generated noise. Nothing is sampled, and nothing is said only by sound.',
  },
  {
    kind: 'motion',
    slug: 'motion',
    title: 'Motion',
    sub: 'Full',
    desc: 'Blade swing, ambient ribbons and toasts. Follows your system "reduce motion" setting until you change it here.',
  },
  {
    kind: 'info',
    slug: 'info',
    title: 'System info',
    sub: 'static',
    desc: 'A bespoke static site generator: no web framework, every page prerendered, about a kilobyte of JavaScript on a content page. This dashboard is the one lazily loaded island that ships more.',
  },
]

export function buildHome(content: HomeContent): {
  blades: BladeModel[]
  card: ProfileCard
} {
  const posts: BladeItem[] = content.posts.map((post) => ({
    kind: 'post',
    slug: post.slug ?? '',
    title: post.title,
    sub: shortDate(post.date),
    href: `/blog/${post.slug}`,
    date: post.date,
    ...(post.description ? { desc: post.description } : {}),
    excerpt: excerptOf(post.body),
    vt: transitionName('blog', post.slug ?? ''),
  }))
  const notes: BladeItem[] = content.notes.map((note) => ({
    kind: 'note',
    slug: note.slug,
    title: note.title,
    sub: shortDate(note.date),
    href: `/notes/${note.slug}`,
    date: note.date,
    ...(note.description ? { desc: note.description } : {}),
    excerpt: excerptOf(note.body),
    vt: transitionName('note', note.slug),
  }))
  const work: BladeItem[] = content.externalPosts.map((post) => ({
    kind: 'work',
    slug: post.href ?? post.title,
    title: post.title,
    sub: shortDate(post.date),
    href: post.href ?? 'https://vercel.com/blog',
    external: true,
    date: post.date,
    desc: post.description,
  }))
  const projects = content.projects.map(projectItem)

  const [p, b, n, w, s] = BLADES
  const blades: BladeModel[] = [
    {
      theme: p,
      items: projects,
      list: 'Projects',
      unit: `${projects.length} projects`,
    },
    {
      theme: b,
      items: posts,
      list: 'Posts',
      unit: `${posts.length} posts`,
      card: true,
    },
    {
      theme: n,
      items: notes,
      list: 'Notes',
      unit: `${notes.length} notes`,
      tip: [
        'Tip.',
        'Notes are the short, practical stuff: scripts and fixes worth finding again. Enter opens one in the reader.',
      ],
    },
    {
      theme: w,
      items: work,
      list: 'Articles',
      unit: `${work.length} articles`,
      tip: [
        'On the AI team at Vercel.',
        'Max co-created v0 and worked on the first three versions of the AI SDK. These are his posts on the Vercel blog.',
      ],
    },
    {
      theme: s,
      items: SYSTEM,
      list: 'System',
      unit: `${SYSTEM.length} options`,
      tip: [
        'Guide.',
        'Press G anywhere, or the orb below. Arrows, Enter and Esc work everywhere, and so does a gamepad.',
      ],
    },
  ]
  return { blades, card: profileCard(content) }
}

/** The gamertag card. The score is flavour, derived from the content counts. */
export function profileCard(content: HomeContent): ProfileCard {
  return {
    tag: 'MaxLeiter',
    score:
      content.posts.length * 50 +
      content.notes.length * 25 +
      content.projects.length * 20 +
      content.externalPosts.length * 40,
    zone: 'Builder · Claude Code',
  }
}
