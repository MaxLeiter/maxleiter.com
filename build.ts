import crypto from 'node:crypto'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import zlib from 'node:zlib'
import * as esbuild from 'esbuild'
import { transform as lightning } from 'lightningcss'
import { createBuildContext } from './framework/content'
import { buildCss } from './framework/css'
import { buildClient } from './framework/client'
import type { BuildContext } from './framework/types'
import type { Fonts } from './framework/render'
import type { RenderedPage, WrapOptions } from './framework/entry-server'

/**
 * The whole build.
 *
 * Runs under `bun run build.ts` locally. Under node it needs an ESM entry that
 * has already been through esbuild (see `build:bespoke:node` in package.json):
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
const moduleCss = new Map<string, string>()

function collectedModuleCss(): string {
  return [...moduleCss.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, css]) => css)
    .join('\n')
}

/**
 * `*.module.css` -> a JS object of scoped class names, with the scoped CSS
 * collected for the site sheet.
 *
 * Three of the seven modules open with `@reference "tailwindcss"`, which
 * lightningcss passes through as an unknown at-rule. None of the seven uses
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
        moduleCss.set(args.path, code.toString())

        const names: Record<string, string> = {}
        for (const [local, value] of Object.entries(exports ?? {})) {
          names[local] = value.name
        }
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

/** Keeps `tsc --noEmit` happy without the typescript-plugin-css-modules plugin. */
async function writeCssModuleTypes(
  file: string,
  keys: string[],
): Promise<void> {
  const declaration = ['declare const styles: {']
    .concat(keys.map((key) => `  readonly ${JSON.stringify(key)}: string`))
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

/* ------------------------------------------------------ server bundle --- */

const shim = (name: string) => path.join(ROOT, 'framework', 'shims', name)

/**
 * Bundles `framework/entry-server.ts` for node. Everything the pages import --
 * path aliases, CSS modules, JSX, the `next/*` specifiers still present in the
 * reused components -- is resolved here, once, so bun and node behave the same.
 */
async function buildServer(): Promise<string> {
  const outfile = path.join(CACHE, 'server', 'entry.mjs')
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'framework', 'entry-server.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    packages: 'external',
    jsx: 'automatic',
    loader: { '.js': 'jsx' },
    absWorkingDir: ROOT,
    tsconfig: path.join(ROOT, 'tsconfig.json'),
    alias: {
      'next/link': shim('next-link.tsx'),
      'next/navigation': shim('next-navigation.ts'),
      'next/dynamic': shim('next-dynamic.tsx'),
      'next/image': path.join(ROOT, 'framework', 'images.tsx'),
      '@vercel/analytics': shim('analytics.ts'),
    },
    plugins: [cssModulePlugin()],
    logLevel: 'silent',
  })
  return outfile
}

/* -------------------------------------------------------------- fonts --- */

/**
 * Used when `framework/fonts.ts` (platform agent) is not present: copy both
 * Geist variable faces verbatim under a content hash and declare them by hand.
 * `--font-geist-sans` / `--font-geist-mono` are what `global.css` consumes.
 */
async function fallbackFonts(ctx: BuildContext): Promise<Fonts> {
  const { createRequire } = await import('node:module')
  const require_ = createRequire(path.join(ROOT, 'package.json'))
  // `geist`'s exports map does not expose ./package.json, so resolve a real
  // entry point and walk to the sibling fonts directory instead.
  const fontsDir = path.join(
    path.dirname(require_.resolve('geist/font/sans')),
    'fonts',
  )
  const faces = [
    {
      file: path.join(fontsDir, 'geist-sans', 'Geist-Variable.woff2'),
      family: 'Geist Variable',
      variable: '--font-geist-sans',
    },
    {
      file: path.join(fontsDir, 'geist-mono', 'GeistMono-Variable.woff2'),
      family: 'Geist Mono Variable',
      variable: '--font-geist-mono',
    },
  ]

  const assetDir = path.join(ctx.staticDir, '_assets')
  await fs.mkdir(assetDir, { recursive: true })
  const blocks: string[] = []
  const preload: string[] = []
  const variables: string[] = []

  for (const face of faces) {
    const bytes = await fs.readFile(face.file)
    const hash = crypto
      .createHash('sha256')
      .update(bytes)
      .digest('hex')
      .slice(0, 8)
    const name = `${path.basename(face.file, '.woff2')}.${hash}.woff2`
    await fs.writeFile(path.join(assetDir, name), bytes)
    const url = `/_assets/${name}`
    ctx.assets[path.basename(face.file)] = url
    preload.push(url)
    blocks.push(
      `@font-face{font-family:'${face.family}';font-style:normal;` +
        `font-weight:100 900;font-display:swap;src:url('${url}') format('woff2')}`,
    )
    variables.push(`${face.variable}:'${face.family}'`)
  }

  return { css: `${blocks.join('')}:root{${variables.join(';')}}`, preload }
}

