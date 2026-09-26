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
 * Three things are cut: every codepoint the site does not render, the weight
 * axis outside the range its CSS asks for, and every OpenType feature no rule
 * turns on. Each face is two files (see SLICES), and the core one is preloaded
 * on every page, so this is the largest item on a first visit and it is on
 * the critical path.
 *
 * The subsets are committed to `app/fonts/` so a clean build does no work.
 * A change to SUBSET_SPEC bumps the manifest hash and regenerates them.
 */

/** Basic Latin. */
const ASCII: readonly [number, number] = [0x0020, 0x007e]

/** Latin-1 Supplement, split between the two slices. */
const LATIN1_SUPPLEMENT: readonly [number, number] = [0x00a0, 0x00ff]

/**
 * The Latin-1 Supplement characters the built output renders: no-break space,
 * ® ° and ·. They go in the core file; the other 92 would add ~7 KB to it per
 * face for accented letters no page uses.
 */
const LATIN1_RENDERED: readonly number[] = [0x00a0, 0x00ae, 0x00b0, 0x00b7]

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
 * Emoji (⚠ ❗ 🎉 🤷 and U+FE0F), ツ, ⌘, ✕ and ▸ are deliberately absent:
 * Geist has no glyphs for them, so they fall through to the system font
 * either way. The diagram glyphs Geist Mono lacks are drawn (`drawn` below).
 */
