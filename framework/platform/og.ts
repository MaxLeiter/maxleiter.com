import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { createElement, type ReactElement } from 'react'
import type { BuildContext, Post } from '../shared/types'

/**
 * Build-time Open Graph images.
 *
 * Replaces app/opengraph-image.tsx and app/(subpages)/blog/[slug]/
 * opengraph-image.tsx. Two fixes carried over from the design review:
 *
 *  - the per-post route fetched the post source from raw.githubusercontent.com
 *    and regex-scraped its frontmatter, so an unpushed post rendered a 404.
 *    We read from `ctx` and never touch the network.
 *  - both routes declared `size = 1200x600` while rendering 1200x630. The
 *    declared size is what ends up in the `og:image:height` meta tag, so the
 *    tag lied. Everything here is 1200x630.
 *
 * Rendered PNGs are cached in `.cache/og/` keyed by content, so a rebuild that
 * changes no titles or dates does no rendering at all.
 */

const WIDTH = 1200
const HEIGHT = 630
/** Bump to invalidate every cached PNG after a design change. */
const TEMPLATE_VERSION = 1

type ImageResponseCtor = new (
  element: ReactElement,
  options: {
    width: number
    height: number
    fonts: { name: string; data: Buffer; weight: 500 }[]
  },
) => { arrayBuffer: () => Promise<ArrayBuffer> }

/**
 * `@vercel/og`'s Node bundle inlines harfbuzzjs, an Emscripten module that
 * calls `require('fs')` and reads `__dirname` to find `hb.wasm`. Neither is
 * defined under plain ESM, and `hb.wasm` does not live in @vercel/og's own
 * dist directory — it lives in harfbuzzjs, which under pnpm is not hoisted.
 *
 * Node: `globalThis.require` / `globalThis.__dirname` are what the bundle
 * picks up, so pointing `__dirname` at harfbuzzjs is enough.
 *
 * Bun: defines real module-scope `require` and `__dirname` bindings inside the
 * bundle, which shadow the globals, so the shim above is ignored and the
 * lookup still resolves to `<og>/dist/hb.wasm`. Redirecting that one missing
 * read is the only thing that works in both runtimes.
 */
async function loadImageResponse(): Promise<ImageResponseCtor> {
  const require_ = createRequire(import.meta.url)
  const ogEntry = require_.resolve('@vercel/og')

  let hbIndex: string
  try {
    hbIndex = require_.resolve('harfbuzzjs/index.js')
  } catch {
    const satori = createRequire(ogEntry).resolve('satori')
    hbIndex = createRequire(satori).resolve('harfbuzzjs/index.js')
  }
  const hbDir = path.dirname(hbIndex)

  // `NodeJS.Require`, not the global `NodeRequire`: the latter is an alias
  // kept for @types/node before 13.0.x and is marked deprecated.
  const shimmed = globalThis as typeof globalThis & {
    require?: NodeJS.Require
    __dirname?: string
    __filename?: string
  }
  shimmed.require = require_
  shimmed.__dirname = hbDir
  shimmed.__filename = hbIndex

  // `typeof fs.readFileSync` is an overload set, and a single arrow function
  // can never satisfy it: the first overload returns Buffer while the widest
  // one returns `string | Buffer`. Type the replacement against the widest
  // overload and assert at the assignment, which is the only place the
  // overload set matters.
  type ReadFileSync = typeof fs.readFileSync
  const readFileSync = fs.readFileSync
  const patched = (
    file: Parameters<ReadFileSync>[0],
    options?: Parameters<ReadFileSync>[1],
  ): ReturnType<ReadFileSync> => {
    if (
      typeof file === 'string' &&
      /(^|[\\/])hb(-subset)?\.wasm$/.test(file) &&
      !fs.existsSync(file)
    ) {
      return readFileSync(path.join(hbDir, path.basename(file)), options)
    }
    return readFileSync(file, options)
  }
  fs.readFileSync = patched as ReadFileSync

  const mod = (await import('@vercel/og')) as {
    ImageResponse: ImageResponseCtor
  }
  return mod.ImageResponse
}

