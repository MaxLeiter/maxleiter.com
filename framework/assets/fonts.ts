import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { BuildContext } from '../shared/types'

/**
 * Font subsetting.
 *
 * `geist@1.5.1` ships two variable woff2 files covering the full Latin
 * Extended + Greek + Cyrillic range across a 100-900 weight axis, ~58 KB each.
 * Two things are cut: every codepoint the site does not render, and the weight
 * axis outside the range its CSS asks for. Both faces are preloaded on every
 * page, so this is the largest item on a first visit and it is on the critical
 * path.
 *
 * The subsets are committed to `app/fonts/` so a clean build does no work.
 * A change to SUBSET_SPEC bumps the manifest hash and regenerates them.
 */

/** Basic Latin + Latin-1 Supplement, kept whole. */
const LATIN1: readonly [number, number] = [0x0020, 0x00ff]

/**
 * Everything above Latin-1 the site renders, plus a small margin.
 *
 * This used to be eight whole blocks, 1,208 codepoints, of which Geist covers
 * 262. Requesting a block you do not use is not free even when most of it is a
 * no-op: the covered remainder still ships. The list below is the union of
 * every codepoint above U+00FF found in the rendered HTML and in the sources
 * that mint text at runtime, widened to the rest of each small family so a new
 * post does not immediately need a rebuild.
 *
 * Emoji (⚠ ❗ 🎉 🤷 and U+FE0F) and ツ are deliberately absent: Geist has no
 * glyphs for them, so they fall through to the system font either way.
 */
const SUBSET_EXTRAS: readonly number[] = [
  // General Punctuation: – — ‘ ’ ‚ “ ” „ • … and the zero-width joiner
  0x200d, 0x2013, 0x2014, 0x2018, 0x2019, 0x201a, 0x201c, 0x201d, 0x201e,
  0x2022, 0x2026,
  // Letterlike Symbols: ™
  0x2122,
  // Arrows: ← ↑ → ↓ ↩
  0x2190, 0x2191, 0x2192, 0x2193, 0x21a9,
  // Miscellaneous Technical: ⌘, in the palette's shortcut hint
  0x2318,
  // Box Drawing, light set. The ASCII-art diagrams in posts/ use all of these,
  // and U+2500 alone appears 668 times in the built output.
  0x2500, 0x2502, 0x250c, 0x2510, 0x2514, 0x2518, 0x251c, 0x2524, 0x252c,
  0x2534, 0x253c,
  // Geometric Shapes: ▲ ▸ ► ▼ ◄
  0x25b2, 0x25b8, 0x25ba, 0x25bc, 0x25c4,
  // Dingbats: ✕
  0x2715,
]

/**
 * The weight range to keep on the variable axis.
 *
 * The site asks for exactly three weights: 400 (`--font-weight-normal`), 600
 * (`font-semibold`, and `markdown.css`'s headings) and 700 (`font-bold`).
 * Preflight's `b, strong { font-weight: bolder }` resolves to 700 from a normal
 * parent and would ask for 900 inside an already-bold one, where clamping to
 * 700 is the correct rendering rather than a degraded one.
 */
const WEIGHT_AXIS = { min: 400, max: 700 } as const

/** Bumped whenever the subset definition changes, to invalidate the artifacts. */
const SUBSET_SPEC = 2

interface FontSource {
  /** Logical name, also the committed filename stem and the asset key. */
  name: string
  /** Path under node_modules/geist/dist/fonts. */
  source: string
  /** CSS `font-family` the site's tokens point at. */
  family: string
}

const FONTS: readonly FontSource[] = [
  {
    name: 'GeistSans-subset',
    source: 'geist-sans/Geist-Variable.woff2',
    family: 'Geist Variable',
  },
  {
    name: 'GeistMono-subset',
    source: 'geist-mono/GeistMono-Variable.woff2',
    family: 'Geist Mono Variable',
  },
]

export interface FontResult {
  /** `@font-face` blocks plus the `--font-geist-*` custom properties. */
  css: string
  /** Absolute paths (site-relative URLs) to preload in `<head>`. */
  preload: string[]
  /** Per-font byte counts, for reporting. */
  sizes: { name: string; before: number; after: number }[]
}

