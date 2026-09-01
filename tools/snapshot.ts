/**
 * The regression gate: one row per route, compared against `docs/snapshot.json`.
 *
 * This replaced a 2,200-line harness that diffed the output against a committed
 * copy of the old Next build. That reference could no longer be regenerated, and
 * its ignore file had become a changelog of deliberate improvements, so the gate
 * had stopped answering a question anyone was asking.
 *
 * What it answers now is "did anything change since the last output I accepted".
 * Head fields stay in plaintext so `git diff` reads like prose; the prose and
 * code bodies are hashed, because a per-route diff of 78 documents is noise. An
 * intended change is a reviewed one-line diff plus `pnpm snapshot`, rather than
 * a new ignore rule with a paragraph justifying it.
 *
 *   bun run tools/snapshot.ts            compare, exit 1 on a difference
 *   bun run tools/snapshot.ts --write    re-baseline
 *
 * Both expect `.vercel/output` to be a fresh build; `pnpm gate` and
 * `pnpm snapshot` run one first.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { staticPathFor } from '../framework/shared/routing.ts'
import type { RouteManifest } from '../framework/shared/types.ts'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUTPUT = path.join(ROOT, '.vercel', 'output')
const STATIC = path.join(OUTPUT, 'static')
const SNAPSHOT = path.join(ROOT, 'docs', 'snapshot.json')

interface RouteRow {
  path: string
  title: string
  description: string
  canonical: string
  ogImage: string
  noindex: boolean
  /** sha256 of the visible prose, with `<pre>`, script and style removed. */
  textHash: string
  /** sha256 of every `<pre>`'s text, in document order. */
  codeHash: string
  /** The soft-navigation document. 0 when the route has none. */
  partialBytes: number
}

interface Snapshot {
  /**
   * The inline pre-paint theme script. Pinned because it runs before anything
   * else on every page, and a change there is a flash-of-wrong-theme bug that
   * no other field would show.
   */
  themeScript: string
  routes: RouteRow[]
}

const sha = (value: string) =>
  createHash('sha256').update(value).digest('hex').slice(0, 16)

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decode(html: string): string {
  return html.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (whole, body: string) => {
      if (body.startsWith('#x') || body.startsWith('#X')) {
        return String.fromCodePoint(parseInt(body.slice(2), 16))
      }
      if (body.startsWith('#')) {
        return String.fromCodePoint(Number(body.slice(1)))
      }
      return ENTITIES[body] ?? whole
    },
  )
}

/** The first capture of `pattern`, decoded, or the empty string. */
function attr(html: string, pattern: RegExp): string {
  return decode(pattern.exec(html)?.[1] ?? '').trim()
}

const stripTags = (html: string) => decode(html.replace(/<[^>]*>/g, ' '))
const collapse = (text: string) => text.replace(/\s+/g, ' ').trim()

function bodyOf(html: string): string {
  return /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? html
}

/**
 * Everything a reader sees, minus code blocks.
 *
 * `<script>` goes first, which is what keeps island `data-props` out of the
 * hash: those are a serialization detail, and trimming one should not read as a
 * content change. Code blocks get their own hash so a re-lineation in the
 * highlighter cannot hide behind a prose diff -- the distinction the old
 * harness needed two streams and a paragraph of explanation to make.
 */
function prose(html: string): string {
  const stripped = bodyOf(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
  return collapse(stripTags(stripped))
}

function code(html: string): string {
  const blocks = bodyOf(html).match(/<pre[\s\S]*?<\/pre>/gi) ?? []
  return blocks.map((block) => collapse(stripTags(block))).join('\n')
}

async function rowFor(route: { path: string }): Promise<RouteRow> {
  const file = path.join(STATIC, staticPathFor(route.path))
  const html = await fs.readFile(file, 'utf8')
  const head = /<head[^>]*>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? ''
  let partialBytes = 0
  if (file.endsWith(`${path.sep}index.html`)) {
    const partial = file.replace(/index\.html$/, 'index.partial.html')
    partialBytes = await fs
      .stat(partial)
      .then((stats) => stats.size)
      .catch(() => 0)
  }
  return {
    path: route.path,
    title: attr(head, /<title>([\s\S]*?)<\/title>/),
    description: attr(head, /<meta name="description" content="([^"]*)"/),
    canonical: attr(head, /<link rel="canonical" href="([^"]*)"/),
    ogImage: attr(head, /<meta property="og:image" content="([^"]*)"/),
    noindex: /<meta name="robots" content="[^"]*noindex/.test(head),
    textHash: sha(prose(html)),
    codeHash: sha(code(html)),
    partialBytes,
  }
}

