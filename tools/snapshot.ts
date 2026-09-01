/**
 * Snapshot every route of a maxleiter.com build.
 *
 * Two sources, same output format:
 *
 *   # a running server (the Next baseline)
 *   bun run tools/snapshot.ts --base http://localhost:3457 \
 *     --out docs/rewrite/baseline --raw .cache/baseline-raw
 *
 *   # a static build product (the bespoke build)
 *   bun run tools/snapshot.ts --dir .vercel/output/static \
 *     --out .cache/snapshot-current --raw .cache/current-raw
 *
 * `--dir` reads `.vercel/output/static` the way Vercel serves it, which
 * avoids depending on a dev server and the live-reload script it injects.
 *
 * Writes, per HTML route, `<out>/<route>/index.html` (normalized),
 * `head.json` and `text.txt`; raw responses go to `<raw>/` (gitignored).
 * Also writes `routes.json` and `view-transition-names.json` at the root.
 *
 * Route discovery is driven by `/sitemap.xml` plus the top-level pages the
 * sitemap omits, so adding a post needs no change here.
 *
 * Runs under bun and node >= 20 (global fetch, ESM, no runtime-specific APIs).
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, extname, join, resolve } from 'node:path'
import { maskUrl, normalizeHtml } from './normalize-html.ts'
import type { HeadRecord, ViewTransitionRecord } from './normalize-html.ts'

/** Top-level pages that exist but are missing from the current sitemap. */
const EXTRA_PAGES = [
  '/',
  '/about',
  '/blog',
  '/notes',
  '/labs',
  '/projects',
  '/talks',
]

/**
 * Fixed URL used to render the 404 page. It must never match a real route.
 * The bespoke build serves the same body from `static/404/index.html`.
 */
const NOT_FOUND_PROBE = '/__snapshot_probe_404'

const TEXT_FILES = [
  { path: '/sitemap.xml', file: 'sitemap.xml' },
  { path: '/robots.txt', file: 'robots.txt' },
  { path: '/feed.xml', file: 'feed.xml' },
  { path: '/api/search-index', file: 'search-index.json' },
]

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.png': 'image/png',
}

/**
 * URL -> file inside `.vercel/output/static`, matching how Vercel serves the
 * tree: directory-index resolution plus the rewrites in `config.json`.
 *
 * The special cases are deliberate route moves in the bespoke build. They live
 * here so the baseline keeps addressing every route by its ORIGINAL URL and
 * the diff compares content instead of reporting one big rename.
 */
