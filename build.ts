import { constants as fsConstants, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import * as esbuild from 'esbuild'
import { transform as lightning } from 'lightningcss'
import { createBuildContext } from './framework/content'
import { buildCss } from './framework/css'
import { buildClient } from './framework/client'
import { prepareFonts } from './framework/fonts'
import { formatPlatformResult, runPlatformSteps } from './framework/platform'
import { staticPathFor } from './framework/routing'
import type { BuildContext, RouteInfo, RouteManifest } from './framework/types'
import type { RenderedPage, WrapOptions } from './framework/entry-server'

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
  await fs.readFile(path.join(ROOT, 'framework', 'node-bundle.json'), 'utf8'),
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

/* ------------------------------------------------- esbuild css modules -- */

/**
 * Scoped CSS from every `*.module.css` the server bundle imported, keyed by
 * absolute path.
 *
 * A Map rather than an array because esbuild runs `onLoad` callbacks
 * concurrently and completion order differs between node and bun, which made
 * the concatenated sheet -- and therefore every HTML file -- differ by runtime
 * at identical byte length. Emitted sorted by path.
 */
const moduleCss = new Map<string, { css: string; classes: string[] }>()

/** A slice of the stylesheet plus what proves a page needs it. */
interface Fragment {
  name: string
  css: string
  /** `markers` as one alternation, compiled once instead of per page. */
  test: RegExp
  /** Sorted on before `name`, so a sheet a fragment builds on comes first. */
  order: number
}

function moduleEntries(): [string, { css: string; classes: string[] }][] {
  return [...moduleCss.entries()].sort(([a], [b]) => a.localeCompare(b))
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
 * At-rules whose braces hold declarations or keyframe stops rather than
 * selectors. `0%` inside `@keyframes` is not a selector, and reading it as one
 * would condemn the whole module to the base sheet.
 */
const OPAQUE_AT_RULE =
  /^@(-\w+-)?(keyframes|font-face|property|counter-style|page|font-feature-values)\b/

/**
 * The first selector in a sheet that is not anchored to one of `classes`, or
 * null when every rule is.
 *
 * A module can only be gated on its own scoped class names if dropping the
 * module could only ever drop rules those names select. One bare `:root`,
 * element or `html[data-theme]` selector and it has to ship on every page.
 * Rules nested inside another style rule are already constrained by their
 * ancestor, so only the outermost selector of each rule is checked.
 */
function unanchoredSelector(css: string, classes: string[]): string | null {
  if (classes.length === 0) return 'no exported class names'
  const stack: ('group' | 'opaque' | 'style')[] = []
  let start = 0
  for (let i = 0; i < css.length; i++) {
    const char = css[i]
    if (char === '{') {
      const prelude = css.slice(start, i).trim()
      const kind = !prelude.startsWith('@')
        ? 'style'
        : OPAQUE_AT_RULE.test(prelude)
          ? 'opaque'
          : 'group'
      if (
        kind === 'style' &&
        !stack.includes('style') &&
        !stack.includes('opaque') &&
        !classes.some((name) => prelude.includes(name))
      ) {
        return prelude
      }
      stack.push(kind)
      start = i + 1
    } else if (char === '}') {
      stack.pop()
      start = i + 1
    } else if (char === ';') {
      start = i + 1
    }
  }
  return null
}

/**
 * Every CSS module is its own conditional fragment, keyed by the scoped class
 * names lightningcss already returns, so a page carries a module's rules only
 * when its markup mentions one of them.
 *
 * There is deliberately no list of which modules count as "features":
 * react-tweet's theme plus ten CSS modules on all 78 pages for the sake of one
 * post was the largest per-page regression in Phase 1, and a hand-maintained
 * list is exactly how the next one gets in. What cannot be gated falls back to
 * the base sheet, loudly.
 */
function splitModules(): { base: string; fragments: Fragment[] } {
  const base: string[] = []
  const fragments: Fragment[] = []
  for (const [file, mod] of moduleEntries()) {
    // pnpm's store path is most of a vendor module's name and none of its
    // meaning, so the report says `react-tweet/dist/...` rather than the store.
    const marker = 'node_modules/'
    const name = file.includes(marker)
      ? file.slice(file.lastIndexOf(marker) + marker.length)
      : path.relative(ROOT, file)
    const unanchored = unanchoredSelector(mod.css, mod.classes)
    if (unanchored === null) {
      fragments.push(fragment(name, mod.css, mod.classes))
      continue
    }
    console.log(
      `  ${name} ships on every page: ` +
        `\`${unanchored}\` is not one of its own scoped classes`,
    )
    base.push(mod.css)
  }
  return { base: base.join('\n'), fragments }
}

/* ------------------------------------------------------ server bundle --- */

/**
 * Bundles `framework/entry-server.ts` for node. Everything the pages import --
 * path aliases, CSS modules, JSX -- is resolved here, once, so bun and node
 * behave the same.
 */
async function buildServer(): Promise<string> {
  const outfile = path.join(CACHE, 'server', 'entry.mjs')
  await esbuild.build({
    ...NODE_BUNDLE,
    entryPoints: [path.join(ROOT, 'framework', 'entry-server.ts')],
    outfile,
    absWorkingDir: ROOT,
    tsconfig: path.join(ROOT, 'tsconfig.json'),
    plugins: [cssModulePlugin()],
    logLevel: 'silent',
  })
  return outfile
}

/**
 * `*.module.css` -> a JS object of scoped class names, with the scoped CSS
 * collected for the site sheet.
 *
 * Three of the modules open with `@reference "tailwindcss"`, which
 * lightningcss passes through as an unknown at-rule. None of them uses
 * `@apply`, so those lines are vestigial and get stripped here.
 */
function cssModulePlugin(): esbuild.Plugin {
  return {
    name: 'css-modules',
    setup(build) {
      build.onLoad({ filter: /\.module\.css$/ }, async (args) => {
        const source = await fs.readFile(args.path, 'utf8')
        const cleaned = source.replace(/^\s*@reference\s+[^;]+;\s*$/gm, '')
        const { code, exports } = lightning({
          filename: args.path,
          code: Buffer.from(cleaned),
          cssModules: { pattern: '[hash]_[local]' },
          minify: true,
        })
        // Sorted, because lightningcss returns `exports` in an order that
        // varies between runs. Unsorted, the generated `.d.ts` and the class
        // map in the bundle both churned on every single build.
        const names: Record<string, string> = {}
        for (const [local, value] of Object.entries(exports ?? {}).sort(
          ([a], [b]) => a.localeCompare(b),
        )) {
          names[local] = value.name
        }
        moduleCss.set(args.path, {
          css: code.toString(),
          classes: Object.values(names),
        })
        await writeCssModuleTypes(args.path, Object.keys(names))
        return {
          contents: `export default ${JSON.stringify(names)}`,
          loader: 'js',
        }
      })

      // A plain `.css` import contributes nothing at build time; the sheet is
      // assembled by framework/css.ts.
      build.onLoad({ filter: /\.css$/ }, () => ({
        contents: 'export default {}',
        loader: 'js',
      }))
    },
  }
}

/** A class name that can be written as a bare property key. */
const BARE_KEY = /^[A-Za-z_$][\w$]*$/

/**
 * Keeps `tsc --noEmit` happy without the typescript-plugin-css-modules plugin.
 *
 * Keys are emitted the way oxfmt would write them: bare when they are valid
 * identifiers, quoted otherwise. Quoting everything meant the build wrote one
 * form, `pnpm lint` rewrote it to the other, and all five generated files
 * showed up modified after every build-then-lint cycle.
 */
async function writeCssModuleTypes(
  file: string,
  keys: string[],
): Promise<void> {
  const declaration = ['declare const styles: {']
    .concat(
      keys.map((key) => {
        const name = BARE_KEY.test(key) ? key : JSON.stringify(key)
        return `  readonly ${name}: string`
      }),
    )
    .concat(['}', 'export default styles', ''])
    .join('\n')
  const target = `${file}.d.ts`
  try {
    if ((await fs.readFile(target, 'utf8')) === declaration) return
  } catch {
    // Not written yet.
  }
  await fs.writeFile(target, declaration)
}

/* ------------------------------------------------------- plain sheets --- */

/**
 * The fragments that are plain stylesheets rather than CSS modules, so they
 * have no scoped class names to be keyed on.
 *
 * Their markers are declared here, and are attribute-shaped on purpose: the
 * bare word `shiki` also appears in prose, and `react-tweet-theme` appears in
 * the base sheet, so either would gate a page in on a false positive.
 */
const PLAIN_SHEETS = [
  {
    name: 'mdx-diff',
    file: 'app/styles/fragments/mdx-diff.css',
    markers: ['class="mdx-diff'],
    order: 1,
  },
  {
    // react-tweet's own theme sheet, which its CSS modules build on, so it
    // sorts ahead of them.
    name: 'react-tweet-theme',
    specifier: 'react-tweet/theme.css',
    markers: ['class="react-tweet-theme'],
    order: 0,
  },
] as const

async function readSheet(relative: string): Promise<string> {
  try {
    return await fs.readFile(path.join(ROOT, relative), 'utf8')
  } catch {
    return ''
  }
}

/**
 * `theme.css` is a public export of react-tweet rather than a deep import; its
 * per-component CSS modules already flow through the server bundle's
 * lightningcss plugin.
 */
async function readPackageSheet(specifier: string): Promise<string> {
  const { createRequire } = await import('node:module')
  const require_ = createRequire(path.join(ROOT, 'package.json'))
  try {
    return await fs.readFile(require_.resolve(specifier), 'utf8')
  } catch (error) {
    console.warn(`  ${specifier}: ${(error as Error).message}`)
    return ''
  }
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
    wrapPage: (page: RenderedPage, options: WrapOptions) => string
    wrapPartial: (page: RenderedPage, options: WrapOptions) => string
    islandManifest: () => string[]
    highlightCss: () => string
    renderFeedHtml: (
      ctx: BuildContext,
      post: { body: string },
    ) => Promise<string>
  }

  // Everything the stylesheet needs is known once the server bundle has run
  // its CSS-module plugin, and `buildCss` shells out to the Tailwind CLI, so
  // it runs while the main thread renders. Their two step times overlap.
  const modules = splitModules()
  const cssPromise = step('css', () =>
    buildCss({ root: ROOT, cacheDir: CACHE, moduleCss: modules.base }),
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
        cacheDir: CACHE,
        islands: server.islandManifest(),
      }),
    ),
    step('fonts', () => prepareFonts(ctx)),
  ])
  Object.assign(ctx.assets, client.assets)

  const fragments = await step('css fragments', async () => {
    const all = [...modules.fragments]
    for (const sheet of PLAIN_SHEETS) {
      const text =
        'file' in sheet
          ? await readSheet(sheet.file)
          : await readPackageSheet(sheet.specifier)
      if (text) {
        all.push(fragment(sheet.name, text, sheet.markers, sheet.order))
      }
    }
    // shiki's rules key on the class its transformer puts on every `<pre>`.
    const highlight = server.highlightCss()
    if (highlight) all.push(fragment('shiki', highlight, ['class="shiki']))
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
        assets: ctx.assets,
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
        assets: ctx.assets,
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
      `  ${'tailwind'.padEnd(nameWidth)}  ${String(css.tailwindBytes).padStart(8)}`,
    )
    console.log(
      `  ${'base'.padEnd(nameWidth)}  ${String(css.moduleBytes).padStart(8)}`,
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
