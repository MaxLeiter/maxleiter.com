import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { BuildContext } from '../shared/types'

/**
 * Font subsetting.
 *
 * Three variable faces: Saira (the MERIDIAN interface face, weight and width
 * axes), Exo 2 (body text) and Geist Mono (code). The sources are packages --
 * `@fontsource-variable/saira`, `@fontsource-variable/exo-2`, `geist` -- and
 * three things are cut from each: every codepoint the site does not render,
 * each axis outside the range its CSS asks for, and every OpenType feature no
 * rule turns on. Each face is two files (see `slices`). The interface and body
 * cores are preloaded on every page, so they are the largest item on a first
 * visit and they are on the critical path; Geist Mono only renders where a
 * page has code, so it is left to load on demand.
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
 * The interface glyphs above Latin-1 the MERIDIAN chrome renders: ‹ › for
 * crumbs and back links, ′ on the per-year chart, ↵ on key hints. Only the
 * Saira and Exo 2 cores carry them; Geist Mono's core stays exactly what
 * `scripts/box-drawing.py` cut its corners from.
 */
const INTERFACE_EXTRAS: readonly number[] = [0x2032, 0x2039, 0x203a, 0x21b5]

/**
 * Geist Mono's weight range.
 *
 * Code asks for 400, and bold spans inside it for 600 and 700. Preflight's
 * `b, strong { font-weight: bolder }` resolves to 700 from a normal parent and
 * would ask for 900 inside an already-bold one, where clamping to 700 is the
 * correct rendering rather than a degraded one.
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

interface Axis {
  min: number
  max: number
}

interface FontSource {
  /** Filename stem: `Saira` becomes `Saira-subset.woff2`. */
  stem: string
  /** Resolves the source woff2 from the repo root. */
  source: (root: string) => string
  /** CSS `font-family` the site's tokens point at. */
  family: string
  /** The custom property `global.css` reads the family through. */
  token: string
  /** The variation axes kept, each clamped to the range the CSS asks for. */
  axes: { wght: Axis; wdth?: Axis }
  /** Codepoints above Latin-1 the core slice carries. */
  extras: readonly number[]
  /** Preload the core slice on every page. */
  preload: boolean
  /**
   * Has a committed face of diagram glyphs the source lacks, drawn by
   * scripts/box-drawing.py: `<stem>-box.woff2`, and `<stem>-box.json` naming
   * its codepoints and the core subset it was cut from.
   */
  drawn?: boolean
}

/**
 * Resolve a package's files without relying on a hoisted node_modules.
 * Both fontsource packages export `./files/*`.
 */
function packageFile(root: string, spec: string): string {
  return createRequire(path.join(root, 'package.json')).resolve(spec)
}

