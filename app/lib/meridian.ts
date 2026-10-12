/**
 * The MERIDIAN content model: the site's real records re-read as a game's
 * campaign, theater, forge, playlists and service record.
 *
 * Everything here is derived at build time from what `framework/content`
 * loaded -- read time and difficulty from each post's full MDX body, the
 * service record from the real dates -- and reaches the pages and the
 * homepage island as plain data. Client-safe on purpose (no `node:fs`, no
 * gray-matter): the island imports the types and the formatting helpers.
 */

/** The fields of a post or note this model reads. */
export interface SourceEntry {
  slug: string
  title: string
  /** The human string from frontmatter, e.g. `Jun 3, 2026`. */
  date: string
  dateISO: string
  description: string
  body: string
}

export interface SourceNote extends SourceEntry {
  type: string
}

export interface SourceProject {
  id: string
  name: string
  description: string
  link: string
  tech: string[]
}

export interface SourceExternal {
  title: string
  description: string
  date: string
  href?: string
}

/** Difficulty tiers. Original names; nothing here borrows a real game's. */
export const TIERS = ['Cadet', 'Regular', 'Veteran', 'Ironclad'] as const

export interface Mission {
  slug: string
  title: string
  date: string
  dateISO: string
  description: string
  /** 1 is the oldest post. */
  num: number
  /** Words of prose, code fences excluded. */
  words: number
  /** Lines inside code fences. */
  codeLines: number
  minutes: number
  /** Index into `TIERS`. */
  tier: number
  /** One line of intel: the description, or the body's first sentence. */
  intel: string
  /** Days since the previous mission, null for the first. */
  gapDays: number | null
  year: number
  /** `FEB 2026`. */
  month: string
}

export interface Film {
  slug: string
  title: string
  date: string
  dateISO: string
  description: string
  type: string
  words: number
  codeLines: number
  /** Running time: the note's reading time, as a film length. */
  secs: number
  intel: string
  /** Chapter marks on the timeline, as fractions of the body's length. */
  ticks: number[]
}

export type ForgeCategory = 'ai' | 'systems' | 'web' | 'research'

export const CATEGORY_NAMES: Record<ForgeCategory, string> = {
  ai: 'Artificial intelligence',
  systems: 'Systems & kernels',
  web: 'Web & tooling',
  research: 'Research',
}

const CATEGORY_ORDER: ForgeCategory[] = ['ai', 'systems', 'web', 'research']

export interface ForgeObject {
  id: string
  name: string
  description: string
  link: string
  years: string[]
  cat: ForgeCategory
  /** Leaves the site: an absolute URL. */
  external: boolean
}

export interface Playlist {
  title: string
  description: string
  href: string
  date: string
  year: number
}

export interface Medal {
  id: string
  name: string
  desc: string
  on: boolean
  color: string
}

export interface ServiceRecord {
  rank: string
  xp: number
  prevXp: number
  next: { name: string; xp: number } | null
  /** `[year, missions]`, every year from the first post to the last. */
  years: [number, number][]
  busiest: [number, number]
  /** Longest run of consecutive years with at least one mission. */
  streak: number
  /** Longest gap between two missions, in days. */
  silence: number
  /** Years from the first mission to the latest. */
  span: number
  medals: Medal[]
}

export interface Campaign {
  /** Newest first, which is how every list shows them. */
  missions: Mission[]
  films: Film[]
  objects: ForgeObject[]
  playlists: Playlist[]
  record: ServiceRecord
  firstYear: number
  lastYear: number
}

/* ------------------------------------------------------------- dates -- */

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]

const DAY = 86_400_000

/**
 * The frontmatter's human date read as a calendar date, not an instant.
 * `new Date('Sept 7, 2025')` parses in the build's pinned timezone; reading
 * the parts directly keeps a day count from depending on it.
 */
