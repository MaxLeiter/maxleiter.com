import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

/**
 * The base stylesheet, inlined into every `<head>`: the Tailwind build over
 * `app/styles/`.
 *
 * Feature-specific slices (the tweet card, the shot grid, the file tree, the
 * Minecraft inventory, the diff table, the shiki rules) are composed on top per
 * page by `build.ts`, which only appends the ones that page's markup actually
 * references.
 *
 * Inlining costs no render-blocking request, which is the right trade for a
 * site whose typical visit is a single page arriving from search.
 */

export interface CssResult {
  css: string
  tailwindBytes: number
}

function tailwindBin(root: string): string {
  const require_ = createRequire(path.join(root, 'package.json'))
  const pkg = require_.resolve('@tailwindcss/cli/package.json')
  return path.join(path.dirname(pkg), 'dist', 'index.mjs')
}

/**
 * Tailwind is invoked on a generated entry rather than on `global.css` itself,
 * so the `@source` globs can point at `app/` and `framework/` without editing
 * a file the Next build still reads.
 *
 * The entry sits in a directory of its own. Tailwind 4 adds the input file's
 * own directory as an automatic source root, so an entry written straight into
 * `.cache/` made the stylesheet depend on which bundles happened to be cached
 * there: a cold build and a warm build produced different utility sets.
 */
async function writeTailwindEntry(root: string, cacheDir: string) {
  const entryDir = path.join(cacheDir, 'tailwind-src')
  const entry = path.join(entryDir, 'input.css')
  await fs.mkdir(entryDir, { recursive: true })
  const rel = (...parts: string[]) =>
    path
      .relative(entryDir, path.join(root, ...parts))
      .split(path.sep)
      .join('/')
  const globalCss = rel('app', 'styles', 'global.css')
  const appDir = rel('app')
  const frameworkDir = rel('framework')
  await fs.writeFile(
    entry,
    [
      `@import '${globalCss}';`,
      `@source '${appDir}';`,
      `@source '${frameworkDir}';`,
      '',
    ].join('\n'),
  )
  return entry
}

export async function buildCss(options: {
  root: string
  cacheDir: string
}): Promise<CssResult> {
  const { root, cacheDir } = options
  const entry = await writeTailwindEntry(root, cacheDir)
  const output = path.join(cacheDir, 'tailwind-output.css')

  await run(
    process.execPath,
    [tailwindBin(root), '--input', entry, '--output', output, '--minify'],
    { cwd: root },
  )
  const tailwind = await fs.readFile(output, 'utf8')

  return { css: tailwind, tailwindBytes: Buffer.byteLength(tailwind) }
}
