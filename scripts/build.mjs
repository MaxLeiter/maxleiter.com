// Node launcher for the bespoke build. Vercel runs this (see vercel.json);
// locally `bun run build.ts` is the fast path and produces identical output.
// esbuild bundles build.ts so path aliases, .tsx and extension-less imports
// all work under plain Node regardless of version or flags.
import { build } from 'esbuild'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const outfile = path.join(root, '.cache', 'build', 'build.mjs')

// The same node/ESM settings build.ts uses for the server bundle. Read as data
// rather than imported from a helper: this file is plain JS run straight by
// node, so importing a .ts factory would need the type stripping it exists to
// avoid. build.ts is JSX-free today, but anything it reaches may not be.
const shared = JSON.parse(
  await readFile(path.join(root, 'framework', 'assets', 'node-bundle.json'), 'utf8'),
)

await mkdir(path.dirname(outfile), { recursive: true })
await build({
  ...shared,
  entryPoints: [path.join(root, 'build.ts')],
  outfile,
  absWorkingDir: root,
  tsconfig: path.join(root, 'tsconfig.json'),
  logLevel: 'warning',
})

await import(pathToFileURL(outfile).href)
