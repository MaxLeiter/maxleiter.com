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
  /** The base sheet: every rule a page without the desktop can need. */
  css: string
  /**
   * Utilities only the desktop's sources mint, as a fragment build.ts gates
   * on the homepage's markup. Measured at 7.3 KB raw / 1.1 KB gz that every
   * content page was carrying for markup only `/` renders.
   */
  desktop: string
  tailwindBytes: number
}

/**
 * The sources whose utilities belong to the desktop fragment rather than the
 * base sheet. Everything here renders only on the homepage: the window
 * manager, its chrome, and the icon grid. `window-toolbar` is NOT here,
 * because every page renders it -- and neither is `app/lib/window-styles.ts`,
 * which looks desktop-only but is where that toolbar's class strings live:
 * excluding it shipped every content page a toolbar with no height or
 * padding.
 */
const DESKTOP_SOURCES = [
  'app/islands/desktop.tsx',
  'app/islands/desktop',
  'app/components/static/desktop-icons.tsx',
]

function tailwindBin(root: string): string {
  const require_ = createRequire(path.join(root, 'package.json'))
  const pkg = require_.resolve('@tailwindcss/cli/package.json')
  return path.join(path.dirname(pkg), 'dist', 'index.mjs')
}

/**
 * Only the framework stages that emit markup. Tailwind mints a utility for any
 * source token that names one, comments and object keys included: esbuild's
 * `{ filter: /.../ }` in assets/ is `.filter`, "the build container" is
 * `.container`, and each rides in the base sheet on every page.
 */
const FRAMEWORK_MARKUP_SOURCES = ['render', 'client', 'shared']

/**
 * Tailwind is invoked on a generated entry rather than on `global.css` itself,
 * so the `@source` globs can point at `app/` and the framework's markup stages
 * without editing a file the Next build still reads.
 *
 * The entry sits in a directory of its own. Tailwind 4 adds the input file's
 * own directory as an automatic source root, so an entry written straight into
 * `.cache/` made the stylesheet depend on which bundles happened to be cached
 * there: a cold build and a warm build produced different utility sets.
 */