export function staticFileForPath(urlPath: string): {
  file: string
  status: number
} {
  const [pathname, query] = urlPath.split('?')

  // The 404 body is served for anything the filesystem does not match.
  if (pathname === NOT_FOUND_PROBE) {
    return { file: '404/index.html', status: 404 }
  }
  // config.json rewrites `?embed` to the directory variant.
  if (query === 'embed=true') {
    return {
      file: `${pathname.replace(/^\//, '')}/embed/index.html`,
      status: 200,
    }
  }
  // The search index moved from a Next route handler to a root JSON file.
  if (pathname === '/api/search-index') {
    return { file: 'search-index.json', status: 200 }
  }
  // Metadata images are real files now, not generated routes.
  if (pathname.endsWith('/opengraph-image')) {
    return { file: `${pathname.replace(/^\//, '')}.png`, status: 200 }
  }
  if (pathname === '/') return { file: 'index.html', status: 200 }

  const rel = pathname.replace(/^\//, '')
  const last = rel.split('/').pop() ?? ''
  if (last.includes('.')) return { file: rel, status: 200 }
  return { file: `${rel}/index.html`, status: 200 }
}

interface FetchResult {
  status: number
  contentType: string
  body: Uint8Array
}

/** Reads a route from either a live server or a static build directory. */
type Fetcher = (urlPath: string) => Promise<FetchResult>

function httpFetcher(base: string): Fetcher {
  return async (urlPath) => {
    const res = await fetch(`${base}${urlPath}`, { redirect: 'manual' })
    return {
      status: res.status,
      contentType: res.headers.get('content-type') ?? '',
      body: new Uint8Array(await res.arrayBuffer()),
    }
  }
}

function dirFetcher(staticDir: string): Fetcher {
  return async (urlPath) => {
    const { file, status } = staticFileForPath(urlPath)
    try {
      const body = await readFile(join(staticDir, file))
      return {
        status,
        contentType: CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
        body: new Uint8Array(body),
      }
    } catch {
      // Missing file: Vercel would fall through to the 404 page. Report the
      // miss instead, so a route the build forgot shows up as a failure.
      return { status: 404, contentType: 'text/plain', body: new Uint8Array() }
    }
  }
}

export type RouteKind = 'page' | 'embed' | 'file' | 'binary'

export interface RouteRecord {
  /** URL path as requested, including any query string. */
  path: string
  kind: RouteKind
  /** Directory under the snapshot root, relative and slash-separated. */
  dir: string
  status: number
  contentType: string
  bytes: number
  sha256: string
  /** Pages only. */
  title?: string | null
  description?: string
  canonical?: string
  og?: Record<string, string>
  twitter?: Record<string, string>
  /**
   * Total bytes of inline <style> on the page. Provenance only: head.json
   * deliberately does not record it, because it drifts on every build.
   */
  cssBytes?: number
  /** Binary images only. */
  width?: number
  height?: number
  /** Set when an embed variant is byte-identical to its canonical route. */
  identicalTo?: string
  error?: string
}

export interface SnapshotManifest {
  base: string
  generatedAt: string
  routes: RouteRecord[]
}

interface Args {
  base: string
  /** When set, read this static build directory instead of `base`. */
  dir: string | null
  out: string
  raw: string
  concurrency: number
  only: string | null
  /** `all` probes every per-post OG image, `one` just the first, `none` skips. */
  og: 'all' | 'one' | 'none'
  /** Resolved from `dir` or `base` in main(). */
  fetch: Fetcher
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    base: 'http://localhost:3457',
    dir: null,
    out: 'docs/rewrite/baseline',
    raw: '.cache/baseline-raw',
    concurrency: 8,
    only: null,
    og: 'all',
    fetch: httpFetcher('http://localhost:3457'),
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = (): string => {
      const v = argv[++i]
      if (v === undefined) throw new Error(`${a} needs a value`)
      return v
    }
    if (a === '--base') args.base = next().replace(/\/$/, '')
    else if (a === '--dir') args.dir = next()
    else if (a === '--out') args.out = next()
    else if (a === '--raw') args.raw = next()
    else if (a === '--concurrency') args.concurrency = Number(next())
    else if (a === '--only') args.only = next()
    else if (a === '--og') {
      const v = next()
      if (v !== 'all' && v !== 'one' && v !== 'none') {
        throw new Error('--og must be all, one or none')
      }
      args.og = v
    } else if (a === '--help' || a === '-h') {
      process.stdout.write(
        'usage: snapshot.ts [--base URL | --dir STATIC_DIR] [--out DIR] ' +
          '[--raw DIR] [--concurrency N] [--only SUBSTRING] ' +
          '[--og all|one|none]\n',
      )
      process.exit(0)
    } else throw new Error(`unknown flag: ${a}`)
  }
  return args
}

/** URL path -> snapshot directory. `/` is `root`; `?embed=true` is `__embed`. */
export function dirForPath(path: string): string {
  const [pathname, query] = path.split('?')
  const base =
    pathname === '/' ? 'root' : pathname.replace(/^\//, '').replace(/\/$/, '')
  if (query === 'embed=true') return `${base}/__embed`
  return base
}

function sha256(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex')
}

/** Read width/height out of a PNG IHDR chunk. */
function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length < 24) return null
  for (let i = 0; i < sig.length; i++) if (bytes[i] !== sig[i]) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

async function writeFileEnsuring(
  path: string,
  data: string | Uint8Array,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, data)
}

async function fetchSitemapPaths(fetcher: Fetcher): Promise<string[]> {
  const res = await fetcher('/sitemap.xml')
  if (res.status !== 200) {
    throw new Error(`sitemap.xml returned ${res.status}`)
  }
  const xml = new TextDecoder().decode(res.body)
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  const paths = locs.map((u) => {
    const url = new URL(u)
    return url.pathname === '' ? '/' : url.pathname
  })
  return [...new Set(paths)]
}

function pickMeta(head: HeadRecord, prefix: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const tag of head.tags) {
    if (tag.tag !== 'meta') continue
    const key = tag.attrs.property ?? tag.attrs.name
    if (key?.startsWith(prefix)) out[key] = tag.attrs.content ?? ''
  }
  return out
}

function findMeta(head: HeadRecord, key: string): string | undefined {
  for (const tag of head.tags) {
    if (tag.tag !== 'meta') continue
    if (tag.attrs.name === key || tag.attrs.property === key)
      return tag.attrs.content
  }
  return undefined
}

function findLink(head: HeadRecord, rel: string): string | undefined {
  for (const tag of head.tags) {
    if (tag.tag === 'link' && tag.attrs.rel === rel) return tag.attrs.href
  }
  return undefined
}

interface PageResult {
  record: RouteRecord
  vts: ViewTransitionRecord[]
  /** Raw og:image URL before hash masking, used to find the OG endpoint. */
  rawOgImage?: string
  normalizedHtml: string
}