interface SubsetOptions {
  targetFormat: 'woff2' | 'woff' | 'sfnt'
  /** Partial instancing: keep the axis, narrow its range. */
  variationAxes?: Record<string, { min: number; max: number }>
}

type SubsetFont = (
  buffer: Buffer,
  text: string,
  options: SubsetOptions,
) => Promise<Buffer>

function subsetText(): string {
  const chars: string[] = []
  for (let code = LATIN1[0]; code <= LATIN1[1]; code++) {
    chars.push(String.fromCodePoint(code))
  }
  for (const code of SUBSET_EXTRAS) chars.push(String.fromCodePoint(code))
  return chars.join('')
}

function hash(buffer: Buffer | string): string {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8)
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

/**
 * Resolve `geist`'s font files without relying on a hoisted node_modules.
 * `geist/package.json` is not in the package's `exports` map, so go through an
 * exported subpath — `geist/font/sans` resolves to `<pkg>/dist/sans.js`, and
 * the woff2 files sit beside it in `<pkg>/dist/fonts`.
 */
function geistFontDir(root: string): string {
  const require_ = createRequire(path.join(root, 'package.json'))
  const entry = require_.resolve('geist/font/sans')
  return path.join(path.dirname(entry), 'fonts')
}

/**
 * Subset both Geist faces (writing the committed artifacts if absent), copy
 * them into `${ctx.staticDir}/_assets` under a content hash, register them in
 * `ctx.assets` and return the CSS the shell needs.
 */
export async function prepareFonts(ctx: BuildContext): Promise<FontResult> {
  const fontDir = path.join(ctx.root, 'app', 'fonts')
  const assetDir = path.join(ctx.staticDir, '_assets')
  await fs.mkdir(fontDir, { recursive: true })
  await fs.mkdir(assetDir, { recursive: true })

  const text = subsetText()
  const specKey = hash(
    `${SUBSET_SPEC}:${WEIGHT_AXIS.min}-${WEIGHT_AXIS.max}:${text}`,
  )
  const manifestPath = path.join(fontDir, 'subset-manifest.json')
  let manifest: Record<string, string> = {}
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as Record<
      string,
      string
    >
  } catch {
    manifest = {}
  }

  let subsetFont: SubsetFont | undefined
  const sizes: FontResult['sizes'] = []
  const faces: string[] = []
  const preload: string[] = []

  for (const font of FONTS) {
    const sourcePath = path.join(geistFontDir(ctx.root), font.source)
    const original = await fs.readFile(sourcePath)
    const subsetPath = path.join(fontDir, `${font.name}.woff2`)

    const stale = manifest[font.name] !== specKey || !(await exists(subsetPath))
    if (stale) {
      if (!subsetFont) {
        const required = createRequire(import.meta.url)
        subsetFont = required('subset-font') as SubsetFont
      }
      const subset = await subsetFont(original, text, {
        targetFormat: 'woff2',
        variationAxes: { wght: { min: WEIGHT_AXIS.min, max: WEIGHT_AXIS.max } },
      })
      await fs.writeFile(subsetPath, subset)
      manifest[font.name] = specKey
    }

    const subset = await fs.readFile(subsetPath)
    const url = `/_assets/${font.name}.${hash(subset)}.woff2`
    await fs.writeFile(path.join(ctx.staticDir, url.slice(1)), subset)
    ctx.assets[`${font.name}.woff2`] = url

    sizes.push({
      name: font.name,
      before: original.byteLength,
      after: subset.byteLength,
    })
    preload.push(url)
    faces.push(
      // The descriptor has to match the instanced axis, or the browser asks
      // for a weight the file cannot render and synthesises one.
      `@font-face{font-family:'${font.family}';font-style:normal;` +
        `font-weight:${WEIGHT_AXIS.min} ${WEIGHT_AXIS.max};font-display:swap;` +
        `src:url('${url}') format('woff2')}`,
    )
  }

  // Write only on change: the dev server watches app/, and rewriting an
  // identical manifest on every build retriggered the build forever.
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`
  const previous = await fs.readFile(manifestPath, 'utf8').catch(() => '')
  if (previous !== manifestText) await fs.writeFile(manifestPath, manifestText)

  const css = `${faces.join('')}:root{--font-geist-sans:'${
    FONTS[0].family
  }';--font-geist-mono:'${FONTS[1].family}'}`

  return { css, preload, sizes }
}