/** The absolute URL of a post's OG image, or the site card when omitted. */
export function ogImageUrl(ctx: BuildContext, post?: Post): string {
  if (post?.slug) {
    return `${ctx.site.url}/blog/${post.slug}/opengraph-image.png`
  }
  return `${ctx.site.url}/opengraph-image.png`
}

interface Card {
  /** Output path relative to `staticDir`. */
  out: string
  /** Cache key inputs. */
  key: string
  title: string
  date?: string
  /** The homepage card uses one large line; posts use a smaller bold block. */
  home: boolean
}

const chip = {
  fontSize: 25,
  background: 'white',
  color: 'black',
  padding: '4px 10px',
}

function card({ title, date, home }: Card): ReactElement {
  const header = createElement(
    'div',
    {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
        padding: '10px 50px',
      },
    },
    createElement(
      'span',
      { style: { ...chip, fontWeight: 700 } },
      'maxleiter.com',
    ),
    date ? createElement('div', { style: chip }, date) : null,
  )

  const body = createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '0 50px',
        color: 'white',
        textAlign: 'center',
        height: HEIGHT - 50 - 50,
        maxWidth: 1000,
        ...(home ? { fontSize: 100 } : {}),
      },
    },
    home
      ? title
      : createElement(
          'div',
          {
            style: {
              fontSize: 65,
              fontWeight: 900,
              marginBottom: 40,
              lineHeight: 1.1,
            },
          },
          title,
        ),
  )

  return createElement(
    'div',
    {
      style: {
        display: 'flex',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        letterSpacing: '-.02em',
        fontWeight: 700,
        background: '#000',
        flexDirection: 'column',
      },
    },
    header,
    body,
  )
}

function cards(ctx: BuildContext): Card[] {
  const home: Card = {
    out: 'opengraph-image.png',
    key: 'home',
    title: "Max Leiter's Website",
    home: true,
  }
  const posts = ctx.posts
    .filter((post): post is Post & { slug: string } => Boolean(post.slug))
    .map((post) => ({
      out: path.join('blog', post.slug, 'opengraph-image.png'),
      key: post.slug,
      title: post.title,
      date: post.date,
      home: false,
    }))
  return [home, ...posts]
}

export interface OgResult {
  total: number
  rendered: number
  cached: number
  ms: number
}

/** Write every OG PNG into `ctx.staticDir`, rendering only cache misses. */
export async function writeOgImages(ctx: BuildContext): Promise<OgResult> {
  const started = performance.now()
  const cacheDir = path.join(ctx.cacheDir, 'og')
  await fsp.mkdir(cacheDir, { recursive: true })

  const fontPath = path.join(ctx.root, 'app', 'fonts', 'Inter-Medium.ttf')
  let fontData: Buffer | undefined
  let ImageResponse: ImageResponseCtor | undefined

  let rendered = 0
  let cached = 0

  for (const entry of cards(ctx)) {
    const digest = crypto
      .createHash('sha256')
      .update(
        JSON.stringify([
          TEMPLATE_VERSION,
          WIDTH,
          HEIGHT,
          entry.key,
          entry.title,
          entry.date ?? '',
          entry.home,
        ]),
      )
      .digest('hex')
      .slice(0, 16)
    const cachePath = path.join(cacheDir, `${digest}.png`)

    let png: Buffer
    try {
      png = await fsp.readFile(cachePath)
      cached++
    } catch {
      ImageResponse ??= await loadImageResponse()
      fontData ??= await fsp.readFile(fontPath)
      const response = new ImageResponse(card(entry), {
        width: WIDTH,
        height: HEIGHT,
        fonts: [{ name: 'Inter', data: fontData, weight: 500 }],
      })
      png = Buffer.from(await response.arrayBuffer())
      await fsp.writeFile(cachePath, png)
      rendered++
    }

    const out = path.join(ctx.staticDir, entry.out)
    await fsp.mkdir(path.dirname(out), { recursive: true })
    await fsp.writeFile(out, png)
  }

  return {
    total: rendered + cached,
    rendered,
    cached,
    ms: performance.now() - started,
  }
}
