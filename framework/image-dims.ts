import fs from 'node:fs/promises'
import path from 'node:path'
import { loadCommitted } from './committed'

/**
 * Intrinsic dimensions for remote post images, committed to the repo.
 *
 * Without these, `<Img>` falls back to 550x450 on any image whose URL carries
 * no `?w=`/`?h=` hint, which is 25 of the 42 blob-hosted images. The CSS sets
 * `width:100%;height:auto`, so a wrong pair reserves a box with the wrong
 * aspect ratio and the page still shifts when the image loads. A guess is
 * worse than a measurement.
 *
 * Measured once by reading each file's header, then written to
 * `app/data/image-dimensions.json` and read from there forever, so ordinary
 * builds (Vercel's included) touch the network zero times. A failure here is
 * not fatal: the image falls back to the old guess and the build says so.
 */

export interface Dimensions {
  width: number
  height: number
}

export type DimensionMap = Record<string, Dimensions>

const IMAGE_URL =
  /https:\/\/tddeuevmbjbaaeoi\.public\.blob\.vercel-storage\.com\/[^\s"'<>)\\]+/g

const RASTER = /\.(png|jpe?g|gif|webp|avif)(\?|#|$)/i

/** Every blob-hosted raster image referenced by any post or note body. */
export function collectImageUrls(sources: string[]): string[] {
  const urls = new Set<string>()
  for (const source of sources) {
    for (const match of source.matchAll(IMAGE_URL)) {
      const url = match[0]
      if (RASTER.test(url)) urls.add(url)
    }
  }
  return [...urls].sort()
}

/* --------------------------------------------------------------- headers -- */

function png(b: Buffer): Dimensions | null {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null
  if (b.toString('ascii', 12, 16) !== 'IHDR') return null
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }
}

function gif(b: Buffer): Dimensions | null {
  if (b.length < 10 || b.toString('ascii', 0, 3) !== 'GIF') return null
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) }
}

/** Walks JPEG segments to the first start-of-frame marker. */
function jpeg(b: Buffer): Dimensions | null {
  if (b.length < 4 || b.readUInt16BE(0) !== 0xffd8) return null
  let offset = 2
  while (offset + 9 < b.length) {
    if (b[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = b[offset + 1]
    // SOF0..SOF15, excluding the huffman/arithmetic/restart markers.
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return {
        height: b.readUInt16BE(offset + 5),
        width: b.readUInt16BE(offset + 7),
      }
    }
    offset += 2 + b.readUInt16BE(offset + 2)
  }
  return null
}

function webp(b: Buffer): Dimensions | null {
  if (b.length < 30) return null
  if (b.toString('ascii', 0, 4) !== 'RIFF') return null
  if (b.toString('ascii', 8, 12) !== 'WEBP') return null
  const kind = b.toString('ascii', 12, 16)
  if (kind === 'VP8X') {
    return {
      width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
      height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
    }
  }
  if (kind === 'VP8 ') {
    return {
      width: b.readUInt16LE(26) & 0x3fff,
      height: b.readUInt16LE(28) & 0x3fff,
    }
  }
  if (kind === 'VP8L') {
    const bits = b.readUInt32LE(21)
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >> 14) & 0x3fff),
    }
  }
  return null
}

/**
 * Intrinsic size from an image header, or null when the bytes are not one of
 * the four formats. Exported for `tools/snapshot.ts`, which used to carry its
 * own PNG IHDR reader.
 */
export function readHeader(buffer: Buffer): Dimensions | null {
  return png(buffer) ?? gif(buffer) ?? jpeg(buffer) ?? webp(buffer) ?? null
}

/* ----------------------------------------------------------------- cache -- */

function dimensionsFile(root: string): string {
  return path.join(root, 'app', 'data', 'image-dimensions.json')
}

async function measure(url: string): Promise<Dimensions> {
  // 64KB is past the header of every format here, including JPEGs that carry
  // a large EXIF thumbnail before the first start-of-frame.
  let dims: Dimensions | null = null
  try {
    const response = await fetch(url, { headers: { range: 'bytes=0-65535' } })
    if (response.ok || response.status === 206) {
      dims = readHeader(Buffer.from(await response.arrayBuffer()))
    }
  } catch (error) {
    throw new Error(
      `could not measure ${url} (${(error as Error).message}); ` +
        'falling back to the default',
    )
  }
  if (!dims || dims.width <= 0 || dims.height <= 0) {
    throw new Error(`could not measure ${url}; falling back to the default`)
  }
  return dims
}

export async function loadImageDimensions(
  root: string,
  urls: string[],
): Promise<DimensionMap> {
  const file = dimensionsFile(root)
  const committed: DimensionMap = {}
  try {
    Object.assign(
      committed,
      JSON.parse(await fs.readFile(file, 'utf8')) as DimensionMap,
    )
  } catch {
    // First run.
  }

  await loadCommitted<Dimensions>({
    label: 'image dimensions',
    keys: urls,
    // A wrong box is worse than a guessed one, but not worth failing a build
    // over: `<Img>` falls back to 550x450 and the warning says which image.
    onMiss: 'warn',
    read: async (url) => committed[url] ?? null,
    fetch: measure,
    persist: async (added) => {
      for (const [url, dims] of added) committed[url] = dims
      // Sorted so the committed file does not churn between runs.
      const sorted: DimensionMap = {}
      for (const key of Object.keys(committed).sort()) {
        sorted[key] = committed[key]
      }
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, `${JSON.stringify(sorted, null, 2)}\n`)
    },
  })

  // Every measurement, not just this build's URLs: the map outlives one run.
  return committed
}