async function snapshotPage(
  args: Args,
  path: string,
  kind: 'page' | 'embed',
  expectStatus = 200,
): Promise<PageResult> {
  const res = await args.fetch(path)
  const raw = new TextDecoder().decode(res.body)
  const dir = dirForPath(path)

  await writeFileEnsuring(join(args.raw, dir, 'index.html'), raw)

  const record: RouteRecord = {
    path,
    kind,
    dir,
    status: res.status,
    contentType: res.contentType,
    bytes: Buffer.byteLength(raw),
    sha256: sha256(raw),
  }

  // The 404 page is a real page with a deliberately non-200 status, so
  // normalize on the expected status rather than on `res.ok`.
  if (res.status !== expectStatus) {
    record.error = `HTTP ${res.status} (expected ${expectStatus})`
    return { record, vts: [], normalizedHtml: '' }
  }

  const rawOgImage = /<meta property="og:image" content="([^"]+)"/.exec(
    raw,
  )?.[1]
  const norm = normalizeHtml(raw)

  const outDir = join(args.out, dir)
  await writeFileEnsuring(join(outDir, 'index.html'), norm.html)
  await writeFileEnsuring(join(outDir, 'text.txt'), norm.text)
  await writeFileEnsuring(
    join(outDir, 'head.json'),
    `${JSON.stringify(norm.head, null, 2)}\n`,
  )
  // Only pages with fences get a code.json, so most routes stay two files.
  if (norm.code.blocks.length > 0) {
    await writeFileEnsuring(
      join(outDir, 'code.json'),
      `${JSON.stringify(norm.code, null, 2)}\n`,
    )
  }
  // CSS is reference material, not a diff target: keep it out of the tree.
  await writeFileEnsuring(join(args.raw, dir, 'styles.css'), norm.css)

  record.title = norm.head.title
  record.description = findMeta(norm.head, 'description')
  record.canonical = findLink(norm.head, 'canonical')
  record.og = pickMeta(norm.head, 'og:')
  record.twitter = pickMeta(norm.head, 'twitter:')
  record.cssBytes = Buffer.byteLength(norm.css)

  return {
    record,
    vts: norm.viewTransitions,
    ...(rawOgImage === undefined ? {} : { rawOgImage }),
    normalizedHtml: norm.html,
  }
}

async function snapshotTextFile(
  args: Args,
  path: string,
  file: string,
): Promise<RouteRecord> {
  const res = await args.fetch(path)
  const body = new TextDecoder().decode(res.body)
  const dir = dirForPath(path)
  await writeFileEnsuring(join(args.raw, dir, file), body)

  const record: RouteRecord = {
    path,
    kind: 'file',
    dir,
    status: res.status,
    contentType: res.contentType,
    bytes: Buffer.byteLength(body),
    sha256: sha256(body),
  }
  if (res.status !== 200) {
    record.error = `HTTP ${res.status}`
    return record
  }

  // Pretty-print JSON so the committed copy diffs line by line.
  let stored = body
  if (file.endsWith('.json')) {
    stored = `${JSON.stringify(JSON.parse(body), null, 2)}\n`
  }
  await writeFileEnsuring(join(args.out, dir, file), stored)
  return record
}

async function snapshotBinary(args: Args, path: string): Promise<RouteRecord> {
  const res = await args.fetch(path)
  const buf = res.body
  // The requested URL carries Next's per-build metadata hash; the record keys
  // on the masked form so routes.json is stable across builds.
  const stable = maskUrl(path)
  const dir = dirForPath(stable)
  const record: RouteRecord = {
    path: stable,
    kind: 'binary',
    dir,
    status: res.status,
    contentType: res.contentType,
    bytes: buf.byteLength,
    sha256: sha256(buf),
  }
  if (res.status !== 200) {
    record.error = `HTTP ${res.status}`
    return record
  }
  const size = pngSize(buf)
  if (size) {
    record.width = size.width
    record.height = size.height
  }
  await writeFileEnsuring(join(args.raw, dir, 'image.png'), buf)
  return record
}

async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length })
  let cursor = 0
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      for (;;) {
        const i = cursor++
        if (i >= items.length) return
        results[i] = await fn(items[i])
      }
    },
  )
  await Promise.all(workers)
  return results
}

