import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeRoutes, type RouteInput } from '@vercel/routing-utils'
import { createBuildContext } from './content'
import { writeFeeds } from './feeds'
import { prepareFonts } from './fonts'
import { formatPlatformResult, runPlatformSteps } from './platform'
import type { RouteInfo } from './types'

/**
 * Standalone platform check. Run under both runtimes:
 *
 *   bun run framework/platform.test.ts
 *   pnpm exec esbuild framework/platform.test.ts --bundle --platform=node \
 *     --format=esm --target=node24 --packages=external --jsx=automatic \
 *     --loader:.js=jsx --tsconfig=tsconfig.json \
 *     --outfile=.cache/build/platform.test.mjs && node .cache/build/platform.test.mjs
 *
 * The node path goes through esbuild for the same reason scripts/build.mjs
 * does: framework/ uses extension-less imports, which node cannot resolve on
 * its own. Bundling first is also what production actually does, so this
 * exercises the real shape rather than node's raw type stripping.
 *
 * It builds a real BuildContext from posts/ and notes/, points it at a temp
 * output directory and runs every platform step, then asserts on the files.
 */

/**
 * Walk up to the repo root. `import.meta.url` is framework/ when run directly
 * and .cache/build/ when run from the bundle, so a fixed `..` is wrong in one
 * of the two cases.
 */
function findRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 10; i++) {
    if (
      existsSync(path.join(dir, 'package.json')) &&
      existsSync(path.join(dir, 'posts'))
    ) {
      return dir
    }
    dir = path.dirname(dir)
  }
  throw new Error('could not locate the repo root')
}

const root = findRoot()

let failures = 0
let checks = 0

function check(name: string, fn: () => void): void {
  checks++
  try {
    fn()
    console.log(`  ok   ${name}`)
  } catch (error) {
    failures++
    const message = error instanceof Error ? error.message : String(error)
    console.log(
      `  FAIL ${name}\n       ${message.split('\n').join('\n       ')}`,
    )
  }
}

/**
 * Minimal XML well-formedness scan: tag nesting must balance. Enough to catch
 * an unescaped `<` or a truncated write, which is what we care about here.
 */
function assertWellFormedXml(xml: string, label: string): void {
  assert.ok(xml.startsWith('<?xml'), `${label}: missing XML declaration`)
  const stack: string[] = []
  let i = 0
  while (i < xml.length) {
    const lt = xml.indexOf('<', i)
    if (lt === -1) break
    if (xml.startsWith('<![CDATA[', lt)) {
      const end = xml.indexOf(']]>', lt)
      assert.notEqual(end, -1, `${label}: unterminated CDATA`)
      i = end + 3
      continue
    }
    if (xml.startsWith('<!--', lt)) {
      const end = xml.indexOf('-->', lt)
      assert.notEqual(end, -1, `${label}: unterminated comment`)
      i = end + 3
      continue
    }
    if (xml.startsWith('<?', lt) || xml.startsWith('<!', lt)) {
      const end = xml.indexOf('>', lt)
      assert.notEqual(end, -1, `${label}: unterminated declaration`)
      i = end + 1
      continue
    }
    const gt = xml.indexOf('>', lt)
    assert.notEqual(gt, -1, `${label}: unterminated tag`)
    const raw = xml.slice(lt + 1, gt)
    const name = raw.replace(/^\//, '').split(/[\s/>]/)[0]
    if (raw.startsWith('/')) {
      assert.equal(stack.pop(), name, `${label}: mismatched </${name}>`)
    } else if (!raw.endsWith('/')) {
      stack.push(name)
    }
    i = gt + 1
  }
  assert.deepEqual(stack, [], `${label}: unclosed ${stack.join(', ')}`)
}

/** Slugs of every draft, read straight off disk, bypassing the loaders. */
async function unpublishedSlugs(): Promise<string[]> {
  const slugs: string[] = []
  for (const dir of ['posts', 'notes']) {
    const full = path.join(root, dir)
    for (const file of await fs.readdir(full)) {
      if (!/\.mdx?$/.test(file)) continue
      const source = await fs.readFile(path.join(full, file), 'utf8')
      const frontmatter = source.split(/^---$/m)[1] ?? ''
      if (!/^\s*published:\s*false\s*$/m.test(frontmatter)) continue
      const slug = /^\s*slug:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim()
      slugs.push(slug || path.basename(file).replace(/\.mdx?$/, ''))
    }
  }
  return slugs
}

function pngSize(buffer: Buffer): { width: number; height: number } {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ])
  assert.ok(buffer.subarray(0, 8).equals(signature), 'not a PNG')
  assert.equal(buffer.subarray(12, 16).toString('ascii'), 'IHDR', 'no IHDR')
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

