import { constants as fsConstants, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import * as esbuild from 'esbuild'
import { createBuildContext } from '@framework/content/index'
import { buildCss } from '@framework/assets/css'
import { buildClient } from '@framework/assets/client'
import { prepareFonts } from '@framework/assets/fonts'
import {
  formatPlatformResult,
  runPlatformSteps,
} from '@framework/platform/index'
import { staticPathFor } from '@framework/shared/routing'
import type {
  BuildContext,
  RouteInfo,
  RouteManifest,
} from '@framework/shared/types'
import type { RenderedPage, WrapOptions } from '@framework/render/index'

/**
 * The whole build.
 *
 * Runs under `bun run build.ts` locally. Under node it needs an ESM entry that
 * has already been through esbuild (see `scripts/build.mjs`):
 * `--experimental-strip-types` erases types but does not transform JSX, and it
 * is not available at all before node 22.6.
 *
 * Nothing here uses a `Bun.*` API, so both runtimes take the same path through
 * esbuild for module resolution, path aliases and CSS modules.
 */

/**
 * Walks up to the nearest `package.json` rather than trusting the module's own
 * directory: under node this file runs as `.cache/build.mjs`, one level down.
 */
function findRoot(from: string): string {
  let dir = from
  for (;;) {
    if (existsSync(path.join(dir, 'package.json'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return from
    dir = parent
  }
}

const ROOT = findRoot(path.dirname(fileURLToPath(import.meta.url)))
const CACHE = path.join(ROOT, '.cache')

/**
 * The node/ESM esbuild settings, shared with `scripts/build.mjs`.
 *
 * Data rather than a helper module because the launcher is plain JS run
 * straight by node: it cannot import a `.ts` factory without the very type
 * stripping it exists to avoid. Both sides read this file and add their own
 * entry point, plugins and log level.
 */
const NODE_BUNDLE = JSON.parse(
  await fs.readFile(
    path.join(ROOT, 'framework', 'assets', 'node-bundle.json'),
    'utf8',
  ),
) as esbuild.BuildOptions

/* ---------------------------------------------------------- timing ------ */

interface Step {
  name: string
  ms: number
}

const steps: Step[] = []

async function step<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
  const started = performance.now()
  const result = await fn()
  steps.push({ name, ms: performance.now() - started })
  return result
}

/* ---------------------------------------------------- css fragments ----- */

/** A slice of the stylesheet plus what proves a page needs it. */
interface Fragment {
  name: string
  css: string
  /** `markers` as one alternation, compiled once instead of per page. */
  test: RegExp
  /** Sorted on before `name`, so a sheet a fragment builds on comes first. */
  order: number
}

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function fragment(
  name: string,
  css: string,
  markers: readonly string[],
  order = 1,
): Fragment {
  return {
    name,
    css,
    test: new RegExp(markers.map(escapeRe).join('|')),
    order,
  }
}

/**
 * Fragments are committed as readable stylesheets and minified here.
 *
 * esbuild is already in the graph and the whole set costs about a millisecond,
 * which is a better trade than committing pre-minified CSS nobody can read or
 * shipping the readable form to every visitor.
 */
async function minifyCss(css: string): Promise<string> {
  const { code } = await esbuild.transform(css, { loader: 'css', minify: true })
  return code.trim()
}

/* ------------------------------------------------------ server bundle --- */

/**
 * Bundles `framework/render/index.ts` for node. Everything the pages import --
 * path aliases, JSX, react-tweet's CSS modules -- is resolved here, once, so
 * bun and node behave the same.
 */
async function buildServer(): Promise<string> {
  const outfile = path.join(CACHE, 'server', 'entry.mjs')
  await esbuild.build({
    ...NODE_BUNDLE,
    entryPoints: [path.join(ROOT, 'framework', 'render', 'index.ts')],
    outfile,
    absWorkingDir: ROOT,
    tsconfig: path.join(ROOT, 'tsconfig.json'),
    plugins: [reactTweetPlugin()],
    logLevel: 'silent',
  })
  return outfile
}

/**
 * react-tweet's CSS modules, resolved to the class names its committed sheet
 * already carries.
 *
 * The package is the only CSS-module consumer left in the graph. Its styling is
 * pre-scoped into `app/styles/fragments/react-tweet.css` by
 * `scripts/react-tweet-css.ts`, so all this has to do is hand each component
 * back the same `.rt-<module>-<class>` names that script wrote. Rendering is
 * build-time only; none of this reaches the client.
 */
function reactTweetPlugin(): esbuild.Plugin {
  return {
    name: 'react-tweet-css',
    setup(build) {
      build.onLoad({ filter: /\.module\.css$/ }, (args) => {
        if (!args.path.includes('react-tweet')) {
          throw new Error(
            `${args.path}: CSS modules are gone; write a pre-scoped .css sheet`,
          )
        }
        const prefix = reactTweetPrefix(args.path)
        return {
          contents:
            'export default new Proxy({}, { get: (_, key) =>' +
            ` typeof key === 'string' ? ${JSON.stringify(prefix)} + key : undefined })`,
          loader: 'js',
        }
      })

      // A plain `.css` import contributes nothing at build time; the sheet is
      // assembled by framework/assets/css.ts and the fragments below.
      build.onLoad({ filter: /\.css$/ }, () => ({
        contents: 'export default {}',
        loader: 'js',
      }))
    },
  }
}

/** Must match `prefixFor` in scripts/react-tweet-css.ts. */
function reactTweetPrefix(file: string): string {
  const stem = path.basename(file).replace(/\.module\.css$/, '')
  return `rt-${stem.replace(/^quoted-tweet-/, 'quoted-').replace(/^tweet-/, '')}-`
}

/* ------------------------------------------------------- plain sheets --- */

/**
 * Every conditional slice of the stylesheet, with the markup that proves a page
 * needs it.
 *
 * Each sheet is written with its scoping already in the class names -- `.tree-`,
 * `.shot-`, `.mc-`, `.rt-` -- so the marker is just that prefix as it appears in
 * an attribute. Attribute-shaped on purpose: the bare word `shiki` also turns up
 * in prose, and `react-tweet-theme` appears in the base sheet, so either would
 * gate a page in on a false positive.
 *
 * Gating is worth roughly 3.5 KB brotli on the median page. The risk of a
 * hand-maintained list is that a new sheet gets forgotten; the check is that a
 * sheet with no entry here never ships at all, which is loud rather than silent.
 */
const PLAIN_SHEETS = [
  {
    // react-tweet's theme plus its 17 pre-scoped component modules, generated
    // by scripts/react-tweet-css.ts. Sorts first: the modules read the custom
    // properties `.react-tweet-theme` defines.
    name: 'react-tweet',
    file: 'app/styles/fragments/react-tweet.css',
    markers: ['class="react-tweet-theme'],
    order: 0,
  },
  {
    name: 'mdx-diff',
    file: 'app/styles/fragments/mdx-diff.css',
    markers: ['class="mdx-diff'],
    order: 1,
  },
  {
    name: 'file-tree',
    file: 'app/components/file-tree/file-tree.css',
    markers: ['class="tree-'],
    order: 1,
  },
  {
    // Also the file-tree island's external-file anchors, which is why its
    // marker has to match a bare `class="link"` as well as `link-underline`.
    name: 'link',
    file: 'app/components/link/link.css',
    markers: ['class="link'],
    order: 1,
  },
  {
    name: 'mc-inventory',
    file: 'app/components/mc/inventory.css',
    markers: ['class="mc-'],
    order: 1,
  },
  {
    name: 'mdx-note',
    file: 'app/mdx/components/mdx-note.css',
    markers: ['class="mdx-note'],
    order: 1,
  },
  {
    // The grid wrapper always renders, so `.shot-trigger` -- minted by the
    // island at runtime and in no markup anywhere -- is covered by it.
    name: 'shot-grid',
    file: 'app/mdx/components/shot-grid.css',
    markers: ['class="shot-'],
    order: 1,
  },
] as const

/**
 * Loud on a missing file. A fragment that silently resolves to the empty string
 * ships a page with its styling quietly gone, which looks like a CSS bug rather
 * than a build one.
 */
async function readSheet(relative: string): Promise<string> {
  return await fs.readFile(path.join(ROOT, relative), 'utf8')
}

/* --------------------------------------------------------------- output -- */

async function copyPublic(ctx: BuildContext): Promise<number> {
  const from = path.join(ctx.root, 'public')
  let count = 0
  const walk = async (dir: string, rel: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      // feeds.ts writes the real feed; the copy in public/ is the old build's.
      if (rel === '' && entry.name === 'feed.xml') continue
      if (entry.name === '.DS_Store') continue
      const source = path.join(dir, entry.name)
      const target = path.join(ctx.staticDir, rel, entry.name)
      if (entry.isDirectory()) {
        await fs.mkdir(target, { recursive: true })
        await walk(source, path.join(rel, entry.name))
      } else {
        // COPYFILE_FICLONE makes this an APFS clone locally, which is what
        // keeps 11MB of images cheap to re-copy, and a plain copy elsewhere.
        await fs.copyFile(source, target, fsConstants.COPYFILE_FICLONE)
        count += 1
      }
    }
  }
  await fs.mkdir(ctx.staticDir, { recursive: true })
  await walk(from, '')

  // Next served app/favicon.ico by convention; `<link rel="icon">` still points
  // at /favicon.ico, so it has to be copied explicitly.
  try {
    await fs.copyFile(
      path.join(ctx.root, 'app', 'favicon.ico'),
      path.join(ctx.staticDir, 'favicon.ico'),
    )
    count += 1
  } catch {
    console.warn('  app/favicon.ico missing; /favicon.ico will 404')
  }

  return count
}

/** What `.vercel/output/routes.json` records for one rendered document. */
function toRouteInfo(page: RenderedPage): RouteInfo {
  return {
    path: page.path,
    kind: page.kind,
    ...(page.title === undefined ? {} : { title: page.title }),
    noindex: page.noindex,
    ...(page.variants ? { variants: page.variants } : {}),
    ...(page.variantOf ? { variantOf: page.variantOf } : {}),
    ...(page.aliases ? { aliases: page.aliases } : {}),
  }
}

/* --------------------------------------------------------------- report -- */

function timingTable(total: number): string {
  const width = Math.max(...steps.map((s) => s.name.length), 5)
  const rows = steps.map(
    (s) => `  ${s.name.padEnd(width)}  ${s.ms.toFixed(0).padStart(7)} ms`,
  )
  rows.push(`  ${'total'.padEnd(width)}  ${total.toFixed(0).padStart(7)} ms`)
  return rows.join('\n')
}

/**
 * Brotli at quality 5 rather than the default 11. These are console lines, not
 * artifacts: quality 11 over three pages and eight assets cost 154 ms, more
 * than a quarter of the build, for numbers within a few percent of these.
 */
const BROTLI = { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }

function sizeRow(name: string, html: string, width: number): string {
  const raw = Buffer.from(html)
  const gzip = zlib.gzipSync(raw, { level: 6 }).length
  const brotli = zlib.brotliCompressSync(raw, BROTLI).length
  return (
    `  ${name.padEnd(width)}  ${String(raw.length).padStart(8)}` +
    `  ${String(gzip).padStart(7)}  ${String(brotli).padStart(7)}`
  )
}

/* -------------------------------------------------------- scratch dirs -- */

/**
 * Every scratch directory carries the pid of the build that owns it, which is
 * what lets two builds run at once. They used to share one name, so one
 * build's `rm -rf` raced the other's writes and died with `ENOTEMPTY`.
 */
const SCRATCH = /^\.output-(?:build|previous)-(\d+)$/
const scratchDir = (kind: 'build' | 'previous') =>
  path.join(ROOT, '.vercel', `.output-${kind}-${process.pid}`)

/** Ten minutes. A build takes half a second; this is pure paranoia. */
const ABANDONED_MS = 10 * 60 * 1000

function isRunning(pid: number): boolean {
  try {
    // Signal 0 checks for the process without touching it. EPERM means it
    // exists and belongs to someone else, which still counts as running.
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Remove scratch directories left behind by builds that died before they
 * published. Ours and any live build's are left alone, so this is safe to run
 * while another build is in flight.
 */
async function pruneAbandonedBuilds(): Promise<void> {
  const parent = path.join(ROOT, '.vercel')
  let entries: string[]
  try {
    entries = await fs.readdir(parent)
  } catch {
    return
  }
  for (const name of entries) {
    const pid = Number(SCRATCH.exec(name)?.[1])
    if (!Number.isInteger(pid) || pid === process.pid) continue
    const dir = path.join(parent, name)
    try {
      // A pid can be reused, so age is the tiebreak: a directory whose owner
      // looks alive but which nothing has touched in ten minutes is garbage.
      const { mtimeMs } = await fs.stat(dir)
      if (isRunning(pid) && Date.now() - mtimeMs < ABANDONED_MS) continue
      await fs.rm(dir, { recursive: true, force: true })
    } catch {
      // Gone already, or another build is cleaning up the same one.
    }
  }
}

/**
 * Swap the finished tree into `.vercel/output`.
 *
 * Moving the old tree aside rather than deleting it in place keeps the window
 * where nothing is published one rename wide. Two builds finishing together
 * can still interleave, and the loser's rename then lands on a directory the
 * winner just created, which POSIX rejects with ENOTEMPTY. Both builds produce
 * identical bytes, so last writer wins is fine; this only has to not fail.
 */
async function publish(buildOut: string, finalOut: string): Promise<void> {
  const previous = scratchDir('previous')
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rm(previous, { recursive: true, force: true })
      try {
        await fs.rename(finalOut, previous)
      } catch (error) {
        // Nothing published yet, which is the first build in a clean tree.
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      await fs.rename(buildOut, finalOut)
      await fs.rm(previous, { recursive: true, force: true })
      return
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      const racy =
        code === 'ENOTEMPTY' || code === 'EEXIST' || code === 'ENOENT'
      if (attempt >= 4 || !racy) throw error
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)))
    }
  }
}

