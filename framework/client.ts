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
}

/**
 * Each island gets a generated entry that owns the hydration call. That keeps
 * preact out of `runtime.ts`, which stays framework-free and ~1KB.
 *
 * `preact/compat/client` exports `createRoot` and `hydrateRoot`, not `hydrate`;
 * `hydrate` lives on `preact/compat`. Using `hydrateRoot` also keeps the entry
 * valid if the alias is ever pointed back at `react-dom/client`.
 */
async function writeIslandEntries(
  cacheDir: string,
  islandsDir: string,
  names: string[],
): Promise<{ name: string; entry: string }[]> {
  const dir = path.join(cacheDir, 'islands')
  await fs.mkdir(dir, { recursive: true })
  const entries: { name: string; entry: string }[] = []

  for (const name of names) {
    const source = await findIslandSource(islandsDir, name)
    if (!source) continue
    const entry = path.join(dir, `${name}.tsx`)
    const importPath = path
      .relative(dir, source)
      .split(path.sep)
      .join('/')
      .replace(/\.tsx?$/, '')
    await fs.writeFile(
      entry,
      [
        "import { hydrateRoot } from 'preact/compat/client'",
        `import Component from '${importPath}'`,
        '',
        'export default function mount(el, props) {',
        '  hydrateRoot(el, <Component {...(props ?? {})} />)',
        '}',
        '',
      ].join('\n'),
    )
    entries.push({ name, entry })
  }

  return entries
}

/** `app/islands/<name>.tsx`, or `app/islands/<name>/index.tsx` for a folder. */
async function findIslandSource(
  islandsDir: string,
  name: string,
): Promise<string | null> {
  const candidates: string[] = []
  for (const ext of ['.tsx', '.ts', '.jsx', '.js']) {
    candidates.push(path.join(islandsDir, `${name}${ext}`))
    candidates.push(path.join(islandsDir, name, `index${ext}`))
  }
  for (const candidate of candidates) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      // Try the next candidate.
    }
  }
  return null
}

export async function buildClient(options: {
  root: string
  staticDir: string
  cacheDir: string
  /** Island names collected while rendering. Missing modules are skipped. */
  islands: string[]
}): Promise<ClientResult> {
  const { root, staticDir, cacheDir, islands } = options
  const outdir = path.join(staticDir, '_assets')
  await fs.mkdir(outdir, { recursive: true })

  const islandEntries = await writeIslandEntries(
    cacheDir,
    path.join(root, 'app', 'islands'),
    islands,
  )

  const entryPoints: Record<string, string> = {
    runtime: path.join(root, 'framework', 'client', 'runtime.ts'),
  }
  for (const { name, entry } of islandEntries) {
    entryPoints[`island.${name}`] = entry
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

  return { assets, islands: islandUrls, outputs }
}
