import { createHash } from 'node:crypto'

/**
 * Files a page emits while it renders: the generated cover art and the
 * baked card art.
 *
 * A component asks for a URL with the file's contents, and gets back a
 * content-hashed `/_assets/` path, so it inherits the immutable cache header
 * and the 404 guard every other hashed asset has. The build writes whatever
 * was collected once rendering is done. Identical contents share one file,
 * which is what lets a homepage tile and its article header point at the same
 * cover.
 */

/** Text for generated files, bytes for copied ones. */
export type AssetContents = string | Uint8Array

const emitted = new Map<string, AssetContents>()

export function emitAsset(
  stem: string,
  ext: string,
  contents: AssetContents,
): string {
  const digest = createHash('sha256').update(contents).digest('hex')
  const url = `/_assets/${stem}.${digest.slice(0, 8)}.${ext}`
  emitted.set(url, contents)
  return url
}

/** Everything emitted since the last call, keyed by public URL. */
export function takeEmittedAssets(): Map<string, AssetContents> {
  const out = new Map(emitted)
  emitted.clear()
  return out
}
