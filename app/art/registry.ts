import fs from 'node:fs'
import path from 'node:path'
import { emitAsset } from '@framework/render/assets'
import { artFile, artHash } from './baked'
import { ART_PIECES } from './index'
import type { ArtPiece } from './kit'

/**
 * The build's side of the card art: which seeds have a bespoke piece, and
 * the hashed URL of its baked WebP. Server only (it reads the committed
 * files); the island learns a cover is bespoke from the markup.
 *
 * A piece whose source no longer matches what was baked fails the build
 * rather than shipping last week's picture: the fix is one command.
 */

let root = ''
const bySeed = new Map<string, ArtPiece>()
const urls = new Map<ArtPiece, string>()

/** Called once per render pass, before any page asks for art. */
export function loadArt(repoRoot: string): void {
  root = repoRoot
  bySeed.clear()
  urls.clear()
  for (const piece of ART_PIECES) {
    for (const seed of piece.seeds) {
      if (bySeed.has(seed)) throw new Error(`two art pieces claim ${seed}`)
      bySeed.set(seed, piece)
    }
  }
}

/** The baked art's URL for a seed, or null to use the generated cover. */
export function artUrl(seed: string): string | null {
  const piece = bySeed.get(seed)
  if (!piece) return null
  const known = urls.get(piece)
  if (known) return known
  const file = path.join(root, 'app', 'art', 'baked', artFile(piece.seeds[0]))
  const stamp = `${file}.hash`
  const have = fs.existsSync(stamp) ? fs.readFileSync(stamp, 'utf8').trim() : ''
  if (have !== artHash(piece.draw()) || !fs.existsSync(file)) {
    throw new Error(
      `card art for ${piece.seeds[0]} is stale or missing: run \`pnpm bake-art\``,
    )
  }
  const url = emitAsset('art', 'webp', fs.readFileSync(file))
  urls.set(piece, url)
  return url
}
