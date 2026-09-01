// Node launcher for the bespoke build. Vercel runs this (see vercel.json);
// locally `bun run build.ts` is the fast path and produces identical output.
// esbuild bundles build.ts so path aliases, .tsx and extension-less imports
// all work under plain Node regardless of version or flags.
import { build } from 'esbuild'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const outfile = path.join(root, '.cache', 'build', 'build.mjs')

await mkdir(path.dirname(outfile), { recursive: true })
await build({
  entryPoints: [path.join(root, 'build.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
  // build.ts is JSX-free today, but anything it reaches may not be, and
  // several icon modules under app/ are .js files containing JSX.
  jsx: 'automatic',
  loader: { '.js': 'jsx' },
  absWorkingDir: root,
  tsconfig: path.join(root, 'tsconfig.json'),
  logLevel: 'warning',
})

await import(pathToFileURL(outfile).href)