/* ------------------------------------------------------ optional modules -- */

/**
 * Imports a module the platform agent owns, if it exists yet.
 *
 * It is bundled through esbuild first for the same reason `entry-server.ts` is:
 * node cannot import TypeScript, and these files use the `@*` path aliases.
 * A missing or broken module logs and is skipped rather than failing the build.
 */
async function optional<T>(
  relative: string,
  required = false,
): Promise<T | null> {
  const source = path.join(ROOT, relative)
  try {
    await fs.access(source)
  } catch {
    if (required) throw new Error(`${relative} is missing`)
    return null
  }
  const outfile = path.join(
    CACHE,
    'opt',
    `${path.basename(relative).replace(/\.tsx?$/, '')}.mjs`,
  )
  try {
    await esbuild.build({
      entryPoints: [source],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node20',
      packages: 'external',
      jsx: 'automatic',
      loader: { '.js': 'jsx' },
      absWorkingDir: ROOT,
      tsconfig: path.join(ROOT, 'tsconfig.json'),
      plugins: [cssModulePlugin()],
      logLevel: 'silent',
    })
    return (await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`)) as T
  } catch (error) {
    if (required) throw error
    console.warn(`  ${relative} failed to load: ${(error as Error).message}`)
    return null
  }
}

/** The body-bearing shape `framework/feeds.ts` hands to the renderer. */
interface FeedPost {
  body: string
}

interface PlatformModule {
  runPlatformSteps: (
    ctx: BuildContext,
    options?: {
      renderPostHtml?: (post: FeedPost) => string | Promise<string>
    },
  ) => Promise<PlatformResult>
  formatPlatformResult?: (result: PlatformResult) => string
}

/** Opaque here; `framework/platform.ts` owns the shape. */
type PlatformResult = Record<string, unknown>

/**
 * react-tweet's theme sheet. Its per-component CSS modules already flow through
 * the server bundle's lightningcss plugin; this is the one plain stylesheet the
 * package ships, and `theme.css` is a public export rather than a deep import.
 */
async function vendorCss(): Promise<string> {
  const { createRequire } = await import('node:module')
  const require_ = createRequire(path.join(ROOT, 'package.json'))
  try {
    return await fs.readFile(require_.resolve('react-tweet/theme.css'), 'utf8')
  } catch (error) {
    console.warn(`  react-tweet theme.css: ${(error as Error).message}`)
    return ''
  }
}

/* --------------------------------------------------------------- output -- */

function outputFile(staticDir: string, routePath: string): string {
  const clean = routePath === '/' ? '' : routePath.replace(/^\//, '')
  return path.join(staticDir, clean, 'index.html')
}

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
        await fs.copyFile(source, target)
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

/* --------------------------------------------------------------- report -- */

const pad = (value: string, width: number) => value.padEnd(width)
const padStart = (value: string, width: number) => value.padStart(width)

function timingTable(total: number): string {
  const width = Math.max(...steps.map((s) => s.name.length), 5)
  const rows = steps.map(
    (s) => `  ${pad(s.name, width)}  ${padStart(s.ms.toFixed(0), 7)} ms`,
  )
  rows.push(`  ${pad('total', width)}  ${padStart(total.toFixed(0), 7)} ms`)
  return rows.join('\n')
}

function sizeRow(name: string, html: string, width: number): string {
  const raw = Buffer.from(html)
  const gzip = zlib.gzipSync(raw, { level: 9 }).length
  const brotli = zlib.brotliCompressSync(raw).length
  return (
    `  ${pad(name, width)}  ${padStart(String(raw.length), 8)}` +
    `  ${padStart(String(gzip), 7)}  ${padStart(String(brotli), 7)}`
  )
}

/* ----------------------------------------------------------------- main -- */

async function main(): Promise<void> {
  const started = performance.now()
  await fs.rm(path.join(ROOT, '.vercel', 'output'), {
    recursive: true,
    force: true,
  })

  const ctx = await step('content', () => createBuildContext(ROOT))
  await fs.mkdir(ctx.staticDir, { recursive: true })

  const entryFile = await step('server bundle', buildServer)
  const server = (await import(`${entryFile}?t=${Date.now()}`)) as {
    renderAll: (ctx: BuildContext) => Promise<RenderedPage[]>
    wrapPage: (page: RenderedPage, options: WrapOptions) => string
    islandManifest: () => string[]
    highlightCss: () => string
    renderFeedHtml: (ctx: BuildContext, post: FeedPost) => Promise<string>
  }

  const pages = await step('render', () => server.renderAll(ctx))

  const client = await step('client bundle', () =>
    buildClient({
      root: ROOT,
      staticDir: ctx.staticDir,
      cacheDir: CACHE,
      islands: server.islandManifest(),
    }),
  )
  Object.assign(ctx.assets, client.assets)

  const fonts = await step('fonts', async () => {
    const mod = await optional<{
      prepareFonts: (ctx: BuildContext) => Promise<Fonts>
    }>('framework/fonts.ts')
    if (!mod) {
      console.warn('  framework/fonts.ts absent; copying Geist unsubset')
      return fallbackFonts(ctx)
    }
    return mod.prepareFonts(ctx)
  })

  const css = await step('css', async () =>
    buildCss({
      root: ROOT,
      cacheDir: CACHE,
      moduleCss: collectedModuleCss(),
      highlightCss: server.highlightCss(),
      vendorCss: await vendorCss(),
    }),
  )

  const wrapOptions: WrapOptions = {
    css: css.css,
    fonts,
    assets: ctx.assets,
    islands: client.islands,
  }

  const html = new Map<string, string>()
  await step('write html', async () => {
    for (const page of pages) {
      const markup = server.wrapPage(page, wrapOptions)
      html.set(page.path, markup)
      const file = outputFile(ctx.staticDir, page.path)
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, markup)
    }
  })

  const copied = await step('copy public', () => copyPublic(ctx))

  // Required, not optional: skipping this step would produce a build with no
  // OG images, no feed, no sitemap and no config.json, and still exit zero,
  // so a broken deploy would look like a successful one.
  const platform = await step('platform', async () => {
    const mod = await optional<PlatformModule>('framework/platform.ts', true)
    if (!mod?.runPlatformSteps) {
      throw new Error('framework/platform.ts exports no runPlatformSteps')
    }
    // Without this the feed falls back to `marked`, which renders JSX
    // components in post bodies as raw text.
    const result = await mod.runPlatformSteps(ctx, {
      renderPostHtml: (post) => server.renderFeedHtml(ctx, post),
    })
    return { result, format: mod.formatPlatformResult }
  })

  const total = performance.now() - started

  if (platform.format) {
    console.log(`\n${platform.format(platform.result)}`)
  }

  console.log(`\n${pages.length} routes, ${copied} files copied from public/\n`)
  console.log('steps')
  console.log(timingTable(total))

  const sample = ['/', '/blog/weights', '/notes/fish-directory-colors']
  const present = sample.filter((route) => html.has(route))
  if (present.length > 0) {
    const width = Math.max(...present.map((r) => r.length), 4)
    console.log('\nhtml bytes')
    console.log(
      `  ${pad('page', width)}  ${padStart('raw', 8)}  ${padStart('gzip', 7)}  ${padStart('brotli', 7)}`,
    )
    for (const route of present) {
      console.log(sizeRow(route, html.get(route) as string, width))
    }
  }

  console.log('\ncss bytes')
  console.log(`  tailwind   ${padStart(String(css.tailwindBytes), 8)}`)
  console.log(`  modules    ${padStart(String(css.moduleBytes), 8)}`)
  console.log(`  highlight  ${padStart(String(css.highlightBytes), 8)}`)
  console.log(`  vendor     ${padStart(String(css.vendorBytes), 8)}`)

  if (client.outputs.length > 0) {
    console.log('\nclient bytes')
    for (const output of client.outputs) {
      const file = path.join(ctx.staticDir, '_assets', output.file)
      const bytes = await fs.readFile(file)
      console.log(
        `  ${pad(output.file, 28)}  ${padStart(String(bytes.length), 7)}` +
          `  ${padStart(String(zlib.brotliCompressSync(bytes).length), 6)} br`,
      )
    }
  }
}

await main().catch((error: unknown) => {
  console.error(`\nbuild failed: ${(error as Error).stack ?? error}`)
  process.exitCode = 1
})