function calendarDate(human: string): Date {
  const match = /([A-Za-z]+)\.?\s+(\d+),\s*(\d{4})/.exec(human)
  if (!match) return new Date(0)
  const month = MONTHS.indexOf(match[1].slice(0, 3).toUpperCase())
  return new Date(Date.UTC(Number(match[3]), Math.max(0, month), +match[2]))
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** `02:31`. */
export function filmTime(secs: number): string {
  return `${pad2(Math.floor(secs / 60))}:${pad2(Math.floor(secs % 60))}`
}

/* ------------------------------------------------------- reading time -- */

/**
 * Prose words and code lines in an MDX body.
 *
 * Code fences are counted as lines, not words: a 40-line listing is not 400
 * words of reading. Imports, JSX tags, expressions, image syntax and bare
 * URLs are dropped; link text is kept.
 */
export function readingStats(body: string): {
  words: number
  codeLines: number
} {
  let codeLines = 0
  const prose = body
    .replace(/^(```|~~~)[^\n]*\n([\s\S]*?)^\1[^\n]*$/gm, (_, _fence, code) => {
      codeLines += String(code)
        .split('\n')
        .filter((l) => l.trim()).length
      return ' '
    })
    .replace(/^\s*(import|export)\s.*$/gm, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ')
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
  const words = prose.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu)?.length ?? 0
  return { words, codeLines }
}

/** 230 words a minute for prose, 50 lines a minute for code. */
function minutesFor(words: number, codeLines: number): number {
  return Math.max(1, Math.round(words / 230 + codeLines / 50))
}

/**
 * The difficulty tier. Length sets it; a code-heavy post (more than one line
 * of code per ten words of prose) is one tier harder than its length alone.
 */
function tierFor(minutes: number, words: number, codeLines: number): number {
  const base = minutes < 5 ? 0 : minutes < 10 ? 1 : minutes < 16 ? 2 : 3
  const dense = codeLines > 30 && codeLines * 10 > words
  return Math.min(3, base + (dense ? 1 : 0))
}

/** The first sentence of the body's prose, for posts with no description. */
function firstSentence(body: string): string {
  const text = body
    .replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, ' ')
    .replace(/^\s*(import|export)\s.*$/gm, ' ')
    .replace(/^#+\s.*$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ')
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/\\`/g, '`')
    .replace(/[`*_~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const sentence = /^.{20,220}?[.!?](?=\s|$)/.exec(text)?.[0]
  if (sentence) return sentence
  return text.length > 200 ? `${text.slice(0, 197).trimEnd()}…` : text
}

/**
 * Where the timeline's chapter marks sit: each heading, or with none, each
 * paragraph break, as a fraction of the body's length. At most eight.
 */
function chapterMarks(body: string): number[] {
  const text = body.trim()
  if (!text) return []
  const marks: number[] = []
  const headings = [...text.matchAll(/^#{1,6}\s/gm)].map((m) => m.index ?? 0)
  const breaks = headings.length
    ? headings
    : [...text.matchAll(/\n\s*\n(?=\S)/g)].map((m) => m.index ?? 0)
  for (const at of breaks) {
    const fraction = at / text.length
    if (fraction > 0.04 && fraction < 0.96) marks.push(fraction)
  }
  const step = Math.max(1, Math.ceil(marks.length / 8))
  return marks
    .filter((_, i) => i % step === 0)
    .map((m) => Math.round(m * 1000) / 1000)
}

/* ---------------------------------------------------------- the model -- */

/** Project categories: everything is web tooling unless named here. */
const CATEGORY_OF: Record<string, ForgeCategory> = {
  KnightOS: 'systems',
  'MSHW0184 driver for Linux kernel': 'systems',
  'X11 on iOS': 'systems',
  v0: 'ai',
  'AI SDK': 'ai',
}

function categoryOf(name: string): ForgeCategory {
  return (
    CATEGORY_OF[name] ?? (/glaucoma|accuracy/i.test(name) ? 'research' : 'web')
  )
}

const RANKS: [string, number][] = [
  ['Recruit', 0],
  ['Private', 500],
  ['Corporal', 1000],
  ['Sergeant', 1600],
  ['Staff Sergeant', 2200],
  ['Lieutenant', 3000],
  ['Captain', 3800],
  ['Major', 4800],
  ['Commander', 6000],
  ['Colonel', 7500],
  ['General', 10000],
]

export function buildCampaign(input: {
  posts: SourceEntry[]
  notes: SourceNote[]
  projects: SourceProject[]
  external: SourceExternal[]
}): Campaign {
  const oldestFirst = [...input.posts].sort(
    (a, b) =>
      calendarDate(a.date).getTime() - calendarDate(b.date).getTime() ||
      a.slug.localeCompare(b.slug),
  )
  const missions: Mission[] = oldestFirst.map((post, index) => {
    const when = calendarDate(post.date)
    const { words, codeLines } = readingStats(post.body)
    const minutes = minutesFor(words, codeLines)
    const previous =
      index > 0 ? calendarDate(oldestFirst[index - 1].date) : null
    return {
      slug: post.slug,
      title: post.title,
      date: post.date,
      dateISO: post.dateISO,
      description: post.description,
      num: index + 1,
      words,
      codeLines,
      minutes,
      tier: tierFor(minutes, words, codeLines),
      intel: post.description || firstSentence(post.body),
      gapDays: previous
        ? Math.round((when.getTime() - previous.getTime()) / DAY)
        : null,
      year: when.getUTCFullYear(),
      month: `${MONTHS[when.getUTCMonth()]} ${when.getUTCFullYear()}`,
    }
  })

  const films: Film[] = input.notes.map((note) => {
    const { words, codeLines } = readingStats(note.body)
    return {
      slug: note.slug,
      title: note.title,
      date: note.date,
      dateISO: note.dateISO,
      description: note.description,
      type: note.type,
      words,
      codeLines,
      secs: Math.max(15, Math.round((words / 230) * 60 + codeLines * 1.2)),
      intel: note.description || firstSentence(note.body),
      ticks: chapterMarks(note.body),
    }
  })

  const objects: ForgeObject[] = input.projects
    .map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      link: project.link,
      years: project.tech,
      cat: categoryOf(project.name),
      external: /^https?:/.test(project.link),
    }))
    .sort(
      (a, b) => CATEGORY_ORDER.indexOf(a.cat) - CATEGORY_ORDER.indexOf(b.cat),
    )

  const playlists: Playlist[] = input.external
    .filter((post): post is SourceExternal & { href: string } =>
      Boolean(post.href),
    )
    .map((post) => ({
      title: post.title,
      description: post.description,
      href: post.href,
      date: post.date,
      year: calendarDate(post.date).getUTCFullYear(),
    }))

  const record = serviceRecord(missions, films, objects, playlists)
  return {
    missions: [...missions].reverse(),
    films,
    objects,
    playlists,
    record,
    firstYear: missions[0]?.year ?? 0,
    lastYear: missions.at(-1)?.year ?? 0,
  }
}

function serviceRecord(
  missions: Mission[],
  films: Film[],
  objects: ForgeObject[],
  playlists: Playlist[],
): ServiceRecord {
  const first = missions[0]
  const last = missions.at(-1)
  const byYear = new Map<number, number>()
  const byMonth = new Map<string, number>()
  for (const mission of missions) {
    byYear.set(mission.year, (byYear.get(mission.year) ?? 0) + 1)
    byMonth.set(mission.month, (byMonth.get(mission.month) ?? 0) + 1)
  }
  const years: [number, number][] = []
  for (let y = first?.year ?? 0; y <= (last?.year ?? -1); y++) {
    years.push([y, byYear.get(y) ?? 0])
  }
  const busiest = years.reduce<[number, number]>(
    (best, row) => (row[1] > best[1] ? row : best),
    years[0] ?? [0, 0],
  )
  let run = 0
  let streak = 0
  for (const [, count] of years) {
    run = count ? run + 1 : 0
    streak = Math.max(streak, run)
  }
  let silence = 0
  let silenceEnd: Mission | null = null
  let closest = Infinity
  for (const mission of missions) {
    if (mission.gapDays === null) continue
    if (mission.gapDays > silence) {
      silence = mission.gapDays
      silenceEnd = mission
    }
    closest = Math.min(closest, mission.gapDays)
  }
  const maxMonth = Math.max(0, ...byMonth.values())
  const span =
    first && last
      ? (calendarDate(last.date).getTime() -
          calendarDate(first.date).getTime()) /
        (365.25 * DAY)
      : 0
  const xp =
    missions.length * 120 +
    films.length * 45 +
    objects.length * 80 +
    playlists.length * 100
  let rankIndex = 0
  RANKS.forEach(([, threshold], index) => {
    if (xp >= threshold) rankIndex = index
  })
  const next = RANKS[rankIndex + 1]

  const medals: Medal[] = [
    {
      id: 'dawn',
      name: 'First Light',
      desc: first
        ? `First mission deployed: “${first.title}”, ${first.date}.`
        : 'No missions yet.',
      on: Boolean(first),
      color: '#ffb84a',
    },
    {
      id: 'arc',
      name: 'Long Haul',
      desc: `Active for ${span.toFixed(1)} years. Awarded for five or more years in service.`,
      on: span >= 5,
      color: '#7fd2ff',
    },
    {
      id: 'twin',
      name: 'Twin Suns',
      desc: `Two missions within seven days. Closest pair: ${closest} day${closest === 1 ? '' : 's'} apart.`,
      on: closest <= 7,
      color: '#ff8a6a',
    },
    {
      id: 'stack',
      name: 'Prolific',
      desc: `${busiest[1]} missions in ${busiest[0]}. Awarded for six or more in a calendar year.`,
      on: busiest[1] >= 6,
      color: '#9dff9a',
    },
    {
      id: 'bolt',
      name: 'Overdrive',
      desc: `${maxMonth} missions in a single month. Awarded for three or more.`,
      on: maxMonth >= 3,
      color: '#ffe066',
    },
    {
      id: 'infinity',
      name: 'Unbroken',
      desc: `At least one mission every year for ${streak} straight years.`,
      on: streak >= 5,
      color: '#c49bff',
    },
    {
      id: 'star',
      name: 'Return Fire',
      desc: silenceEnd
        ? `Came back after ${silence} days of radio silence (${silenceEnd.month}).`
        : 'No silence to come back from.',
      on: silence > 365,
      color: '#ff6ab4',
    },
    {
      id: 'film',
      name: 'Field Notes',
      desc: `${films.length} saved films in the theater. Awarded at eight.`,
      on: films.length >= 8,
      color: '#6affe0',
    },
    {
      id: 'cube',
      name: 'Architect',
      desc: `${objects.length} objects forged. Awarded at ten.`,
      on: objects.length >= 10,
      color: '#7fb6ff',
    },
    {
      id: 'crown',
      name: 'Centurion',
      desc: `One hundred missions deployed. Progress: ${missions.length} / 100.`,
      on: missions.length >= 100,
      color: '#ffd27f',
    },
  ]

  return {
    rank: RANKS[rankIndex][0],
    xp,
    prevXp: RANKS[rankIndex][1],
    next: next ? { name: next[0], xp: next[1] } : null,
    years,
    busiest,
    streak,
    silence,
    span,
    medals,
  }
}

/** Small integers in words, for prose like "Seven years of field reports". */
export function countWord(n: number): string {
  const words = [
    'Zero',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
  ]
  return words[n] ?? String(n)
}

/** A deterministic 32-bit hash, the seed of every procedural picture. */
export function hashStr(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32: a seeded generator, so a slug always paints the same plate. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
