import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { decodeEntities } from '../shared/html'

const run = promisify(execFile)

/**
 * The stylesheet: `buildCss` runs Tailwind over `app/styles/`, which emits
 * every utility the sources so much as name, and the rest of this file cuts
 * that down to what the rendered output uses (`pruneCss`) and splits off what
 * only one page can use (`subtractCss`). `build.ts` holds the output they
 * are measured against.
 */

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
  await fs.writeFile(
    entry,
    [
      `@import '${rel('app', 'styles', 'global.css')}';`,
      `@source '${rel('app')}';`,
      `@source '${rel('framework')}';`,
      '',
    ].join('\n'),
  )
  return entry
}

export async function buildCss(options: {
  root: string
  cacheDir: string
}): Promise<string> {
  const { root, cacheDir } = options
  const entry = await writeTailwindEntry(root, cacheDir)
  const output = path.join(cacheDir, 'input-out.css')
  await run(
    process.execPath,
    [tailwindBin(root), '--input', entry, '--output', output, '--minify'],
    { cwd: root },
  )
  return fs.readFile(output, 'utf8')
}

/* ---------------------------------------------- subtracting a sheet -- */

interface CssNode {
  /** Selector or at-rule prelude. Empty for a bare statement. */
  header: string
  /** Block body, undefined for a statement like `@layer a,b;`. */
  body?: string
}

/**
 * One declaration or statement plus the headers above it -- e.g.
 * `@layer utilities > @media (min-width:120rem) > .3xl\:p-8 > padding:2rem` --
 * matched by text. Subtracting atoms rather than blocks is what survives a
 * part that differs from the whole inside a block: a grouped selector that
 * lost one member, a `:root` block that lost one variable.
 */
interface Atom {
  /** Identity for matching: trail, header and text, NUL-joined. */
  key: string
  trail: string[]
  /** Selector (for a declaration) or the statement's own text. */
  header: string
  /** The declaration, or null for a statement like `@layer a,b;`. */
  decl: string | null
}

/**
 * The atoms of `whole` that `part` lacks, in `whole`'s order, so they keep
 * their place in the cascade. `part` is `whole` with rules deleted, which is
 * what `pruneCss` produces.
 */
export function subtractCss(whole: string, part: string): string {
  const available = new Map<string, number>()
  for (const atom of atomize(part)) {
    available.set(atom.key, (available.get(atom.key) ?? 0) + 1)
  }
  return emit(
    atomize(whole).filter((atom) => {
      const count = available.get(atom.key) ?? 0
      if (count === 0) return true
      available.set(atom.key, count - 1)
      return false
    }),
  )
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
        // Grouped selectors are split apart: a part can keep one member of a
        // group, and matching whole headers would then subtract the member
        // it kept. `.a,.b{d}` is exactly `.a{d}.b{d}`.
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
function emit(atoms: readonly Atom[]): string {
  let out = ''
  let open: string[] = []
  const moveTo = (next: string[]): void => {
    let shared = 0
    while (
      shared < open.length &&
      shared < next.length &&
      open[shared] === next[shared]
    ) {
      shared++
    }
    out += '}'.repeat(open.length - shared)
    for (const segment of next.slice(shared)) out += `${segment}{`
    open = next
  }
  for (const atom of atoms) {
    if (atom.decl === null) {
      // A bare statement (`@layer a,b;`) sits directly in its trail.
      moveTo(atom.trail)
      out += atom.header
    } else {
      moveTo([...atom.trail, atom.header])
      out += `${atom.decl};`
    }
  }
  return out + '}'.repeat(open.length)
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
    let closed = false
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
          closed = true
          break
        }
      } else if (ch === ';' && depth === 0) {
        nodes.push({ header: '', body: undefined })
        // Statements keep their text in `header` for atom identity.
        nodes[nodes.length - 1].header = css.slice(start, i + 1).trim()
        i++
        closed = true
        break
      }
    }
    // Checked by flag, not by `i` reaching the end: a node that closes on the
    // last character leaves `i` there too, and testing `i` would push it a
    // second time as a statement.
    if (closed) continue
    if (depth !== 0) throw new Error('unbalanced braces in tailwind output')
    const tail = css.slice(start).trim()
    if (tail) nodes.push({ header: tail, body: undefined })
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

/* -------------------------------------------------- pruning the sheet -- */

/** What the build's output can use: classes, and custom properties it names. */
export interface Used {
  classes: ReadonlySet<string>
  variables: ReadonlySet<string>
}

/**
 * Every class the build can put on an element, and every custom property its
 * markup and scripts name.
 *
 * Markup is only one source of classes. Island `data-props` carry classes an
 * island applies at runtime and no markup has (the shot grid's `trigger`), and
 * the client bundles' string literals are every class an island or the router
 * can add. Splitting script text on quotes and whitespace yields a superset of
 * those literals, which errs toward keeping a rule, never toward dropping one.
 * Variables are read the same way from anywhere in a body or a script: an
 * inline `style` or a `getPropertyValue` reads a property no sheet does.
 */
