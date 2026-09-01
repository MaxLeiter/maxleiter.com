import fs from 'node:fs/promises'
import path from 'node:path'
import {
  getTransformedRoutes,
  normalizeRoutes,
  type Route,
} from '@vercel/routing-utils'
import { IMAGE_QUALITY, IMAGE_WIDTHS } from '../render/images'
import {
  ASSET_PREFIX,
  EMBED_SECTIONS,
  IMMUTABLE_CACHE_CONTROL,
  REDIRECTS,
} from '../shared/routing'
import type { BuildContext } from '../shared/types'

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
    redirects: REDIRECTS.map((redirect) => ({ ...redirect, permanent: true })),
    headers: [
      {
        source: `${ASSET_PREFIX}(.*)`,
        headers: [{ key: 'cache-control', value: IMMUTABLE_CACHE_CONTROL }],
      },
    ],
  })

  if (error) {
    throw new Error(`getTransformedRoutes: ${error.message}`)
  }
  return routes ?? []
}

function buildRoutes(): Route[] {
  const routes: Route[] = [
    ...baseRoutes(),
    // Back-compat: /blog/<slug>?embed=true used to render the embed variant
    // inline. It is now its own page, so rewrite the old links onto it.
    ...EMBED_SECTIONS.map((section) => ({
      src: `^/${section}/([^/]+)$`,
      has: [{ type: 'query' as const, key: 'embed' }],
      dest: `/${section}/$1/embed`,
      continue: false,
    })),
    // getTransformedRoutes only emits this marker when `rewrites` is passed.
    { handle: 'filesystem' },
    // A missing hashed asset must not inherit the immutable header above, or
    // a bad deploy poisons every CDN edge for a year.
    {
      src: `^${ASSET_PREFIX}.+`,
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

function buildConfig(): Record<string, unknown> {
  return {
    version: 3,
    routes: buildRoutes(),
    images: {
      sizes: [...IMAGE_WIDTHS],
      domains: [],
      qualities: [IMAGE_QUALITY],
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
 * `installCommand` is pinned on purpose. The Vercel project dashboard carries
 * a bare `pnpm install` override, which makes Vercel pick the OLDEST pnpm in
 * the container, pnpm 6 (report 03 section 8.7), and locally hits a broken
 * corepack shim. A per-deployment value here beats the dashboard setting, and
 * `npx pnpm@<exact>` works identically in the build image and on a laptop.
 *
 * `--prod=false` is load-bearing since the cutover. The site is static output,
 * so nothing is a runtime dependency and every package the build needs sits in
 * devDependencies; pnpm reads `NODE_ENV=production` as an implicit `--prod`,
 * which would install none of them.
 */
const VERCEL_JSON = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  framework: null,
  installCommand:
    'npx --yes pnpm@9.15.9 install --frozen-lockfile --prod=false',
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
