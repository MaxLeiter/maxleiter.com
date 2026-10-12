import type { Note, Post, Project } from '@framework/shared/types'
import { transitionName } from '@framework/shared/transitions'

/**
 * The homepage's channels, built from the real content at build time.
 *
 * Six rows: Home, Blog, Notes, Projects, Work, About. Home is a curated row of
 * copies; each copy keeps the seed of the item it copies, so it wears the same
 * cover. Build-side only: the channels island reads this back out of the
 * server-rendered links rather than receiving it as props.
 */

export type ItemKind =
  | 'Blog'
  | 'Note'
  | 'Project'
  | 'Work'
  | 'Profile'
  | 'Link'
  | 'Index'

export interface ChannelItem {
  /** Unique per page: `blog-xios`, `home-blog-xios`. The tile's id is `t-<key>`. */
  key: string
  /** The cover seed. Shared by a home copy and the item it copies. */
  seed: string
  href: string
  /** Not a page on this site: another origin, or the feed. */
  external: boolean
  title: string
  date: string
  desc: string
  kind: ItemKind
  chip: string
  /** The cover's meta line, `BLOG  ·  JUL 28, 2026`. */
  meta: string
  /** The article's view-transition name, for posts and notes. */
  vtName?: string
}

export interface Channel {
  id: 'home' | 'blog' | 'notes' | 'projects' | 'work' | 'about'
  name: string
  /** The channel's accent, a hue in degrees. */
  hue: number
  items: ChannelItem[]
  /** The section page this row is a preview of. */
  more?: { href: string; label: string }
}

export const SECTION_HUES = {
  home: 205,
  blog: 28,
  notes: 168,
  projects: 268,
  work: 350,
  about: 215,
  labs: 300,
  talks: 8,
} as const

const SITE = 'https://maxleiter.com'

function host(href: string): string {
  try {
    return new URL(href, SITE).host.replace(/^www\./, '')
  } catch {
    return ''
  }
}

const isExternal = (href: string) =>
  /^https?:/.test(href) || href.endsWith('.xml')

function metaFor(kind: ItemKind, date: string, href: string): string {
  const where = date || host(href)
  return [kind === 'Index' ? 'Section' : kind, where]
    .filter(Boolean)
    .join('  ·  ')
    .toUpperCase()
}

function item(
  fields: Omit<ChannelItem, 'external' | 'meta' | 'chip' | 'key'> & {
    chip?: string
    key?: string
  },
): ChannelItem {
  const href = /^(https?:|\/)/.test(fields.href)
    ? fields.href
    : `/${fields.href}`
  return {
    ...fields,
    key: fields.key ?? fields.seed.replace(/[^A-Za-z0-9-]+/g, '-'),
    href,
    external: isExternal(href),
    chip: fields.chip ?? (fields.kind === 'Index' ? 'VIEW ALL' : fields.kind),
    meta: metaFor(fields.kind, fields.date, href),
  }
}

