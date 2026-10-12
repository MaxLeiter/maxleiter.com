/**
 * Bakes every card's art to a committed WebP, and checks that it is current.
 *
 *   bun run scripts/bake-art.ts            bake what changed
 *   bun run scripts/bake-art.ts --check    exit 1 if anything is stale
 *   bun run scripts/bake-art.ts --sheet x.png [--only seed,seed]
 *                                          also write a contact sheet
 *
 * The art is SVG source in app/art/pieces/. Rasterizing it at build time
 * cost about a second a card and a megabyte of PNG, so it is done here, once,
 * with sharp (librsvg + libwebp), and the build only copies the result and
 * fails when a piece's source no longer matches what was baked. sharp is
 * resolved from @vercel/og, which already depends on it, so nothing new is
 * installed.
 */
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ART_PIECES } from '../app/art/index.ts'
import { ART_HEIGHT, ART_WIDTH, artFile, artHash } from '../app/art/baked.ts'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, 'app', 'art', 'baked')
const args = process.argv.slice(2)
const check = args.includes('--check')
const sheetAt = args.indexOf('--sheet')
const sheet = sheetAt >= 0 ? args[sheetAt + 1] : null
const onlyAt = args.indexOf('--only')
const only = onlyAt >= 0 ? new Set(args[onlyAt + 1].split(',')) : null

type Sharp = (
  input: Buffer,
  options?: { density?: number },
) => {
  resize: (w: number, h: number) => ReturnType<Sharp>
  webp: (o: { quality: number; effort: number }) => ReturnType<Sharp>
  png: () => ReturnType<Sharp>
  composite: (
    layers: { input: Buffer; left: number; top: number }[],
  ) => ReturnType<Sharp>
  toBuffer: () => Promise<Buffer>
}
const requireFromOg = createRequire(
  createRequire(path.join(ROOT, 'package.json')).resolve('@vercel/og'),
)
const sharp = requireFromOg('sharp') as Sharp & {
  (o: {
    create: { width: number; height: number; channels: 3; background: string }
  }): ReturnType<Sharp>
}

fs.mkdirSync(OUT, { recursive: true })
let stale = 0
let baked = 0
const tiles: { seed: string; png: Buffer }[] = []
for (const piece of ART_PIECES) {
  const seed = piece.seeds[0]
  if (only && !piece.seeds.some((s) => only.has(s))) continue
  const svg = piece.draw()
  const file = path.join(OUT, artFile(seed))
  const want = artHash(svg)
  const meta = `${file}.hash`
  const have = fs.existsSync(meta) ? fs.readFileSync(meta, 'utf8').trim() : ''
  if (have !== want || !fs.existsSync(file)) {
    stale++
    if (!check) {
      const density = (72 * ART_WIDTH) / 640
      const webp = await sharp(Buffer.from(svg), { density })
        .resize(ART_WIDTH, ART_HEIGHT)
        .webp({ quality: 82, effort: 6 })
        .toBuffer()
      fs.writeFileSync(file, webp)
      fs.writeFileSync(meta, `${want}\n`)
      baked++
      console.log(`baked ${seed}  ${(webp.length / 1024).toFixed(1)} KB`)
    } else console.log(`stale ${seed}`)
  }
  if (sheet) {
    tiles.push({
      seed,
      png: await sharp(Buffer.from(svg), { density: 72 * 0.6 })
        .resize(384, 240)
        .png()
        .toBuffer(),
    })
  }
}

if (sheet && tiles.length) {
  const cols = Math.min(6, tiles.length)
  const rows = Math.ceil(tiles.length / cols)
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const label = (seed: string) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="22"><rect width="384" height="22" fill="#111"/><text x="4" y="15" font-family="sans-serif" font-size="12" fill="#bbb">${esc(seed.slice(0, 60))}</text></svg>`,
    )
  const img = await sharp({
    create: {
      width: cols * 394 + 10,
      height: rows * 272 + 10,
      channels: 3,
      background: '#111',
    },
  })
    .composite(
      tiles.flatMap((t, i) => {
        const left = 10 + (i % cols) * 394
        const top = 10 + Math.floor(i / cols) * 272
        return [
          { input: t.png, left, top },
          { input: label(t.seed), left, top: top + 240 },
        ]
      }),
    )
    .png()
    .toBuffer()
  fs.writeFileSync(sheet, img)
  console.log(`sheet ${sheet}: ${tiles.length} cards`)
}

if (check && stale) {
  console.error(
    `${stale} art pieces are stale: run bun run scripts/bake-art.ts`,
  )
  process.exitCode = 1
} else if (!check) console.log(`${baked} baked, ${ART_PIECES.length} pieces`)
