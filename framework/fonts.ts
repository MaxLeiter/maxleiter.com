import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { BuildContext } from './types'

/**
 * Font subsetting.
 *
 * `geist@1.5.1` ships two variable woff2 files covering the full Latin
 * Extended + Greek + Cyrillic range, ~58 KB each. The site only ever renders
 * ASCII plus a handful of punctuation, arrows, box-drawing and geometric
 * characters (scanned from posts/, notes/ and app/), so the variable axis is
 * kept and everything outside those ranges is dropped.
 *
 * The subsets are committed to `app/fonts/` so a clean build does no work.
 * A change to SUBSET_SPEC bumps the manifest hash and regenerates them.
 */

/**
 * Unicode ranges to keep. Derived from a scan of every non-ASCII codepoint in
 * posts/, notes/ and app/ (see the platform agent's report):
 *
 *   Basic Latin + Latin-1 Supplement  everything
 *   General Punctuation               ’ ‘ “ ” — – • … ZWJ
 *   Letterlike Symbols                ™
 *   Arrows                            → ← ↑ ↓
 *   Miscellaneous Technical           ⌘
 *   Box Drawing                       ─ │ ┼ ├ ┤ ┬ ┴ └ ┘ ┌ ┐  (ASCII art in posts)
 *   Geometric Shapes                  ► ◄ ▲ ▼ ▸
 *   Dingbats                          ✕
 *
 * Emoji (⚠ ❗ 🎉 🤷) and ツ are deliberately excluded: Geist has no glyphs for
 * them and they fall through to the system emoji font either way.
 */
const SUBSET_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0020, 0x00ff],
  [0x0131, 0x0131],
  [0x0152, 0x0153],
  [0x02bb, 0x02bc],
  [0x02c6, 0x02c6],
  [0x02da, 0x02da],
  [0x02dc, 0x02dc],
  [0x2000, 0x206f],
  [0x2100, 0x214f],
  [0x2190, 0x21ff],
  [0x2300, 0x23ff],
  [0x2500, 0x257f],
  [0x25a0, 0x25ff],
  [0x2700, 0x27bf],
]

/** Bumped whenever the subset definition changes, to invalidate the artifacts. */
const SUBSET_SPEC = 1

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
}

type SubsetFont = (
  buffer: Buffer,
  text: string,
  options: SubsetOptions,
) => Promise<Buffer>

function subsetText(): string {
  const chars: string[] = []
  for (const [start, end] of SUBSET_RANGES) {
    for (let code = start; code <= end; code++) {
      chars.push(String.fromCodePoint(code))
    }
  }
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
  const specKey = hash(`${SUBSET_SPEC}:${text}`)
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
      `@font-face{font-family:'${font.family}';font-style:normal;` +
        `font-weight:100 900;font-display:swap;` +
        `src:url('${url}') format('woff2')}`,
    )
  }

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  const css = `${faces.join('')}:root{--font-geist-sans:'${
    FONTS[0].family
  }';--font-geist-mono:'${FONTS[1].family}'}`

  return { css, preload, sizes }
}