function projectSlug(project: Project): string {
  return project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/** A copy for the Home row: same art, its own id, a chip that says why. */
function feature(source: ChannelItem | undefined, chip: string) {
  return source ? { ...source, key: `home-${source.key}`, chip } : null
}

export interface ChannelInput {
  posts: Post[]
  notes: Note[]
  externalPosts: Post[]
  projects: Project[]
}

export const PROFILE_BLURB =
  'Software engineer writing about the web, Linux, developer tooling and AI.'

export function buildChannels(input: ChannelInput): Channel[] {
  const profile = item({
    seed: 'profile:max-leiter',
    href: '/about',
    title: 'Max Leiter',
    date: '',
    desc: PROFILE_BLURB,
    kind: 'Profile',
    chip: 'PROFILE',
  })

  const posts = input.posts
    .filter((post) => post.slug)
    .map((post) =>
      item({
        seed: `blog:${post.slug}`,
        href: `/blog/${post.slug}`,
        title: post.title,
        date: post.date,
        desc: post.description,
        kind: 'Blog',
        vtName: transitionName('blog', post.slug as string),
      }),
    )

  const notes = input.notes.map((note) =>
    item({
      seed: `note:${note.slug}`,
      href: `/notes/${note.slug}`,
      title: note.title,
      date: note.date,
      desc: note.description,
      kind: 'Note',
      vtName: transitionName('note', note.slug),
    }),
  )

  // Work is what was done for an employer or a journal: the two products,
  // the posts on the company blog and the paper. The rest are side projects.
  const WORK = new Set(['v0', 'AI SDK'])
  const isWork = (project: Project) =>
    WORK.has(project.title) || /plos/.test(project.href ?? '')
  const projectItem = (project: Project, kind: 'Project' | 'Work') =>
    item({
      seed: `project:${projectSlug(project)}`,
      href: project.href ?? '/projects',
      title: project.title,
      date: '',
      desc: project.description,
      kind,
    })

  const projects = input.projects
    .filter((project) => !isWork(project))
    .map((project) => projectItem(project, 'Project'))
  const work = [
    ...input.projects
      .filter((project) => WORK.has(project.title))
      .map((project) => projectItem(project, 'Work')),
    ...input.externalPosts
      .filter((post) => post.href)
      .map((post) =>
        item({
          seed: `work:${post.href}`,
          href: post.href as string,
          title: post.title,
          date: post.date,
          desc: post.description,
          kind: 'Work',
        }),
      ),
    ...input.projects
      .filter((project) => isWork(project) && !WORK.has(project.title))
      .map((project) => projectItem(project, 'Work')),
  ]

  const index = (section: string, title: string, desc: string): ChannelItem =>
    item({
      seed: `index:${section}`,
      href: `/${section}`,
      title,
      date: '',
      desc,
      kind: 'Index',
    })

  const bySlug = (slug: string) =>
    posts.find((post) => post.seed === `blog:${slug}`)

  const home = [
    { ...profile, key: 'home-profile' },
    feature(posts[0], 'LATEST POST'),
    feature(notes[0], 'LATEST NOTE'),
    feature(
      work.find((entry) => entry.title === 'v0'),
      'FEATURED',
    ),
    feature(bySlug('sandcastle'), 'FEATURED'),
    feature(bySlug('ship-every-day'), 'CLASSIC'),
  ].filter((entry) => entry !== null)

  const about = [
    profile,
    item({
      seed: 'link:github',
      href: 'https://github.com/maxleiter',
      title: 'GitHub',
      date: '',
      desc: 'Open-source work, dotfiles and experiments.',
      kind: 'Link',
    }),
    item({
      seed: 'link:x',
      href: 'https://twitter.com/maxleiter',
      title: 'X',
      date: '',
      desc: 'Short-form thoughts and links, mostly about the web and AI.',
      kind: 'Link',
    }),
    item({
      seed: 'link:rss',
      href: '/feed.xml',
      title: 'RSS feed',
      date: '',
      desc: 'Every post and note, in your reader of choice.',
      kind: 'Link',
    }),
    index('talks', 'Talks', 'Tech talks I enjoy from around the web.'),
  ]

  return [
    { id: 'home', name: 'Home', hue: SECTION_HUES.home, items: home },
    {
      id: 'blog',
      name: 'Blog',
      hue: SECTION_HUES.blog,
      items: [
        ...posts,
        index(
          'blog',
          'Every post',
          'The whole archive, with notes and the posts written elsewhere.',
        ),
      ],
      more: { href: '/blog', label: 'All posts' },
    },
    {
      id: 'notes',
      name: 'Notes',
      hue: SECTION_HUES.notes,
      items: [
        ...notes,
        index(
          'notes',
          'All notes',
          'Short-form thoughts, code snippets and tips.',
        ),
      ],
      more: { href: '/notes', label: 'All notes' },
    },
    {
      id: 'projects',
      name: 'Projects',
      hue: SECTION_HUES.projects,
      items: [
        ...projects,
        index('projects', 'All projects', 'Most of my projects, in one list.'),
        index('labs', 'Labs', 'Experimental projects and playthings.'),
      ],
      more: { href: '/projects', label: 'All projects' },
    },
    { id: 'work', name: 'Work', hue: SECTION_HUES.work, items: work },
    {
      id: 'about',
      name: 'About',
      hue: SECTION_HUES.about,
      items: about,
      more: { href: '/about', label: 'About' },
    },
  ]
}
