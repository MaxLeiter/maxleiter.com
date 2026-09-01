/**
 * Compare two snapshot directories route by route.
 *
 *   bun run tools/diff-html.ts [baselineDir] [newDir] [--ignore FILE]
 *
 * Defaults: `docs/rewrite/baseline` vs `.cache/snapshot-current`.
 * Reports five diffs per route, in order of how much they matter:
 *
 *   1. head  — tag-for-tag, keyed on `meta[name=...]` / `link[rel=...]`.
 *              This is the SEO contract; any change here is a real change.
 *   2. prose — words that appear in one build and not at all in the other,
 *              counting only running text: `<pre>` is subtracted out.
 *   3. code  — the ordered list of code blocks, per-theme duplicates already
 *              collapsed. Together prose and code are the content gate, and
 *              splitting them is what makes both immune to the fact that the
 *              two builds mark up fences completely differently.
 *   4. text  — line diff of all visible text, code included.
 *   5. html  — structural diff of the normalized markup.
 *
 * `informationalKinds` in the ignore file marks streams that are printed but
 * never fatal; `text` and `html` are marked so during the reimplementation,
 * because the two builds render code blocks and wrappers differently.
 *
 * Exits non-zero when anything not covered by `tools/diff-ignore.json`
 * differs. Runs under bun and node >= 20.
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { diffLines } from 'diff'

export type DiffKind =
  | 'head'
  | 'prose'
  | 'code'
  | 'text'
  | 'html'
  | 'file'
  | 'route'

interface CodeRecordLike {
  blocks: string[]
  occurrences: number[]
}

export interface IgnoreRule {
  /** Human-readable justification. Required: every exception is documented. */
  reason: string
  /** Which diff stream this applies to. Omit for all. */
  kind?: DiffKind
  /** Substring or `re:<pattern>` matched against the route path. Omit for all. */
  routes?: string
  /** Substring or `re:<pattern>` matched against the changed line. */
  pattern: string
}

export interface IgnoreFile {
  rules: IgnoreRule[]
  /** Routes present in one snapshot but not the other, intentionally. */
  allowMissingRoutes?: string[]
  /** Routes added by the new build on purpose, e.g. `/blog/x/embed`. */
  allowNewRoutes?: string[]
  /**
   * Streams that are printed but never fail the run. Use only for a stream
   * whose differences are structural-by-design and covered by a stricter
   * check elsewhere, and say which check in `informationalReasons`.
   */
  informationalKinds?: DiffKind[]
  informationalReasons?: Record<string, string>
}

/** Words: letters only, 4+ characters. Code punctuation is not a word. */
function words(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const w of text.match(/[A-Za-z][A-Za-z'’-]{3,}/g) ?? []) {
    counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  return counts
}

/**
 * Page words minus the words inside <pre>, so the prose stream sees only
 * running text. `code.occurrences` matters: the Next baseline renders every
 * fence twice, so its page text contains each code word twice, and
 * subtracting one copy would leave a phantom behind.
 */
function proseWords(
  text: string,
  code: CodeRecordLike | null,
): Map<string, number> {
  const counts = words(text)
  if (!code) return counts
  code.blocks.forEach((block, i) => {
    const n = code.occurrences[i] ?? 1
    for (const [w, c] of words(block)) {
      const left = (counts.get(w) ?? 0) - c * n
      if (left > 0) counts.set(w, left)
      else counts.delete(w)
    }
  })
  return counts
}

/** Words present in one build and absent from the other. Real content loss. */
function proseChanges(
  baseText: string,
  currText: string,
  baseCode: CodeRecordLike | null,
  currCode: CodeRecordLike | null,
): Change[] {
  const a = proseWords(baseText, baseCode)
  const b = proseWords(currText, currCode)
  const out: Change[] = []
  for (const [w, n] of a) {
    if (!b.has(w)) out.push({ side: '-', line: `${w} (x${n} in baseline)` })
  }
  for (const [w, n] of b) {
    if (!a.has(w)) out.push({ side: '+', line: `${w} (x${n} in new build)` })
  }
  return out
}

/**
 * Compare the ordered list of code blocks. Each build's per-theme duplicates
 * are already collapsed by the normalizer, so this compares the code a reader
 * actually sees. A missing, extra, reordered or edited block fails.
 */
function codeChanges(
  base: CodeRecordLike | null,
  curr: CodeRecordLike | null,
): Change[] {
  const a = base?.blocks ?? []
  const b = curr?.blocks ?? []
  const out: Change[] = []
  if (a.length !== b.length) {
    out.push({ side: '-', line: `${a.length} code blocks in baseline` })
    out.push({ side: '+', line: `${b.length} code blocks in new build` })
  }
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) continue
    const label = `block ${i + 1}`
    if (a[i] === undefined) {
      out.push({ side: '+', line: `${label} added: ${firstLine(b[i])}` })
    } else if (b[i] === undefined) {
      out.push({ side: '-', line: `${label} removed: ${firstLine(a[i])}` })
    } else {
      out.push({ side: '-', line: `${label}: ${firstLine(a[i])}` })
      out.push({ side: '+', line: `${label}: ${firstLine(b[i])}` })
    }
  }
  return out
}

