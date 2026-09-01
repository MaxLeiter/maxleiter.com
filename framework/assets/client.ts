import fs from 'node:fs/promises'
import path from 'node:path'
import * as esbuild from 'esbuild'

/**
 * Client bundles: the runtime, plus one module per island that a page actually
 * rendered.
 *
 * `react` and `react-dom` alias to `preact/compat`, which the spike measured at
 * 7,274 B brotli against React's 52,066 B for the same source. React stays the
 * build-time renderer, so authoring and types are unchanged.
 *
 * `splitting: true` emits preact once as a shared chunk instead of duplicating
 * it per island.
 */

export interface ClientResult {
  /** Logical name -> hashed public URL. Always carries `runtime.js`. */
  assets: Record<string, string>
  /** Island name -> hashed public URL, for the page's `__islands` JSON. */
  islands: Record<string, string>
  /** Per-output byte counts, for the build report. */
  outputs: { file: string; bytes: number }[]
  /**
   * The runtime's source with chunk imports made absolute, for inlining into
   * every page as a module. An external module script in `<head>` makes
   * Chrome skip inbound cross-document view transitions; an inline one does
   * not (see `ShellOptions.runtime`).
   */
  runtime: string
}

/**
 * Each island gets a generated entry that owns the hydration call. That keeps
 * preact out of `runtime.ts`, which stays framework-free and ~1KB.
 *
 * The entry is virtual: esbuild resolves `island:<name>` into this namespace
 * and the source is built in memory, with `resolveDir` pointing at
 * `app/islands/` so the relative import of the component resolves the way it
 * would from a real file there. This used to write four ~437-byte `.tsx` files
 * into `.cache/islands/` on every build, behind a probe over eight candidate
 * paths per island of which six had never matched anything.
 *
 * `preact/compat/client` exports `createRoot` and `hydrateRoot`, not `hydrate`;
 * `hydrate` lives on `preact/compat`. Using `hydrateRoot` also keeps the entry
 * valid if the alias is ever pointed back at `react-dom/client`.
 */
const ISLAND_NAMESPACE = 'island-entry'

function islandEntryPlugin(islandsDir: string): esbuild.Plugin {
  return {
    name: ISLAND_NAMESPACE,
    setup(build) {
      build.onResolve({ filter: /^island:/ }, (args) => ({
        path: args.path.slice('island:'.length),
        namespace: ISLAND_NAMESPACE,
      }))
      build.onLoad({ filter: /.*/, namespace: ISLAND_NAMESPACE }, (args) => ({
        contents: [
          "import { hydrateRoot } from 'preact/compat/client'",
          `import Component from './${args.path}'`,
          '',
          '// Returns its own teardown: the router unmounts every island',
          '// before it replaces the body, so listeners an island registered',
          '// on window or document do not accumulate one set per navigation.',
          'export default function mount(el, props) {',
          '  const root = hydrateRoot(el, <Component {...(props ?? {})} />)',
          '  return () => root.unmount()',
          '}',
        ].join('\n'),
        resolveDir: islandsDir,
        loader: 'tsx',
      }))
    },
  }
}

export async function buildClient(options: {
  root: string
  staticDir: string
  /**
   * Island names collected while rendering. Each must exist as
   * `app/islands/<name>.tsx`; a missing one fails the build rather than
   * silently shipping a page whose island never mounts.
   */
  islands: string[]
}): Promise<ClientResult> {
  const { root, staticDir, islands } = options
  const outdir = path.join(staticDir, '_assets')
  await fs.mkdir(outdir, { recursive: true })

  const entryPoints: Record<string, string> = {
    runtime: path.join(root, 'framework', 'client', 'runtime.ts'),
  }
  for (const name of islands) {
    entryPoints[`island.${name}`] = `island:${name}`
  }

  const result = await esbuild.build({
    entryPoints,
    bundle: true,
    splitting: true,
    minify: true,
    format: 'esm',
    target: ['chrome111', 'edge111', 'firefox111', 'safari16.4'],
    outdir,
    entryNames: '[name].[hash]',
    chunkNames: 'chunk.[hash]',
    metafile: true,
    write: true,
    jsx: 'automatic',
    jsxImportSource: 'preact',
    loader: { '.js': 'jsx' },
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/client': 'preact/compat/client',
    },
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [islandEntryPlugin(path.join(root, 'app', 'islands'))],
    absWorkingDir: root,
    logLevel: 'silent',
  })

  const assets: Record<string, string> = {}
  const islandUrls: Record<string, string> = {}
  const outputs: { file: string; bytes: number }[] = []

  for (const [file, meta] of Object.entries(result.metafile.outputs)) {
    const base = path.basename(file)
    outputs.push({ file: base, bytes: meta.bytes })
    if (!meta.entryPoint) continue
    // `runtime.3f9a.js` -> `runtime`, `island.palette.3f9a.js` -> `palette`.
    const logical = base.replace(/\.[A-Z0-9]+\.js$/i, '')
    const url = `/_assets/${base}`
    if (logical === 'runtime') {
      assets['runtime.js'] = url
    } else if (logical.startsWith('island.')) {
      islandUrls[logical.slice('island.'.length)] = url
    }
  }

  // Inline modules resolve relative specifiers against the page URL, so the
  // shared-chunk imports esbuild wrote as `./chunk.X.js` become absolute.
  const runtimeFile = assets['runtime.js']
  const runtime = runtimeFile
    ? (
        await fs.readFile(path.join(outdir, path.basename(runtimeFile)), 'utf8')
      ).replace(/(["'])\.\/(chunk\.[A-Z0-9]+\.js)\1/g, '$1/_assets/$2$1')
    : ''

  return { assets, islands: islandUrls, outputs, runtime }
}