/* ----------------------------------------------------------------- main -- */

async function main(): Promise<void> {
  const started = performance.now()

  // Build into a scratch directory of our own and swap it in at the very end.
  //
  // Rebuilding `.vercel/output` in place left it partial for the ~500ms the
  // build takes, so anything reading it concurrently -- another agent's
  // verification, a browser holding a page whose hashed asset URLs just
  // vanished, `vercel deploy --prebuilt` -- saw a torn tree and failed in ways
  // that looked like real defects. A failed build now also leaves the previous
  // good output untouched instead of destroying it.
  //
  // The pid in the name is what makes two builds at once safe. They used to
  // share one scratch directory, so the `rm -rf` here raced the other build's
  // writes and died with `ENOTEMPTY: directory not empty`.
  const finalOut = path.join(ROOT, '.vercel', 'output')
  const buildOut = scratchDir('build')
  await fs.rm(buildOut, { recursive: true, force: true })
  await pruneAbandonedBuilds()

  const ctx = await step('content', () => createBuildContext(ROOT))
  ctx.outDir = buildOut
  ctx.staticDir = path.join(buildOut, 'static')
  await fs.mkdir(ctx.staticDir, { recursive: true })

  const entryFile = await step('server bundle', buildServer)
  const server = (await import(`${entryFile}?t=${Date.now()}`)) as {
    renderAll: (ctx: BuildContext) => Promise<RenderedPage[]>
    wrapPage: (
      page: RenderedPage,
      options: WrapOptions & { runtime: string },
    ) => string
    wrapPartial: (page: RenderedPage, options: WrapOptions) => string
    islandManifest: () => string[]
    highlightCss: () => string
    renderFeedHtml: (
      ctx: BuildContext,
      post: { body: string },
    ) => Promise<string>
  }

  // `buildCss` shells out to the Tailwind CLI, so it runs while the main
  // thread renders. Their two step times overlap.
  const cssPromise = step('css', () =>
    buildCss({ root: ROOT, cacheDir: CACHE }),
  )
  const pages = await step('render', () => server.renderAll(ctx))
  const css = await cssPromise
  const routes = pages.map(toRouteInfo)

  const [client, fonts] = await Promise.all([
    // Needs `render`: the island manifest is what rendering collects.
    step('client bundle', () =>
      buildClient({
        root: ROOT,
        staticDir: ctx.staticDir,
        islands: server.islandManifest(),
      }),
    ),
    step('fonts', () => prepareFonts(ctx)),
  ])
  Object.assign(ctx.assets, client.assets)

  const fragments = await step('css fragments', async () => {
    const all: Fragment[] = []
    for (const sheet of PLAIN_SHEETS) {
      const text = await minifyCss(await readSheet(sheet.file))
      all.push(fragment(sheet.name, text, sheet.markers, sheet.order))
    }
    // shiki's rules key on the class its transformer puts on every `<pre>`.
    const highlight = server.highlightCss()
    if (highlight) {
      all.push(fragment('shiki', await minifyCss(highlight), ['class="shiki']))
    }
    return all.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  })

  /**
   * Base sheet plus only the fragments this page references.
   *
   * The body string includes each island's `data-props` JSON, and that is
   * load-bearing rather than incidental: the shot grid's `trigger` class is
   * passed as a prop and minted at runtime, so it never appears in the
   * server-rendered markup. Narrowing this to rendered markup would silently
   * drop the lightbox trigger's rules.
   */
  const cssFor = (
    body: string,
  ): { css: { base: string; page: string }; used: string[] } => {
    const used = fragments.filter((item) => item.test.test(body))
    return {
      // Kept apart rather than concatenated: the base sheet is byte-identical
      // on every page, so the shell can emit it as its own `#css-base` tag and
      // a soft navigation replaces only `#css-page`.
      css: { base: css.css, page: used.map((item) => item.css).join('\n') },
      used: used.map((item) => item.name),
    }
  }

  const sample = ['/', '/blog/weights', '/notes/fish-directory-colors']
  const sampled = new Map<string, string>()
  // Counted from what `cssFor` actually selected, rather than by scanning the
  // finished HTML for a fragment's first bytes: two mechanisms answering one
  // question disagree the moment fragment assembly changes.
  const fragmentPages = new Map<string, number>()

  await step('write html', async () => {
    for (const page of pages) {
      const sheet = cssFor(page.body)
      for (const name of sheet.used) {
        fragmentPages.set(name, (fragmentPages.get(name) ?? 0) + 1)
      }
      const markup = server.wrapPage(page, {
        css: sheet.css,
        fonts,
        siteUrl: ctx.site.url,
        runtime: client.runtime,
        // Only this page's islands, so a content page does not carry a map
        // entry for the desktop it will never mount.
        islands: Object.fromEntries(
          page.islands
            .filter((name) => client.islands[name])
            .map((name) => [name, client.islands[name]]),
        ),
      })
      if (sample.includes(page.path)) sampled.set(page.path, markup)
      // Aliases are extra filenames for the same body, declared on the route
      // rather than special-cased here: `/404` also has to exist as
      // `404.html`, because Vercel's static builder injects an error-phase
      // route to that name ahead of ours.
      // The soft-navigation variant: same head and body, none of the shell
      // the destination already has. Written beside every `index.html`, so
      // the router can ask for it by convention with no manifest lookup.
      const partial = server.wrapPartial(page, {
        css: sheet.css,
        fonts,
        siteUrl: ctx.site.url,
        islands: Object.fromEntries(
          page.islands
            .filter((name) => client.islands[name])
            .map((name) => [name, client.islands[name]]),
        ),
      })

      for (const target of [page.path, ...(page.aliases ?? [])]) {
        const file = path.join(ctx.staticDir, staticPathFor(target))
        await fs.mkdir(path.dirname(file), { recursive: true })
        await fs.writeFile(file, markup)
        if (file.endsWith(`${path.sep}index.html`)) {
          await fs.writeFile(
            file.replace(/index\.html$/, 'index.partial.html'),
            partial,
          )
        }
      }
    }

    // Beside `static/`, not inside it, so Vercel never serves it. The sitemap,
    // the dev server and the snapshot harness read this rather than keeping
    // their own transcription of the page registry.
    const manifest: RouteManifest = { routes }
    await fs.writeFile(
      path.join(ctx.outDir, 'routes.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    )
  })

  const [copied, platform] = await Promise.all([
    step('copy public', () => copyPublic(ctx)),
    // Required, not optional: skipping this step would produce a build with no
    // OG images, no feed, no sitemap and no config.json, and still exit zero,
    // so a broken deploy would look like a successful one.
    step('platform', () =>
      runPlatformSteps(ctx, {
        fonts,
        routes,
        // Without this the feed falls back to `marked`, which renders JSX
        // components in post bodies as raw text.
        renderPostHtml: (post) => server.renderFeedHtml(ctx, post),
      }),
    ),
  ])

  await step('publish output', async () => {
    await publish(buildOut, finalOut)
    ctx.outDir = finalOut
    ctx.staticDir = path.join(finalOut, 'static')
  })

  // Inside a step, so the timing table accounts for it. Compressing three
  // pages and eight assets used to cost a quarter of the build and was
  // measured after `total` was computed, so it appeared nowhere.
  await step('report', async () => {
    console.log(`\n${formatPlatformResult(platform)}`)
    console.log(
      `\n${pages.length} routes, ${copied} files copied from public/\n`,
    )

    const present = sample.filter((route) => sampled.has(route))
    if (present.length > 0) {
      const width = Math.max(...present.map((route) => route.length), 4)
      console.log('html bytes')
      console.log(
        `  ${'page'.padEnd(width)}  ${'raw'.padStart(8)}` +
          `  ${'gzip'.padStart(7)}  ${'brotli'.padStart(7)}`,
      )
      for (const route of present) {
        console.log(sizeRow(route, sampled.get(route) as string, width))
      }
    }

    const nameWidth = Math.max(...fragments.map((item) => item.name.length), 8)
    console.log('\ncss bytes')
    console.log(
      `  ${'base (tailwind)'.padEnd(nameWidth)}  ${String(css.tailwindBytes).padStart(8)}`,
    )
    for (const item of fragments) {
      const bytes = String(Buffer.byteLength(item.css)).padStart(8)
      const on = fragmentPages.get(item.name) ?? 0
      console.log(`  ${item.name.padEnd(nameWidth)}  ${bytes}  on ${on} pages`)
    }

    if (client.outputs.length > 0) {
      console.log('\nclient bytes')
      for (const output of client.outputs) {
        const file = path.join(ctx.staticDir, '_assets', output.file)
        const bytes = await fs.readFile(file)
        const brotli = zlib.brotliCompressSync(bytes, BROTLI).length
        console.log(
          `  ${output.file.padEnd(28)}  ${String(bytes.length).padStart(7)}` +
            `  ${String(brotli).padStart(6)} br`,
        )
      }
    }
  })

  console.log('\nsteps  (css overlaps render, platform overlaps copy public)')
  console.log(timingTable(performance.now() - started))
}

await main().catch((error: unknown) => {
  console.error(`\nbuild failed: ${(error as Error).stack ?? error}`)
  process.exitCode = 1
})