function firstLine(block: string): string {
  const [head = ''] = block.split('\n')
  const rest = block.split('\n').length - 1
  return `${head.slice(0, 90)}${rest > 0 ? ` (+${rest} more lines)` : ''}`
}

interface Matcher {
  test: (value: string) => boolean
}

function matcher(spec: string | undefined): Matcher {
  if (spec === undefined) return { test: () => true }
  if (spec.startsWith('re:')) {
    const re = new RegExp(spec.slice(3))
    return { test: (v) => re.test(v) }
  }
  return { test: (v) => v.includes(spec) }
}

interface CompiledRule {
  rule: IgnoreRule
  routes: Matcher
  pattern: Matcher
  used: number
}

function compile(file: IgnoreFile): CompiledRule[] {
  return file.rules.map((rule) => ({
    rule,
    routes: matcher(rule.routes),
    pattern: matcher(rule.pattern),
    used: 0,
  }))
}

interface Change {
  side: '-' | '+'
  line: string
}

function changedLines(a: string, b: string): Change[] {
  const out: Change[] = []
  for (const part of diffLines(a, b)) {
    if (!part.added && !part.removed) continue
    const side = part.added ? '+' : '-'
    for (const line of part.value.split('\n')) {
      if (line.length === 0) continue
      out.push({ side, line })
    }
  }
  return out
}

function filterIgnored(
  changes: Change[],
  route: string,
  kind: DiffKind,
  rules: CompiledRule[],
): Change[] {
  return changes.filter((c) => {
    for (const r of rules) {
      if (r.rule.kind !== undefined && r.rule.kind !== kind) continue
      if (!r.routes.test(route)) continue
      if (!r.pattern.test(c.line)) continue
      r.used++
      return false
    }
    return true
  })
}

interface HeadTagLike {
  tag: string
  attrs: Record<string, string>
  text?: string
  key: string
}

interface HeadRecordLike {
  title: string | null
  tags: HeadTagLike[]
}

/** One canonical line per head tag, so diffLines pairs them sensibly. */
function headLines(head: HeadRecordLike): string[] {
  return head.tags.map((t) => {
    const attrs = Object.keys(t.attrs)
      .sort()
      .map((k) => `${k}=${JSON.stringify(t.attrs[k])}`)
      .join(' ')
    const text = t.text === undefined ? '' : ` >> ${t.text}`
    return `${t.key} ${attrs}${text}`
  })
}

async function readIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