/** The seven top-level pages the sitemap must carry. */
const TOP_LEVEL = [
  '/',
  '/about',
  '/blog',
  '/notes',
  '/labs',
  '/projects',
  '/talks',
]

/**
 * A stand-in for the build's route manifest, which comes from `getPages` and
 * therefore needs the server bundle.
 *
 * This is an INPUT rather than a second transcription of the page registry:
 * the sitemap assertions below check what `writeSitemap` does with a manifest,
 * including that it drops a noindex route and an embed variant. Agreement
 * between the registry and the sitemap is now structural, since the build
 * feeds this exact list to both.
 */
const ROUTES: RouteInfo[] = [
  ...TOP_LEVEL.map((path_) => ({
    path: path_,
    kind: 'page' as const,
    noindex: false,
  })),
  { path: '/404', kind: 'page', title: '404', noindex: true },
  { path: '/about/embed', kind: 'embed', noindex: true, variantOf: '/about' },
]

async function main(): Promise<void> {
  const runtime =
    typeof (globalThis as { Bun?: unknown }).Bun === 'undefined'
      ? `node ${process.version}`
      : 'bun'
  console.log(`platform.test.ts (${runtime})`)

  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'platform-test-'))
  const ctx = await createBuildContext(root)
  ctx.outDir = outDir
  ctx.staticDir = path.join(outDir, 'static')
  await fs.mkdir(path.join(ctx.staticDir, '_assets'), { recursive: true })

  const started = performance.now()
  const fonts = await prepareFonts(ctx)
  const result = await runPlatformSteps(ctx, { fonts, routes: ROUTES })
  console.log(formatPlatformResult(result))
  console.log(`  total   ${(performance.now() - started).toFixed(0)}ms\n`)

  const read = (rel: string) => fs.readFile(path.join(ctx.staticDir, rel))
  const readText = (rel: string) =>
    fs.readFile(path.join(ctx.staticDir, rel), 'utf8')

  // 1. config.json parses and normalizes.
  const config = JSON.parse(
    await fs.readFile(path.join(outDir, 'config.json'), 'utf8'),
  ) as { version: number; routes: RouteInput[]; images: { sizes: number[] } }
  check('config.json is version 3', () => assert.equal(config.version, 3))
  check('config.json routes pass normalizeRoutes', () => {
    const { error } = normalizeRoutes(config.routes)
    assert.equal(error, null, error?.errors?.join('\n') ?? error?.message)
  })
  check('config.json enables the image optimizer', () => {
    assert.deepEqual(config.images.sizes, [640, 828, 1200, 1920])
  })
  const projectConfig = JSON.parse(
    await fs.readFile(path.join(root, 'vercel.json'), 'utf8'),
  ) as {
    framework: null
    buildCommand: string
    installCommand?: string
  }
  check('vercel.json disables framework detection', () => {
    assert.equal(projectConfig.framework, null)
    assert.equal(projectConfig.buildCommand, 'node scripts/build.mjs')
  })
  check('vercel.json pins the install command to an exact pnpm', () => {
    // The dashboard carries a bare `pnpm install` override, which makes the
    // build container pick the OLDEST pnpm it has, pnpm 6. A per-deployment
    // value beats the dashboard. `--prod=false` is load-bearing too: every
    // package the build needs is a devDependency, and pnpm reads
    // NODE_ENV=production as an implicit `--prod`.
    assert.equal(
      projectConfig.installCommand,
      'npx --yes pnpm@9.15.9 install --frozen-lockfile --prod=false',
    )
  })

  // 2. feed.xml is well formed and leaks no drafts.
  const feed = await readText('feed.xml')
  check('feed.xml is well-formed XML', () =>
    assertWellFormedXml(feed, 'feed.xml'),
  )
  const drafts = await unpublishedSlugs()
  check(`feed.xml omits all ${drafts.length} drafts`, () => {
    const leaked = drafts.filter((slug) => feed.includes(`/${slug}`))
    assert.deepEqual(leaked, [], `leaked: ${leaked.join(', ')}`)
  })
  const expectedItems =
    ctx.posts.length + ctx.notes.length + ctx.externalPosts.length
  check(`feed.xml has ${expectedItems} items`, () => {
    assert.equal(feed.split('<item>').length - 1, expectedItems)
    assert.equal(result.feeds.feedItems, expectedItems)
  })

  // Rebuilding the same content must produce the same bytes, or every build
  // shows up as a diff against the baseline. The rss package's clock-stamped
  // <lastBuildDate> is the thing this catches.
  const before = new Map<string, string>()
  for (const file of ['feed.xml', 'sitemap.xml', 'search-index.json']) {
    before.set(file, await readText(file))
  }
  await writeFeeds(ctx, { routes: ROUTES })
  for (const [file, first] of before) {
    // Awaited first, so this is `check` like everything else rather than a
    // hand-inlined copy of its counting and its output format.
    const after = await readText(file)
    check(`${file} is byte-identical on rebuild`, () =>
      assert.equal(after, first),
    )
  }

  // 3. sitemap.xml covers the top-level pages and all content.
  const sitemap = await readText('sitemap.xml')
  check('sitemap.xml is well-formed XML', () =>
    assertWellFormedXml(sitemap, 'sitemap.xml'),
  )
  check(`sitemap.xml has all ${TOP_LEVEL.length} top-level paths`, () => {
    for (const route of TOP_LEVEL) {
      const loc = `https://maxleiter.com${route === '/' ? '' : route}`
      assert.ok(sitemap.includes(`<loc>${loc}</loc>`), `missing ${route}`)
    }
  })
  check('sitemap.xml drops noindex routes and embed variants', () => {
    assert.ok(!sitemap.includes('/404<'), '/404 is in the sitemap')
    assert.ok(!sitemap.includes('/embed<'), 'an embed is in the sitemap')
  })
  check('sitemap.xml has every post and note', () => {
    const expected = TOP_LEVEL.length + ctx.posts.length + ctx.notes.length
    assert.equal(sitemap.split('<url>').length - 1, expected)
  })

  // 4. robots.txt.
  const robots = await readText('robots.txt')
  check('robots.txt allows all and points at the sitemap', () => {
    assert.equal(
      robots,
      'User-Agent: *\nAllow: /\n\nHost: https://maxleiter.com\n' +
        'Sitemap: https://maxleiter.com/sitemap.xml\n',
    )
  })

  // 5. Every post has a 1200x630 OG PNG.
  const slugs = ctx.posts.map((post) => post.slug).filter((s) => Boolean(s))
  check(`${slugs.length + 1} OG images are 1200x630 PNGs`, () => {
    assert.equal(result.og.total, slugs.length + 1)
  })
  for (const rel of [
    'opengraph-image.png',
    ...slugs.map((slug) => `blog/${slug}/opengraph-image.png`),
  ]) {
    checks++
    try {
      const size = pngSize(await read(rel))
      assert.deepEqual(size, { width: 1200, height: 630 })
    } catch (error) {
      failures++
      const message = error instanceof Error ? error.message : String(error)
      console.log(`  FAIL ${rel}\n       ${message}`)
    }
  }
  console.log(`  ok   every OG PNG is 1200x630`)

  // 6. search-index.json.
  const index = JSON.parse(await readText('search-index.json')) as {
    type: string
    title: string
    href: string
    external: boolean
  }[]
  const expectedIndex =
    ctx.posts.length +
    ctx.externalPosts.length +
    ctx.notes.length +
    ctx.projects.length
  check(`search-index.json has ${expectedIndex} items`, () => {
    assert.equal(index.length, expectedIndex)
  })
  check('search-index.json items have the exact 4-key shape', () => {
    for (const item of index) {
      assert.deepEqual(Object.keys(item), ['type', 'title', 'href', 'external'])
      assert.ok(['blog', 'note', 'project'].includes(item.type))
      assert.equal(item.external, item.href.startsWith('http'))
    }
  })

  // 7. Fonts.
  check('font subsets are registered and smaller than the originals', () => {
    for (const font of result.fonts.sizes) {
      assert.ok(font.after < font.before, `${font.name} did not shrink`)
      assert.ok(ctx.assets[`${font.name}.woff2`], `${font.name} not in assets`)
    }
    assert.equal(result.fonts.preload.length, 2)
    assert.match(result.fonts.css, /--font-geist-sans/)
    assert.match(result.fonts.css, /--font-geist-mono/)
  })

  await fs.rm(outDir, { recursive: true, force: true })

  const suffix = failures ? `, ${failures} FAILED` : ''
  console.log(`\n${checks - failures}/${checks} checks passed${suffix}`)
  if (failures) process.exitCode = 1
}

await main()