const FONTS: readonly FontSource[] = [
  {
    // The whole interface: logo, menu, labels and crumbs. Widths 100-125 are
    // the axis range the chrome uses (`font-stretch` 100% for labels, 112%
    // for the menu, 125% for the logo); 300-700 is every weight it asks for.
    stem: 'Saira',
    source: (root) =>
      packageFile(
        root,
        '@fontsource-variable/saira/files/saira-latin-wdth-normal.woff2',
      ),
    family: 'Saira Variable',
    token: '--font-saira',
    axes: { wght: { min: 300, max: 700 }, wdth: { min: 100, max: 125 } },
    extras: [...SUBSET_EXTRAS, ...INTERFACE_EXTRAS],
    preload: true,
  },
  {
    // Body text. Emphasis is synthesised from the upright rather than paying
    // for the italic file, which would be another 22 KB.
    stem: 'Exo2',
    source: (root) =>
      packageFile(
        root,
        '@fontsource-variable/exo-2/files/exo-2-latin-wght-normal.woff2',
      ),
    family: 'Exo 2 Variable',
    token: '--font-exo',
    axes: { wght: { min: 300, max: 700 } },
    extras: [...SUBSET_EXTRAS, ...INTERFACE_EXTRAS],
    preload: true,
  },
  {
    stem: 'GeistMono',
    source: (root) =>
      path.join(geistFontDir(root), 'geist-mono/GeistMono-Variable.woff2'),
    family: 'Geist Mono Variable',
    token: '--font-geist-mono',
    axes: { wght: WEIGHT_AXIS },
    extras: SUBSET_EXTRAS,
    preload: false,
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
 * The first slice is the core: claiming every codepoint no other face of its
 * family claims. Every other face is fetched only where its characters
 * render, and claims exactly its own codepoints.
 *
 * Where two faces of one family overlap, the browser takes the last one
 * declared that covers the character, so the ranges are kept disjoint by
 * construction rather than by order. A character in no face still reaches the
 * core and falls through to the system font, and the descriptor in every
 * document's head stays short. Which system font is not ours to pick: macOS
 * chooses partly from the primary file's cmap, which is why diagram glyphs
 * are drawn rather than left to fallback.
 */
function slices(font: FontSource): readonly Slice[] {
  return [
    {
      suffix: 'subset',
      codepoints: [...range(ASCII), ...LATIN1_RENDERED, ...font.extras],
    },
    { suffix: 'latin1', codepoints: LATIN1_REST },
  ]
}

/**
 * What a subset is cut to, as the string its manifest hash is taken over.
 * A weight-only face hashes exactly as it did before the width axis existed,
 * so Geist Mono's committed subsets -- and the drawn corners cut from its
 * core -- are not regenerated by a change that does not touch them.
 */
function axesKey(axes: FontSource['axes']): string {
  const weight = `${axes.wght.min}-${axes.wght.max}`
  return axes.wdth ? `${weight}/wdth:${axes.wdth.min}-${axes.wdth.max}` : weight
}

/** The `@font-face` range descriptors matching the instanced axes. */
function axisDescriptors(axes: FontSource['axes']): string {
  const weight = `font-weight:${axes.wght.min} ${axes.wght.max};`
  return axes.wdth
    ? `${weight}font-stretch:${axes.wdth.min}% ${axes.wdth.max}%;`
    : weight
}

export interface FontResult {
  /** `@font-face` blocks plus the `--font-*` family custom properties. */
  css: string
  /** Absolute paths (site-relative URLs) to preload in `<head>`. */
  preload: string[]
  /** Per-file byte counts against the source face, for reporting. */
  sizes: { name: string; before: number; after: number }[]
}

interface SubsetOptions {
  targetFormat: 'woff2' | 'woff' | 'sfnt'
  /** Partial instancing: keep the axis, narrow its range. */
  variationAxes?: Record<string, Axis>
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
 * Subset every face (writing the committed artifacts if absent), copy them
 * into `${ctx.staticDir}/_assets` under a content hash, register them in
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
    const original = await fs.readFile(font.source(ctx.root))
    const family: {
      name: string
      codepoints: readonly number[]
      data: Buffer
    }[] = []

    for (const slice of slices(font)) {
      const name = `${font.stem}-${slice.suffix}`
      const subsetPath = path.join(fontDir, `${name}.woff2`)
      const text = String.fromCodePoint(...slice.codepoints)
      const specKey = hash(
        `${SUBSET_SPEC}:${axesKey(font.axes)}:` +
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
          variationAxes: font.axes.wdth
            ? { wght: font.axes.wght, wdth: font.axes.wdth }
            : { wght: font.axes.wght },
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
      if (face === core && font.preload) preload.push(url)
      const claims =
        face === core
          ? unicodeRange(claimed, { invert: true })
          : unicodeRange(face.codepoints)
      faces.push(
        // The descriptors have to match the instanced axes, or the browser
        // asks for a weight the file cannot render and synthesises one.
        `@font-face{font-family:'${font.family}';font-style:normal;` +
          `${axisDescriptors(font.axes)}font-display:swap;` +
          `src:url('${url}') format('woff2');unicode-range:${claims}}`,
      )
    }
  }

  // Write only on change: the dev server watches app/, and rewriting an
  // identical manifest on every build retriggered the build forever.
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`
  const previous = await fs.readFile(manifestPath, 'utf8').catch(() => '')
  if (previous !== manifestText) await fs.writeFile(manifestPath, manifestText)

  const tokens = FONTS.map((font) => `${font.token}:'${font.family}'`)
  const css = `${faces.join('')}:root{${tokens.join(';')}}`

  return { css, preload, sizes }
}