async function isDir(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

interface RoutesManifest {
  routes: {
    path: string
    kind: string
    dir: string
    status: number
    bytes: number
    sha256: string
    width?: number
    height?: number
    identicalTo?: string
    error?: string
  }[]
  uncovered?: string[]
}

interface RouteReport {
  route: string
  sections: { kind: DiffKind; changes: Change[] }[]
}

const MAX_LINES_PER_SECTION = 40

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = []
  const walk = async (d: string, prefix: string): Promise<void> => {
    const entries = await readdir(d, { withFileTypes: true })
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name
      if (e.isDirectory()) await walk(join(d, e.name), rel)
      else out.push(rel)
    }
  }
  await walk(dir, '')
  return out.sort()
}

export async function diffSnapshots(
  baselineDir: string,
  currentDir: string,
  ignore: IgnoreFile,
): Promise<{
  reports: RouteReport[]
  unusedRules: IgnoreRule[]
  routeIssues: string[]
}> {
  const rules = compile(ignore)
  const routeIssues: string[] = []

  const baseManifestRaw = await readIfExists(join(baselineDir, 'routes.json'))
  if (baseManifestRaw === null) {
    throw new Error(
      `no routes.json in ${baselineDir}; run \`pnpm snapshot\` first`,
    )
  }
  const baseManifest = JSON.parse(baseManifestRaw) as RoutesManifest

  // A missing current snapshot used to degrade into a confusing half-run.
  // Fail loudly instead: an absent snapshot is never something to report on.
  const currManifestRaw = await readIfExists(join(currentDir, 'routes.json'))
  if (currManifestRaw === null) {
    throw new Error(
      `no routes.json in ${currentDir}. Snapshot the build first:\n` +
        '  pnpm gate                     (build, snapshot, then verify)\n' +
        '  bun run tools/snapshot.ts --dir .vercel/output/static ' +
        `--out ${currentDir}`,
    )
  }
  const currManifest = JSON.parse(currManifestRaw) as RoutesManifest

  const allowMissing = (ignore.allowMissingRoutes ?? []).map(matcher)
  const allowNew = (ignore.allowNewRoutes ?? []).map(matcher)

  if (currManifest) {
    const basePaths = new Set(baseManifest.routes.map((r) => r.path))
    const currPaths = new Set(currManifest.routes.map((r) => r.path))
    for (const p of basePaths) {
      if (currPaths.has(p)) continue
      if (allowMissing.some((m) => m.test(p))) continue
      routeIssues.push(`route missing from new build: ${p}`)
    }
    for (const p of currPaths) {
      if (basePaths.has(p)) continue
      if (allowNew.some((m) => m.test(p))) continue
      routeIssues.push(`route added by new build: ${p}`)
    }
    // Pages the build emitted that route discovery never reached. Without
    // this the harness would report a clean run while ignoring them entirely.
    for (const p of currManifest.uncovered ?? []) {
      if (allowNew.some((m) => m.test(p))) continue
      routeIssues.push(`built page not covered by any snapshotted route: ${p}`)
    }
  }

  const reports: RouteReport[] = []

  for (const route of baseManifest.routes) {
    const sections: RouteReport['sections'] = []
    // An embed variant whose baseline output was byte-identical to its
    // canonical route stores no files of its own; diff against the canonical.
    const baseDirName =
      route.identicalTo === undefined
        ? route.dir
        : (baseManifest.routes.find((r) => r.path === route.identicalTo)?.dir ??
          route.dir)
    const baseRouteDir = join(baselineDir, baseDirName)
    const currRoute = currManifest?.routes.find((r) => r.path === route.path)
    const currDirName =
      currRoute?.identicalTo === undefined
        ? route.dir
        : (currManifest?.routes.find((r) => r.path === currRoute.identicalTo)
            ?.dir ?? route.dir)
    const currRouteDir = join(currentDir, currDirName)

    if (route.kind === 'binary') {
      const curr = currManifest?.routes.find((r) => r.path === route.path)
      const a = `bytes=${route.bytes} ${route.width}x${route.height}\n`
      const b = curr
        ? `bytes=${curr.bytes} ${curr.width}x${curr.height}\n`
        : 'MISSING\n'
      // Byte size legitimately changes; dimensions must not.
      const aDims = `${route.width}x${route.height}\n`
      const bDims = curr ? `${curr.width}x${curr.height}\n` : 'MISSING\n'
      const changes = filterIgnored(
        changedLines(aDims, bDims),
        route.path,
        'file',
        rules,
      )
      if (changes.length > 0) sections.push({ kind: 'file', changes })
      if (a !== b) {
        process.stdout.write(
          `  note ${route.path}: ${a.trim()} -> ${b.trim()}\n`,
        )
      }
      if (sections.length > 0) reports.push({ route: route.path, sections })
      continue
    }

    if (route.kind === 'file') {
      if (!(await isDir(currRouteDir))) {
        if (!allowMissing.some((m) => m.test(route.path))) {
          routeIssues.push(`file route missing from new build: ${route.path}`)
        }
        continue
      }
      for (const name of await listFiles(baseRouteDir)) {
        const a = (await readIfExists(join(baseRouteDir, name))) ?? ''
        const b = (await readIfExists(join(currRouteDir, name))) ?? ''
        const changes = filterIgnored(
          changedLines(a, b),
          route.path,
          'file',
          rules,
        )
        if (changes.length > 0) sections.push({ kind: 'file', changes })
      }
      if (sections.length > 0) reports.push({ route: route.path, sections })
      continue
    }

    // page / embed
    const baseHead = await readIfExists(join(baseRouteDir, 'head.json'))
    const currHead = await readIfExists(join(currRouteDir, 'head.json'))
    if (baseHead !== null) {
      if (currHead === null) {
        if (!allowMissing.some((m) => m.test(route.path))) {
          routeIssues.push(`page missing from new build: ${route.path}`)
        }
        continue
      }
      const a = `${headLines(JSON.parse(baseHead) as HeadRecordLike).join('\n')}\n`
      const b = `${headLines(JSON.parse(currHead) as HeadRecordLike).join('\n')}\n`
      const changes = filterIgnored(
        changedLines(a, b),
        route.path,
        'head',
        rules,
      )
      if (changes.length > 0) sections.push({ kind: 'head', changes })
    }

    const baseCodeRaw = await readIfExists(join(baseRouteDir, 'code.json'))
    const currCodeRaw = await readIfExists(join(currRouteDir, 'code.json'))
    const baseCode =
      baseCodeRaw === null ? null : (JSON.parse(baseCodeRaw) as CodeRecordLike)
    const currCode =
      currCodeRaw === null ? null : (JSON.parse(currCodeRaw) as CodeRecordLike)

    if (baseCode !== null || currCode !== null) {
      const changes = filterIgnored(
        codeChanges(baseCode, currCode),
        route.path,
        'code',
        rules,
      )
      if (changes.length > 0) sections.push({ kind: 'code', changes })
    }

    const baseText = await readIfExists(join(baseRouteDir, 'text.txt'))
    const currText = await readIfExists(join(currRouteDir, 'text.txt'))
    if (baseText !== null && currText !== null) {
      const changes = filterIgnored(
        changedLines(baseText, currText),
        route.path,
        'text',
        rules,
      )
      if (changes.length > 0) sections.push({ kind: 'text', changes })

      const prose = filterIgnored(
        proseChanges(baseText, currText, baseCode, currCode),
        route.path,
        'prose',
        rules,
      )
      if (prose.length > 0) sections.push({ kind: 'prose', changes: prose })
    }

    const baseHtml = await readIfExists(join(baseRouteDir, 'index.html'))
    const currHtml = await readIfExists(join(currRouteDir, 'index.html'))
    if (baseHtml !== null && currHtml !== null) {
      const changes = filterIgnored(
        changedLines(baseHtml, currHtml),
        route.path,
        'html',
        rules,
      )
      if (changes.length > 0) sections.push({ kind: 'html', changes })
    }

    if (sections.length > 0) reports.push({ route: route.path, sections })
  }

  const unusedRules = rules.filter((r) => r.used === 0).map((r) => r.rule)
  return { reports, unusedRules, routeIssues }
}