const SUBSET_EXTRAS: readonly number[] = [
  // General Punctuation: – — ‘ ’ ‚ “ ” „ • … and the zero-width joiner
  0x200d, 0x2013, 0x2014, 0x2018, 0x2019, 0x201a, 0x201c, 0x201d, 0x201e,
  0x2022, 0x2026,
  // Letterlike Symbols: ™
  0x2122,
  // Arrows: ← ↑ → ↓ ↩
  0x2190, 0x2191, 0x2192, 0x2193, 0x21a9,
  // Box Drawing, the part of the light set Geist Mono has: ─ │ ┌ └ ├.
  // U+2500 alone appears 668 times in the built output.
  0x2500, 0x2502, 0x250c, 0x2514, 0x251c,
  // Geometric Shapes: ▲ ▼
  0x25b2, 0x25bc,
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

/**
 * The OpenType features kept: what a browser applies to Latin text by
 * default, plus `tnum` for the two `tabular-nums` rules.
 *
 * Geist also carries ss01-ss09, frac, sups, case, dlig, aalt and more: ~140
 * alternate glyphs per face that no rule asks for, 6 KB across the two. A
 * `font-variant-*` or `font-feature-settings`
 * needing a feature missing here silently does nothing, which is why the
 * platform test checks app/ against this list.
 */
export const LAYOUT_FEATURES: readonly string[] = [
  'ccmp',
  'locl',
  'mark',
  'mkmk',
  'kern',
  'liga',
  'clig',
  'calt',
  'rvrn',
  'tnum',
]

/** Bumped whenever the subset definition changes, to invalidate the artifacts. */
const SUBSET_SPEC = 3

interface FontSource {
  /** Filename stem: `GeistSans` becomes `GeistSans-subset.woff2`. */
  stem: string
  /** Path under node_modules/geist/dist/fonts. */
  source: string
  /** CSS `font-family` the site's tokens point at. */
  family: string
  /**
   * Has a committed face of diagram glyphs the source lacks, drawn by
   * scripts/box-drawing.py: `<stem>-box.woff2`, and `<stem>-box.json` naming
   * its codepoints and the core subset it was cut from.
   */
  drawn?: boolean
}

const FONTS: readonly FontSource[] = [
  {
    stem: 'GeistSans',
    source: 'geist-sans/Geist-Variable.woff2',
    family: 'Geist Variable',
  },
  {
    stem: 'GeistMono',
    source: 'geist-mono/GeistMono-Variable.woff2',
    family: 'Geist Mono Variable',
    drawn: true,
  },
]

interface Slice {
  /** Filename suffix after the stem. */
  suffix: string
  codepoints: readonly number[]
}

function range([from, to]: readonly [number, number]): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

const LATIN1_REST = range(LATIN1_SUPPLEMENT).filter(
  (code) => !LATIN1_RENDERED.includes(code),
)

/**
 * The first slice is the core: preloaded on every page, and claiming every
 * codepoint no other face of its family claims. Every other face is fetched
 * only where its characters render, and claims exactly its own codepoints.
 *
 * Where two faces of one family overlap, the browser takes the last one
 * declared that covers the character, so the ranges are kept disjoint by
 * construction rather than by order. A character in no face still reaches the
 * core and falls through to the system font, and the descriptor in every
 * document's head stays short. Which system font is not ours to pick: macOS
 * chooses partly from the primary file's cmap, which is why diagram glyphs
 * are drawn rather than left to fallback.
 */
const SLICES: readonly Slice[] = [
  {
    suffix: 'subset',
    codepoints: [...range(ASCII), ...LATIN1_RENDERED, ...SUBSET_EXTRAS],
  },
  { suffix: 'latin1', codepoints: LATIN1_REST },
]

export interface FontResult {
  /** `@font-face` blocks plus the `--font-geist-*` custom properties. */
  css: string
  /** Absolute paths (site-relative URLs) to preload in `<head>`. */
  preload: string[]
  /** Per-file byte counts against the source face, for reporting. */
  sizes: { name: string; before: number; after: number }[]
}

interface SubsetOptions {
  targetFormat: 'woff2' | 'woff' | 'sfnt'
  /** Partial instancing: keep the axis, narrow its range. */
  variationAxes?: Record<string, { min: number; max: number }>
  /** Allowlist of layout features. Omitted, subset-font keeps all of them. */
  keepFeatures?: readonly string[]
}

type SubsetFont = (
  buffer: Buffer,
  text: string,
  options: SubsetOptions,
) => Promise<Buffer>

/**
 * The codepoints as a `unicode-range` descriptor, `U+a1-ad,U+af,...`, or with
 * `invert` every other codepoint in Unicode.
 */
function unicodeRange(
  codepoints: readonly number[],
  { invert = false } = {},
): string {
  let runs: [number, number][] = []
  for (const code of [...codepoints].sort((a, b) => a - b)) {
    const last = runs.at(-1)
    if (last && code === last[1] + 1) last[1] = code
    else runs.push([code, code])
  }
  if (invert) {
    const gaps: [number, number][] = []
    let next = 0
    for (const [from, to] of runs) {
      if (from > next) gaps.push([next, from - 1])
      next = to + 1
    }
    if (next <= 0x10ffff) gaps.push([next, 0x10ffff])
    runs = gaps
  }
  return runs
    .map(([from, to]) =>
      from === to
        ? `U+${from.toString(16)}`
        : `U+${from.toString(16)}-${to.toString(16)}`,
    )
    .join(',')
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

const DRAW = 'uv run --with fonttools --with brotli scripts/box-drawing.py'

/**
 * The committed face of drawn glyphs, with the codepoints its sidecar names.
 * The glyphs are cut from the core subset's own bars, so a core that has
 * changed since -- a `geist` upgrade, a new weight axis -- fails the build
 * rather than serving corners drawn to someone else's metrics.
 */
async function readDrawn(
  fontDir: string,
  stem: string,
  core: { name: string; data: Buffer },
): Promise<{ name: string; codepoints: readonly number[]; data: Buffer }> {
  const name = `${stem}-box`
  const file = path.join(fontDir, `${name}.woff2`)
  const [data, sidecar] = await Promise.all([
    fs.readFile(file),
    fs.readFile(path.join(fontDir, `${name}.json`), 'utf8'),
  ]).catch(() => {
    throw new Error(`${name} is missing: run \`${DRAW}\``)
  })
  const { codepoints, from } = JSON.parse(sidecar) as {
    codepoints: number[]
    from: string
  }
  if (from !== hash(core.data)) {
    throw new Error(
      `${name} was drawn from an older ${core.name}: run \`${DRAW}\``,
    )
  }
  return { name, codepoints, data }
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
    const family: {
      name: string
      codepoints: readonly number[]
      data: Buffer
    }[] = []

    for (const slice of SLICES) {
      const name = `${font.stem}-${slice.suffix}`
      const subsetPath = path.join(fontDir, `${name}.woff2`)
      const text = String.fromCodePoint(...slice.codepoints)
      const specKey = hash(
        `${SUBSET_SPEC}:${WEIGHT_AXIS.min}-${WEIGHT_AXIS.max}:` +
          `${LAYOUT_FEATURES.join(',')}:${text}`,
      )

      const stale = manifest[name] !== specKey || !(await exists(subsetPath))
      if (stale) {
        if (!subsetFont) {
          const required = createRequire(import.meta.url)
          subsetFont = required('subset-font') as SubsetFont
        }
        const subset = await subsetFont(original, text, {
          targetFormat: 'woff2',
          variationAxes: { wght: WEIGHT_AXIS },
          keepFeatures: LAYOUT_FEATURES,
        })
        await fs.writeFile(subsetPath, subset)
        manifest[name] = specKey
      }
      family.push({
        name,
        codepoints: slice.codepoints,
        data: await fs.readFile(subsetPath),
      })
    }

    const [core] = family
    if (font.drawn) family.push(await readDrawn(fontDir, font.stem, core))

    const claimed = family.slice(1).flatMap((face) => face.codepoints)
    for (const face of family) {
      const url = `/_assets/${face.name}.${hash(face.data)}.woff2`
      await fs.writeFile(path.join(ctx.staticDir, url.slice(1)), face.data)
      ctx.assets[`${face.name}.woff2`] = url

      sizes.push({
        name: face.name,
        before: original.byteLength,
        after: face.data.byteLength,
      })
      if (face === core) preload.push(url)
      const claims =
        face === core
          ? unicodeRange(claimed, { invert: true })
          : unicodeRange(face.codepoints)
      faces.push(
        // The descriptor has to match the instanced axis, or the browser asks
        // for a weight the file cannot render and synthesises one.
        `@font-face{font-family:'${font.family}';font-style:normal;` +
          `font-weight:${WEIGHT_AXIS.min} ${WEIGHT_AXIS.max};font-display:swap;` +
          `src:url('${url}') format('woff2');unicode-range:${claims}}`,
      )
    }
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
