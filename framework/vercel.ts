import fs from 'node:fs/promises'
import path from 'node:path'
import {
  getTransformedRoutes,
  normalizeRoutes,
  type Route,
} from '@vercel/routing-utils'
import type { BuildContext } from './types'

/**
 * `.vercel/output/config.json` and the root `vercel.json`.
 *
 * Build Output API v3. Routes are generated with @vercel/routing-utils rather
 * than hand-written, because the helper is the same code the platform runs:
 * it sets `continue: true` on header routes (without which a match terminates
 * routing and serves an empty 200) and emits the exact 308 shapes for
 * `trailingSlash: false`.
 *
 * We do NOT use `cleanUrls` / `overrides`: pages are emitted as
 * `blog/<slug>/index.html` directories, which the filesystem handler serves
 * at `/blog/<slug>` on its own.
 */

const IMMUTABLE = 'public, max-age=31536000, immutable'

/** Must stay in sync with IMAGE_WIDTHS in framework/images.tsx. */
const IMAGE_SIZES = [640, 828, 1200, 1920]
const IMAGE_QUALITIES = [75]

/**
 * `hostname` and `pathname` here are REGULAR EXPRESSIONS, not the glob
 * wildcards next.config.mjs uses. Copying the Next block verbatim silently
 * matches nothing and every image 400s.
 */
const REMOTE_PATTERNS = [
  {
    protocol: 'https' as const,
    hostname: '^tddeuevmbjbaaeoi\\.public\\.blob\\.vercel-storage\\.com$',
    port: '',
    pathname: '^/blog/.*$',
  },
]

/**
 * Without this the endpoint is an open resizer for any path on the domain.
 * `search` is deliberately unconstrained: the MDX image convention encodes
 * intrinsic dimensions as `?w=`/`?h=` on the source URL.
 */
const LOCAL_PATTERNS = [{ pathname: '^/(mc|_assets|favicons)/.*$' }]

function baseRoutes(): Route[] {
  const { routes, error } = getTransformedRoutes({
    trailingSlash: false,
    redirects: [
      { source: '/X11', destination: '/blog/X11', permanent: true },
      { source: '/atom', destination: '/feed.xml', permanent: true },
      { source: '/feed', destination: '/feed.xml', permanent: true },
      { source: '/rss', destination: '/feed.xml', permanent: true },
    ],
    headers: [
      {
        source: '/_assets/(.*)',
        headers: [{ key: 'cache-control', value: IMMUTABLE }],
      },
    ],
  })

  if (error) {
    throw new Error(`getTransformedRoutes: ${error.message}`)
  }
  return routes ?? []
}

export function buildRoutes(): Route[] {
  const routes: Route[] = [
    ...baseRoutes(),
    // Back-compat: /blog/<slug>?embed=true used to render the embed variant
    // inline. It is now its own page, so rewrite the old links onto it.
    {
      src: '^/blog/([^/]+)$',
      has: [{ type: 'query', key: 'embed' }],
      dest: '/blog/$1/embed',
      continue: false,
    },
    {
      src: '^/notes/([^/]+)$',
      has: [{ type: 'query', key: 'embed' }],
      dest: '/notes/$1/embed',
      continue: false,
    },
    // getTransformedRoutes only emits this marker when `rewrites` is passed.
    { handle: 'filesystem' },
    // A missing hashed asset must not inherit the immutable header above, or
    // a bad deploy poisons every CDN edge for a year.
    {
      src: '^/_assets/.+',
      status: 404,
      headers: { 'cache-control': 'no-store' },
      continue: false,
    },
    { handle: 'error' },
    // `dest` is the URL, not the file: static/404/index.html serves at /404.
    { src: '/.*', dest: '/404', status: 404 },
  ]

  const { error } = normalizeRoutes(routes)
  if (error) {
    const detail = error.errors?.join('\n') ?? error.message
    throw new Error(`Invalid Vercel routes:\n${detail}`)
  }
  return routes
}

export function buildConfig(): Record<string, unknown> {
  return {
    version: 3,
    routes: buildRoutes(),
    images: {
      sizes: IMAGE_SIZES,
      domains: [],
      qualities: IMAGE_QUALITIES,
      formats: ['image/avif', 'image/webp'],
      minimumCacheTTL: 31536000,
      remotePatterns: REMOTE_PATTERNS,
      localPatterns: LOCAL_PATTERNS,
    },
    cache: ['node_modules/**', '.cache/**'],
    framework: { version: '0.1.0' },
  }
}

/**
 * The project config stays minimal: one route table in config.json is much
 * easier to reason about than two interleaved ones.
 *
 * `scripts/build.mjs` is a plain-JS launcher that esbuild-bundles build.ts
 * into .cache/ and runs it, so the build does not depend on `bun` being on
 * PATH in the build container, nor on Node's TypeScript stripping, which
 * cannot handle the .tsx files in the graph. `bun run build.ts` stays the
 * local dev path. Node 24 is pinned through `engines` in package.json.
 *
 * There is deliberately no `installCommand`. Overriding it with a bare
 * `pnpm install` makes Vercel pick the OLDEST pnpm in the container, which is
 * pnpm 6 (report 03 section 8.7). Left on auto-detect, `lockfileVersion: 9.0`
 * in pnpm-lock.yaml selects pnpm 9 or 10.
 */
const VERCEL_JSON = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  framework: null,
  buildCommand: 'node scripts/build.mjs',
}

export interface VercelResult {
  routes: number
  ms: number
}

/** Write `.vercel/output/config.json` and the root `vercel.json`. */
export async function writeVercelConfig(
  ctx: BuildContext,
): Promise<VercelResult> {
  const started = performance.now()
  const config = buildConfig()

  await fs.mkdir(ctx.outDir, { recursive: true })
  await fs.writeFile(
    path.join(ctx.outDir, 'config.json'),
    `${JSON.stringify(config, null, 2)}\n`,
  )
  await fs.writeFile(
    path.join(ctx.root, 'vercel.json'),
    `${JSON.stringify(VERCEL_JSON, null, 2)}\n`,
  )

  return {
    routes: (config.routes as Route[]).length,
    ms: performance.now() - started,
  }
}

export default writeVercelConfig