function printReports(reports: RouteReport[], info: Set<DiffKind>): void {
  for (const report of reports) {
    process.stdout.write(`\n=== ${report.route}\n`)
    for (const section of report.sections) {
      const tag = info.has(section.kind) ? ' [informational]' : ''
      process.stdout.write(
        `--- ${section.kind}${tag} (${section.changes.length} lines)\n`,
      )
      for (const c of section.changes.slice(0, MAX_LINES_PER_SECTION)) {
        process.stdout.write(`${c.side} ${c.line}\n`)
      }
      if (section.changes.length > MAX_LINES_PER_SECTION) {
        process.stdout.write(
          `  ... ${section.changes.length - MAX_LINES_PER_SECTION} more lines\n`,
        )
      }
    }
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const positional: string[] = []
  let ignorePath = 'tools/diff-ignore.json'
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--ignore') ignorePath = argv[++i] ?? ignorePath
    else if (argv[i] === '--help' || argv[i] === '-h') {
      process.stdout.write(
        'usage: diff-html.ts [baselineDir] [newDir] [--ignore FILE]\n',
      )
      process.exit(0)
    } else positional.push(argv[i])
  }

  const baselineDir = resolve(positional[0] ?? 'docs/rewrite/baseline')
  const currentDir = resolve(positional[1] ?? '.cache/snapshot-current')

  const ignoreRaw = await readIfExists(resolve(ignorePath))
  const ignore: IgnoreFile =
    ignoreRaw === null ? { rules: [] } : (JSON.parse(ignoreRaw) as IgnoreFile)

  // Print each snapshot's source and capture time. A snapshot left over from
  // an earlier build otherwise compares silently and reports phantom diffs.
  const describe = async (dir: string): Promise<string> => {
    const raw = await readIfExists(join(dir, 'routes.json'))
    if (raw === null) return 'NOT SNAPSHOTTED'
    const m = JSON.parse(raw) as { base?: string; generatedAt?: string }
    return `${m.base ?? '?'} @ ${m.generatedAt ?? '?'}`
  }
  process.stdout.write(
    `baseline: ${baselineDir}\n          ${await describe(baselineDir)}\n` +
      `current:  ${currentDir}\n          ${await describe(currentDir)}\n`,
  )

  const { reports, unusedRules, routeIssues } = await diffSnapshots(
    baselineDir,
    currentDir,
    ignore,
  )

  const info = new Set<DiffKind>(ignore.informationalKinds ?? [])

  printReports(reports, info)

  for (const issue of routeIssues) process.stdout.write(`\nROUTE: ${issue}\n`)

  if (unusedRules.length > 0) {
    process.stdout.write('\nunused ignore rules (stale, consider deleting):\n')
    for (const r of unusedRules)
      process.stdout.write(`  ${r.pattern} — ${r.reason}\n`)
  }

  let blocking = 0
  let informational = 0
  const blockingRoutes = new Set<string>()
  for (const r of reports) {
    for (const s of r.sections) {
      if (info.has(s.kind)) informational += s.changes.length
      else {
        blocking += s.changes.length
        blockingRoutes.add(r.route)
      }
    }
  }

  if (info.size > 0) {
    process.stdout.write('\ninformational streams (printed, never fatal):\n')
    for (const k of info) {
      const why = ignore.informationalReasons?.[k] ?? 'no reason recorded'
      process.stdout.write(`  ${k}: ${why}\n`)
    }
  }

  process.stdout.write(
    `\n${reports.length} routes with diffs. ` +
      `blocking: ${blocking} lines across ${blockingRoutes.size} routes. ` +
      `informational: ${informational} lines. ` +
      `route issues: ${routeIssues.length}.\n`,
  )
  if (blocking > 0 || routeIssues.length > 0) process.exitCode = 1
  else process.stdout.write('OK: no unexpected differences\n')
}

const entry = process.argv[1] ?? ''
if (entry.endsWith('diff-html.ts') || entry.endsWith('diff-html.js')) {
  await main()
}