export function usedNames(sources: {
  bodies: readonly string[]
  scripts: readonly string[]
}): Used {
  const classes = new Set<string>()
  const variables = new Set<string>()
  const add = (text: string) => {
    for (const token of text.split(/[\s"'`]+/)) if (token) classes.add(token)
  }
  const name = (text: string) => {
    for (const [variable] of text.matchAll(/--[\w-]+/g)) variables.add(variable)
  }
  for (const body of sources.bodies) {
    for (const [, value] of body.matchAll(
      /\s(?:class|data-props)="([^"]*)"/g,
    )) {
      add(decodeEntities(value))
    }
    name(body)
  }
  for (const script of sources.scripts) {
    add(script)
    name(script)
  }
  return { classes, variables }
}

/** `\33 xl\:p-8` -> `3xl:p-8`. */
function unescapeCss(name: string): string {
  return name.replace(/\\(?:([0-9a-fA-F]{1,6}) ?|(.))/g, (_, hex, ch) =>
    hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : ch,
  )
}

/**
 * The classes a selector cannot match without. Anything inside parentheses or
 * brackets is skipped: `:not(.a)` matches more when `.a` is absent,
 * `:is(.a,.b)` needs only one of the two, and `[title=".a"]` is no class.
 */
function requiredClasses(selector: string): string[] {
  let outside = ''
  let depth = 0
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i]
    if (ch === '\\') {
      if (depth === 0) outside += selector.slice(i, i + 2)
      i++
    } else if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    else if (depth === 0) outside += ch
  }
  return [...outside.matchAll(/\.((?:\\[0-9a-fA-F]{1,6} ?|\\.|[\w-])+)/g)].map(
    ([, name]) => unescapeCss(name),
  )
}

/** Predicates for `filterRules`; an omitted one keeps everything. */
interface Keep {
  selector?: (selector: string) => boolean
  declaration?: (declaration: string) => boolean
  /** A leaf at-rule such as `@property --tw-blur`. */
  atRule?: (header: string) => boolean
}

/**
 * The sheet with every selector, declaration and leaf at-rule `keep` rejects
 * removed, and every block left empty removed with it. Only ever deletes:
 * grouped selectors stay grouped and untouched rules stay byte-identical,
 * where splitting into atoms and reassembling would ungroup `.a,.b{}`.
 */
function filterRules(css: string, keep: Keep): string {
  let out = ''
  for (const node of parseNodes(css)) {
    if (node.body === undefined) {
      out += node.header
    } else if (node.header.startsWith('@keyframes')) {
      // `0%` and `to` are not element selectors.
      out += `${node.header}{${node.body}}`
    } else if (node.body.includes('{')) {
      const inner = filterRules(node.body, keep)
      if (inner) out += `${node.header}{${inner}}`
    } else {
      const { selector = () => true, declaration = () => true } = keep
      const header = node.header.startsWith('@')
        ? (keep.atRule?.(node.header) ?? true) && node.header
        : splitSelectors(node.header).filter(selector).join(',')
      const body = splitDeclarations(node.body).filter(declaration)
      if (header && body.length > 0) out += `${header}{${body.join(';')}}`
    }
  }
  return out
}

/**
 * Drops every selector that needs a class the output never uses, then every
 * custom property that no remaining rule in ANY of the sheets reads and the
 * output never names.
 *
 * The sheets are pruned together because a variable crosses sheets: the
 * desktop fragment's shadow utilities read `@property` rules that live in the
 * base sheet, and dropping a registration changes the variable's initial
 * value and whether it inherits.
 */
export function pruneCss(
  sheets: Record<string, string>,
  used: Used,
): { sheets: Record<string, string>; dropped: Record<string, string[]> } {
  const names = Object.keys(sheets)
  const out = { ...sheets }
  // Per sheet: the classes its selectors needed, then its dead variables.
  const lost: Record<string, Set<string>> = {}
  for (const name of names) {
    lost[name] = new Set()
    out[name] = filterRules(sheets[name], {
      selector: (selector) => {
        const needed = requiredClasses(selector).filter(
          (c) => !used.classes.has(c),
        )
        for (const c of needed) lost[name].add(c)
        return needed.length === 0
      },
    })
  }

  // To a fixed point: `--a: var(--b)` keeps `--b` alive until `--a` goes.
  for (let changed = true; changed;) {
    changed = false
    const read = new Set(used.variables)
    for (const name of names) {
      for (const [, v] of out[name].matchAll(/var\((--[\w-]+)/g)) read.add(v)
    }
    for (const name of names) {
      const live = (variable: string | undefined) => {
        if (variable === undefined || read.has(variable)) return true
        lost[name].add(variable)
        return false
      }
      const next = filterRules(out[name], {
        declaration: (decl) => live(decl.match(/^(--[\w-]+)\s*:/)?.[1]),
        atRule: (header) =>
          !header.startsWith('@property ') ||
          live(header.slice('@property '.length).trim()),
      })
      if (next !== out[name]) {
        out[name] = next
        changed = true
      }
    }
  }

  const dropped: Record<string, string[]> = {}
  for (const name of names) {
    if (lost[name].size > 0) dropped[name] = [...lost[name]].sort()
  }
  return { sheets: out, dropped }
}
