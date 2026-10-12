import { createHash } from 'node:crypto'

/**
 * Where a piece's baked WebP lives and how its freshness is judged. Shared by
 * scripts/bake-art.ts, which writes them, and the build, which refuses a
 * piece whose source no longer matches what was baked.
 */

export const ART_WIDTH = 1536
export const ART_HEIGHT = 960

/** Bump to re-bake everything after a change to the baking itself. */
const BAKE_VERSION = 1

export function artFile(seed: string): string {
  return `${seed.replace(/[^A-Za-z0-9-]+/g, '-')}.webp`
}

export function artHash(svg: string): string {
  return createHash('sha256')
    .update(`${BAKE_VERSION}\0${ART_WIDTH}x${ART_HEIGHT}\0${svg}`)
    .digest('hex')
    .slice(0, 16)
}