export async function snapshot(args: Args): Promise<SnapshotManifest> {
  const sitemapPaths = await fetchSitemapPaths(args.fetch)
  const pagePaths = [...new Set([...EXTRA_PAGES, ...sitemapPaths])].sort()
  const contentPaths = pagePaths.filter(
    (p) => p.startsWith('/blog/') || p.startsWith('/notes/'),
  )
  const embedPaths = contentPaths.map((p) => `${p}?embed=true`)

  const selected = (p: string): boolean =>
    args.only === null || p.includes(args.only)

  await rm(args.out, { recursive: true, force: true })
  await mkdir(args.out, { recursive: true })

  const records: RouteRecord[] = []
  const vtMap: Record<string, ViewTransitionRecord[]> = {}
  const pageHtml = new Map<string, string>()

  const pageResults = await pool(
    pagePaths.filter(selected),
    args.concurrency,
    (p) => snapshotPage(args, p, 'page'),
  )
  const postOgImages: string[] = []
  for (const r of pageResults) {
    records.push(r.record)
    if (r.vts.length > 0) vtMap[r.record.path] = r.vts
    pageHtml.set(r.record.path, r.normalizedHtml)
    if (r.record.path.startsWith('/blog/') && r.rawOgImage) {
      const u = new URL(r.rawOgImage)
      if (u.pathname.includes('/opengraph-image')) {
        postOgImages.push(`${u.pathname}${u.search}`)
      }
    }
    process.stdout.write(`  ${r.record.status} ${r.record.path}\n`)
  }

  // The 404 body is a page the bespoke build must reproduce (as
  // `static/404/index.html`), so capture it under a fixed probe URL.
  if (selected(NOT_FOUND_PROBE)) {
    const nf = await snapshotPage(args, NOT_FOUND_PROBE, 'page', 404)
    records.push(nf.record)
    if (nf.vts.length > 0) vtMap[nf.record.path] = nf.vts
    process.stdout.write(`  ${nf.record.status} ${nf.record.path} (404 page)\n`)
  }

  const embedResults = await pool(
    embedPaths.filter(selected),
    args.concurrency,
    (p) => snapshotPage(args, p, 'embed'),
  )
  for (const r of embedResults) {
    const canonical = r.record.path.replace('?embed=true', '')
    if (pageHtml.get(canonical) === r.normalizedHtml) {
      r.record.identicalTo = canonical
      // `?embed=true` is handled by a client script, so the server HTML is
      // byte-identical to the canonical route. Storing a second copy for all
      // 32 content routes would add ~370 KB of pure duplication to the
      // committed baseline; diff-html.ts follows `identicalTo` instead.
      await rm(join(args.out, r.record.dir), { recursive: true, force: true })
    }
    records.push(r.record)
    if (r.vts.length > 0) vtMap[r.record.path] = r.vts
    process.stdout.write(
      `  ${r.record.status} ${r.record.path}` +
        `${r.record.identicalTo ? ' (identical to canonical)' : ''}\n`,
    )
  }

  for (const f of TEXT_FILES) {
    if (!selected(f.path)) continue
    const rec = await snapshotTextFile(args, f.path, f.file)
    records.push(rec)
    process.stdout.write(`  ${rec.status} ${rec.path}\n`)
  }

  const perPost =
    args.og === 'none'
      ? []
      : args.og === 'one'
        ? postOgImages.slice(0, 1)
        : postOgImages
  const binaryPaths = ['/opengraph-image', ...perPost].filter(selected)
  const binaryRecords = await pool(binaryPaths, args.concurrency, (p) =>
    snapshotBinary(args, p),
  )
  for (const rec of binaryRecords) {
    records.push(rec)
    process.stdout.write(
      `  ${rec.status} ${rec.path} (${rec.bytes} B` +
        `${rec.width ? `, ${rec.width}x${rec.height}` : ''})\n`,
    )
  }

  records.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))

  const manifest: SnapshotManifest = {
    base: args.dir === null ? args.base : args.dir,
    generatedAt: new Date().toISOString(),
    routes: records,
  }

  await writeFileEnsuring(
    join(args.out, 'routes.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  await writeFileEnsuring(
    join(args.out, 'view-transition-names.json'),
    `${JSON.stringify(vtMap, null, 2)}\n`,
  )

  return manifest
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  args.out = resolve(args.out)
  args.raw = resolve(args.raw)
  const source = args.dir === null ? args.base : resolve(args.dir)
  args.fetch =
    args.dir === null ? httpFetcher(args.base) : dirFetcher(resolve(args.dir))
  process.stdout.write(`snapshotting ${source} -> ${args.out}\n`)
  const manifest = await snapshot(args)
  const failed = manifest.routes.filter((r) => r.error)
  const hard = failed.filter((r) => r.kind === 'page' || r.kind === 'embed')
  process.stdout.write(
    `\n${manifest.routes.length} routes, ${failed.length} non-200 ` +
      `(${hard.length} of them pages)\n`,
  )
  for (const f of failed) {
    process.stdout.write(
      `  ${hard.includes(f) ? 'FAIL' : 'warn'} ${f.path}: ${f.error}\n`,
    )
  }
  // A broken asset route is recorded, not fatal: the baseline has real ones.
  if (hard.length > 0) process.exitCode = 1
}

export { parseArgs }

const entry = process.argv[1] ?? ''
if (entry.endsWith('snapshot.ts') || entry.endsWith('snapshot.js')) {
  await main()
}