/** Every `*.html` under `dir`, relative and slash-separated. */
async function htmlFiles(dir: string): Promise<string[]> {
  const found: string[] = []
  const walk = async (current: string): Promise<void> => {
    let entries
    try {
      entries = await fs.readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (
        entry.name.endsWith('.html') &&
        !entry.name.endsWith('.partial.html')
      ) {
        found.push(path.relative(dir, full).split(path.sep).join('/'))
      }
    }
  }
  await walk(dir)
  return found.sort()
}

/**
 * Documents in the output that the route manifest never declared.
 *
 * The one invariant worth keeping from the old harness: a page is only
 * deployed, redirected to or listed in the sitemap if it is in the manifest, so
 * an undeclared file is a page nothing will ever route to. Hand-written HTML in
 * `public/` is copied verbatim and is not a route, so it is subtracted first.
 */
async function uncovered(declared: Set<string>): Promise<string[]> {
  const copied = new Set(await htmlFiles(path.join(ROOT, 'public')))
  return (await htmlFiles(STATIC)).filter(
    (rel) => !declared.has(rel) && !copied.has(rel),
  )
}

async function collect(): Promise<Snapshot> {
  const manifest = JSON.parse(
    await fs.readFile(path.join(OUTPUT, 'routes.json'), 'utf8'),
  ) as RouteManifest

  const declared = new Set<string>()
  for (const route of manifest.routes) {
    for (const target of [route.path, ...(route.aliases ?? [])]) {
      declared.add(staticPathFor(target))
    }
  }
  const extra = await uncovered(declared)
  if (extra.length > 0) {
    throw new Error(
      `documents the route manifest never declared:\n  ${extra.join('\n  ')}`,
    )
  }

  const first = manifest.routes[0]
  if (!first) throw new Error('routes.json declares no routes')
  const home = await fs.readFile(
    path.join(STATIC, staticPathFor(first.path)),
    'utf8',
  )

  const routes = await Promise.all(
    [...manifest.routes]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map(rowFor),
  )
  return {
    themeScript: sha(/<script>([\s\S]*?)<\/script>/.exec(home)?.[1] ?? ''),
    routes,
  }
}

/** Every field of one route that differs, as `field: before -> after`. */
function diffRow(before: RouteRow, after: RouteRow): string[] {
  const keys = Object.keys(before) as (keyof RouteRow)[]
  return keys
    .filter((key) => key !== 'path' && before[key] !== after[key])
    .map((key) => `    ${key}: ${String(before[key])} -> ${String(after[key])}`)
}

async function check(fresh: Snapshot): Promise<number> {
  let committed: Snapshot
  try {
    committed = JSON.parse(await fs.readFile(SNAPSHOT, 'utf8')) as Snapshot
  } catch {
    console.error(
      `no ${path.relative(ROOT, SNAPSHOT)}; seed it with \`pnpm snapshot\``,
    )
    return 1
  }

  const before = new Map(committed.routes.map((row) => [row.path, row]))
  const after = new Map(fresh.routes.map((row) => [row.path, row]))
  const problems: string[] = []

  if (committed.themeScript !== fresh.themeScript) {
    problems.push(
      `  theme script: ${committed.themeScript} -> ${fresh.themeScript}`,
    )
  }

  const removed = committed.routes.filter((row) => !after.has(row.path))
  for (const row of removed) problems.push(`  route removed: ${row.path}`)

  let changed = 0
  for (const row of fresh.routes) {
    const previous = before.get(row.path)
    if (!previous) continue
    const fields = diffRow(previous, row)
    if (fields.length === 0) continue
    changed += 1
    problems.push(`  ${row.path}\n${fields.join('\n')}`)
  }

  const added = fresh.routes.filter((row) => !before.has(row.path))
  if (added.length > 0) {
    console.log(`added routes (informational): ${added.length}`)
    for (const row of added) console.log(`  + ${row.path}`)
  }

  if (problems.length === 0) {
    console.log(
      `OK: ${fresh.routes.length} routes match ${path.relative(ROOT, SNAPSHOT)}`,
    )
    return 0
  }

  console.error(
    `\n${changed} route(s) changed, ${removed.length} removed:\n` +
      `${problems.join('\n')}\n\n` +
      'If every line above is intended, re-baseline with `pnpm snapshot`' +
      ' and review the diff.',
  )
  return 1
}

const fresh = await collect()

if (process.argv.includes('--write')) {
  await fs.mkdir(path.dirname(SNAPSHOT), { recursive: true })
  await fs.writeFile(SNAPSHOT, `${JSON.stringify(fresh, null, 2)}\n`)
  console.log(
    `wrote ${path.relative(ROOT, SNAPSHOT)}: ${fresh.routes.length} routes`,
  )
} else {
  process.exitCode = await check(fresh)
}