async function writeTailwindEntry(
  root: string,
  cacheDir: string,
  name: string,
  excluded: readonly string[],
) {
  const entryDir = path.join(cacheDir, 'tailwind-src')
  const entry = path.join(entryDir, name)
  await fs.mkdir(entryDir, { recursive: true })
  const rel = (...parts: string[]) =>
    path
      .relative(entryDir, path.join(root, ...parts))
      .split(path.sep)
      .join('/')
  await fs.writeFile(
    entry,
    [
      `@import '${rel('app', 'styles', 'global.css')}';`,
      `@source '${rel('app')}';`,
      ...FRAMEWORK_MARKUP_SOURCES.map(
        (dir) => `@source '${rel('framework', dir)}';`,
      ),
      ...excluded.map((source) => `@source not '${rel(source)}';`),
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

  // Two passes: the full sheet, and the sheet with the desktop's sources
  // excluded. The atoms the slim pass lacks are exactly the desktop-only
  // rules, and `splitCss` extracts them from the FULL sheet so both halves
  // keep the full sheet's cascade order.
  const build = async (name: string, excluded: readonly string[]) => {
    const entry = await writeTailwindEntry(root, cacheDir, name, excluded)
    const output = path.join(cacheDir, `${name.replace(/\.css$/, '')}-out.css`)
    await run(
      process.execPath,
      [tailwindBin(root), '--input', entry, '--output', output, '--minify'],
      { cwd: root },
    )
    return fs.readFile(output, 'utf8')
  }

  const [full, slim] = await Promise.all([
    build('input.css', []),
    build('input-slim.css', DESKTOP_SOURCES),
  ])

  const { base, extra } = splitCss(full, slim)
  return { css: base, desktop: extra, tailwindBytes: Buffer.byteLength(base) }
}

/* ------------------------------------------------- splitting the sheet -- */

/**
 * Splits the full sheet into the atoms the slim sheet also has (`base`) and
 * the ones it lacks (`extra`), both in the full sheet's order.
 *
 * An atom is one declaration or statement plus the headers above it -- e.g.
 * `@layer utilities > @media (min-width:120rem) > .3xl\:p-8 > padding:2rem` --
 * matched by text. Matching atoms rather than blocks is what makes this
 * robust against the two ways the slim output diverges structurally: shared
 * `:root` theme variables sit in ONE block whose body differs, and utilities
 * regroup under repeated `@supports`/`@media` wrappers when their neighbors
 * disappear. Block-level pairing mis-splits both; path text survives both.
 */
interface CssNode {
  /** Selector or at-rule prelude. Empty for a bare statement. */
  header: string
  /** Block body, undefined for a statement like `@layer a,b;`. */
  body?: string
}

/** One declaration or statement, with the headers above it. */
interface Atom {
  /** Identity for matching: trail, header and text, NUL-joined. */
  key: string
  trail: string[]
  /** Selector (for a declaration) or the statement's own text. */
  header: string
  /** The declaration, or null for a statement like `@layer a,b;`. */
  decl: string | null
}

function splitCss(full: string, slim: string): { base: string; extra: string } {
  const available = new Map<string, number>()
  for (const atom of atomize(slim)) {
    available.set(atom.key, (available.get(atom.key) ?? 0) + 1)
  }

  const base = new Emitter()
  const extra = new Emitter()
  for (const atom of atomize(full)) {
    const count = available.get(atom.key) ?? 0
    if (count > 0) {
      available.set(atom.key, count - 1)
      base.add(atom)
    } else {
      extra.add(atom)
    }
  }
  return { base: base.finish(), extra: extra.finish() }
}

function atomize(css: string): Atom[] {
  const atoms: Atom[] = []
  const walk = (nodes: CssNode[], trail: string[]): void => {
    for (const node of nodes) {
      if (node.body === undefined) {
        atoms.push({
          key: [...trail, node.header].join('\0'),
          trail,
          header: node.header,
          decl: null,
        })
      } else if (node.body.includes('{')) {
        walk(parseNodes(node.body), [...trail, node.header])
      } else {
        // Grouped selectors are split apart: the minifier merges
        // `.bg-\(--bg\)` (desktop shorthand) and `.bg-\[var\(--bg\)\]`
        // (shared) into ONE rule in the full sheet only, so matching whole
        // headers would classify the shared class as desktop-only and strip
        // it from every content page. `.a,.b{d}` is exactly `.a{d}.b{d}`.
        const selectors = node.header.startsWith('@')
          ? [node.header]
          : splitSelectors(node.header)
        for (const selector of selectors) {
          for (const decl of splitDeclarations(node.body)) {
            atoms.push({
              key: [...trail, selector, decl].join('\0'),
              trail,
              header: selector,
              decl,
            })
          }
        }
      }
    }
  }
  walk(parseNodes(css), [])
  return atoms
}

/**
 * Reassembles atoms into CSS, opening and closing headers as the context
 * path changes between consecutive atoms.
 */
class Emitter {
  private out = ''
  private path: string[] = []

  private closeTo(next: string[]): void {
    let shared = 0
    while (
      shared < this.path.length &&
      shared < next.length &&
      this.path[shared] === next[shared]
    ) {
      shared++
    }
    this.out += '}'.repeat(this.path.length - shared)
    for (const segment of next.slice(shared)) this.out += `${segment}{`
    this.path = next
  }

  add(atom: Atom): void {
    if (atom.decl === null) {
      // A bare statement (`@layer a,b;`) sits directly in its trail.
      this.closeTo(atom.trail)
      this.out += atom.header
      return
    }
    this.closeTo([...atom.trail, atom.header])
    this.out += `${atom.decl};`
  }

  finish(): string {
    this.out += '}'.repeat(this.path.length)
    this.path = []
    return this.out
  }
}

/** Top-level nodes of one (minified) block body or sheet. */
function parseNodes(css: string): CssNode[] {
  const nodes: CssNode[] = []
  let i = 0
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i++
    if (i >= css.length) break
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2)
      i = end === -1 ? css.length : end + 2
      continue
    }
    const start = i
    let depth = 0
    let quote = ''
    for (; i < css.length; i++) {
      const ch = css[i]
      if (quote) {
        if (ch === '\\') i++
        else if (ch === quote) quote = ''
        continue
      }
      if (ch === '"' || ch === "'") quote = ch
      else if (ch === '\\') i++
      else if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          const open = css.indexOf('{', start)
          nodes.push({
            header: css.slice(start, open).trim(),
            body: css.slice(open + 1, i),
          })
          i++
          break
        }
      } else if (ch === ';' && depth === 0) {
        nodes.push({ header: '', body: undefined })
        // Statements keep their text in `header` for atom identity.
        nodes[nodes.length - 1].header = css.slice(start, i + 1).trim()
        i++
        break
      }
    }
    if (i >= css.length && depth !== 0) {
      throw new Error('unbalanced braces in tailwind output')
    }
    if (i >= css.length && start < css.length && depth === 0) {
      const tail = css.slice(start).trim()
      if (tail) nodes.push({ header: tail, body: undefined })
      break
    }
  }
  return nodes
}

/** Selector groups split on `,` outside quotes, parens and brackets. */
function splitSelectors(header: string): string[] {
  const parts: string[] = []
  let start = 0
  let depth = 0
  let quote = ''
  for (let i = 0; i < header.length; i++) {
    const ch = header[i]
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === '\\') i++
    else if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    else if (ch === ',' && depth === 0) {
      parts.push(header.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(header.slice(start).trim())
  return parts.filter(Boolean)
}

/** Declarations of one leaf body, split on `;` outside quotes and parens. */
function splitDeclarations(body: string): string[] {
  const decls: string[] = []
  let start = 0
  let depth = 0
  let quote = ''
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === '\\') i++
    else if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ';' && depth === 0) {
      const decl = body.slice(start, i).trim()
      if (decl) decls.push(decl)
      start = i + 1
    }
  }
  const last = body.slice(start).trim()
  if (last) decls.push(last)
  return decls
}
