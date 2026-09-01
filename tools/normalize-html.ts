/**
 * Normalize HTML for snapshot diffing.
 *
 * Parses with parse5 (a real HTML5 parser, not regexes) and produces a
 * build-tool-agnostic representation: framework plumbing removed, content
 * hashes masked, attributes sorted, whitespace collapsed, one node per line.
 *
 * Runs unchanged under bun and node >= 20 (ESM, no runtime-specific APIs).
 */

import { createHash } from 'node:crypto'
import { parse } from 'parse5'
import type { DefaultTreeAdapterTypes } from 'parse5'

type P5Node = DefaultTreeAdapterTypes.Node
type P5Element = DefaultTreeAdapterTypes.Element
type P5ParentNode = DefaultTreeAdapterTypes.ParentNode
type P5TextNode = DefaultTreeAdapterTypes.TextNode

export interface HeadTag {
  /** Lower-cased tag name: meta, link, title, style, script, base. */
  tag: string
  /** Normalized attributes, keys sorted. */
  attrs: Record<string, string>
  /** Text content, for <title> only. */
  text?: string
  /**
   * Stable identity used to pair tags across two snapshots, e.g.
   * `meta[name=description]`, `link[rel=canonical]`, `title`.
   */
  key: string
}

export interface HeadRecord {
  title: string | null
  /** Every head tag in document order. The authoritative diff target. */
  tags: HeadTag[]
  meta: Record<string, string>[]
  link: Record<string, string>[]
  /** <style>/<script>/<base>: kept so nothing is silently dropped. */
  other: HeadTag[]
}

export interface ViewTransitionRecord {
  /** Path from <html>, e.g. `html>body>div:nth-child(3)>main>article`. */
  selector: string
  tag: string
  name?: string
  update?: string
  share?: string
  /** Trimmed first 60 chars of the element's text, to help re-identify it. */
  sample?: string
}

/**
 * The code blocks on a page, in document order.
 *
 * `blocks[i]` is the whitespace-normalized text of one <pre>. Runs of
 * consecutive identical blocks are collapsed into a single entry and counted
 * in `occurrences[i]`, because the Next baseline renders every fence twice,
 * once per shiki theme, with one copy hidden by CSS. shiki in the bespoke
 * build emits it once, so `occurrences` is how the two builds are made
 * comparable without pretending a real duplicate never existed.
 *
 * `occurrences` also lets a consumer subtract code words from the page text
 * exactly, which is how the prose comparison excludes code.
 */
export interface CodeRecord {
  blocks: string[]
  occurrences: number[]
}

export interface NormalizeResult {
  html: string
  head: HeadRecord
  text: string
  code: CodeRecord
  /** Concatenated contents of every <style>, in document order. */
  css: string
  viewTransitions: ViewTransitionRecord[]
}

/**
 * Attributes removed everywhere. `vt-*` are recorded in the sidecar first.
 * `data-precedence`/`data-href` are React's stylesheet bookkeeping.
 */
const DROPPED_ATTRS = new Set([
  'vt-name',
  'vt-update',
  'vt-share',
  'data-precedence',
  'data-href',
  'data-reactroot',
  'nonce',
])

const DROPPED_ATTR_PREFIXES = ['data-nextjs-']

/** Content-hash maskers, applied in order to every URL-ish attribute value. */
export const URL_RULES: { re: RegExp; to: string }[] = [
  // /_next/static/media/Geist_Variable-s.p.03oq.woff2
  {
    re: /(\/_next\/static\/(?:media|chunks|css)\/)[^/?#"'\s]+/g,
    to: '$1<hash>',
  },
  // /_next/static/<buildId>/_ssgManifest.js
  { re: /(\/_next\/static\/)[A-Za-z0-9_-]{8,}(\/)/g, to: '$1<buildid>$2' },
  // Next appends a route-hash suffix to metadata image segments.
  { re: /opengraph-image-[A-Za-z0-9]+/g, to: 'opengraph-image' },
  { re: /twitter-image-[A-Za-z0-9]+/g, to: 'twitter-image' },
  // ...and a cache-busting query to the same URLs, and to the favicon.
  { re: /(opengraph-image|twitter-image)\?[^"'\s]+/g, to: '$1' },
  // The bespoke build emits these as real files, so the URL gains a `.png`.
  // Masking the extension pairs the two builds' images up, which keeps the
  // 1200x630 dimension check alive on all 24 of them. The rename itself is
  // an intended platform change, tracked outside the diff.
  { re: /(opengraph-image|twitter-image)\.png/g, to: '$1' },
  { re: /(\/favicon\.ico)\?[^"'\s]+/g, to: '$1' },
  // Bespoke build: /_assets/runtime.3f9a1b2c.js
  {
    re: /(\/_assets\/[A-Za-z0-9._-]*?)\.[a-f0-9]{8}(\.[a-z0-9]+)/g,
    to: '$1.<hash>$2',
  },
]

/** Attributes whose values get URL masking. */
const URL_ATTRS = new Set([
  'href',
  'src',
  'srcset',
  'content',
  'data-href',
  'action',
])

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

/** Text inside these is preserved byte-for-byte. */
const RAW_TEXT_TAGS = new Set(['pre', 'textarea'])

/** Contribute a line break when extracting visible text. */
const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'br',
  'button',
  'details',
  'div',
  'dd',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'td',
  'th',
  'tr',
  'ul',
])

const NON_TEXT_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'svg',
])

const CSS_MODULE_CLASS = /^[A-Za-z0-9]{6,8}_[A-Za-z][A-Za-z0-9_-]*$/

function isElement(node: P5Node): node is P5Element {
  return 'tagName' in node
}

function isText(node: P5Node): node is P5TextNode {
  return node.nodeName === '#text'
}

function isParent(node: P5Node): node is P5ParentNode {
  return 'childNodes' in node
}

function children(node: P5Node): P5Node[] {
  return isParent(node) ? (node.childNodes as P5Node[]) : []
}

function attrOf(el: P5Element, name: string): string | undefined {
  return el.attrs.find((a) => a.name === name)?.value
}

function textOf(node: P5Node): string {
  if (isText(node)) return node.value
  return children(node).map(textOf).join('')
}

export function maskUrl(value: string): string {
  let out = value
  for (const rule of URL_RULES) out = out.replace(rule.re, rule.to)
  return out
}

/**
 * Rewrite CSS-module hashed class tokens (`XKrDjq_variable`) to
 * `<cssmod>_variable`. Always: the hash changes on every build, so leaving it
 * in would make every snapshot differ from the last for no reason.
 */
function maskClassList(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((c) =>
      CSS_MODULE_CLASS.test(c)
        ? `<cssmod>_${c.split('_').slice(1).join('_')}`
        : c,
    )
    .join(' ')
}

function shouldDropAttr(name: string): boolean {
  if (DROPPED_ATTRS.has(name)) return true
  return DROPPED_ATTR_PREFIXES.some((p) => name.startsWith(p))
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
}

function selectorFor(path: { tag: string; index: number }[]): string {
  return path
    .map((p) => (p.index === 0 ? p.tag : `${p.tag}:nth-child(${p.index + 1})`))
    .join('>')
}

interface WalkState {
  css: string[]
  vts: ViewTransitionRecord[]
}

/** True when this <script> is Next.js plumbing rather than app code. */
function isFrameworkScript(el: P5Element): boolean {
  const src = attrOf(el, 'src')
  if (src && src.includes('/_next/')) return true
  const body = textOf(el)
  return body.includes('self.__next_f') || body.includes('__next_')
}

/** True when this <link> is a Next.js asset preload. */
function isFrameworkPreload(el: P5Element): boolean {
  const rel = (attrOf(el, 'rel') ?? '').toLowerCase()
  if (rel !== 'preload' && rel !== 'modulepreload' && rel !== 'prefetch')
    return false
  return (attrOf(el, 'href') ?? '').includes('/_next/')
}

function normalizeAttrs(el: P5Element): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = []
  for (const attr of el.attrs) {
    const name = attr.name.toLowerCase()
    if (shouldDropAttr(name)) continue
    let value = attr.value
    if (URL_ATTRS.has(name)) value = maskUrl(value)
    if (name === 'class') value = maskClassList(value)
    if (name === 'style') value = value.replace(/\s+/g, ' ').trim()
    else value = value.replace(/[\t\n\r]+/g, ' ')
    out.push({ name, value })
  }
  out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  return out
}

function recordViewTransition(
  el: P5Element,
  path: { tag: string; index: number }[],
  state: WalkState,
): void {
  const name = attrOf(el, 'vt-name')
  const update = attrOf(el, 'vt-update')
  const share = attrOf(el, 'vt-share')
  if (name === undefined && update === undefined && share === undefined) return
  const sample = textOf(el).replace(/\s+/g, ' ').trim().slice(0, 60)
  state.vts.push({
    selector: selectorFor(path),
    tag: el.tagName,
    ...(name === undefined ? {} : { name }),
    ...(update === undefined ? {} : { update }),
    ...(share === undefined ? {} : { share }),
    ...(sample ? { sample } : {}),
  })
}

function printNode(
  node: P5Node,
  depth: number,
  path: { tag: string; index: number }[],
  state: WalkState,
  lines: string[],
): void {
  const pad = '  '.repeat(depth)

  if (node.nodeName === '#comment') return

  if (node.nodeName === '#documentType') {
    lines.push('<!doctype html>')
    return
  }

  if (isText(node)) {
    const collapsed = node.value.replace(/\s+/g, ' ').trim()
    if (collapsed) lines.push(`${pad}${collapsed}`)
    return
  }

  if (!isElement(node)) {
    for (const child of children(node))
      printNode(child, depth, path, state, lines)
    return
  }

  const tag = node.tagName.toLowerCase()

  if (tag === 'script' && isFrameworkScript(node)) return
  if (tag === 'link' && isFrameworkPreload(node)) return

  recordViewTransition(node, path, state)

  if (tag === 'style') {
    state.css.push(textOf(node))
    const attrs = normalizeAttrs(node)
    const rendered = attrs
      .map((a) => ` ${a.name}="${escapeAttr(a.value)}"`)
      .join('')
    lines.push(`${pad}<style${rendered}>`)
    lines.push(`${pad}  /* css */`)
    lines.push(`${pad}</style>`)
    return
  }

  const attrs = normalizeAttrs(node)
  const rendered = attrs
    .map((a) => ` ${a.name}="${escapeAttr(a.value)}"`)
    .join('')

  if (VOID_TAGS.has(tag)) {
    lines.push(`${pad}<${tag}${rendered}>`)
    return
  }

  lines.push(`${pad}<${tag}${rendered}>`)

  if (RAW_TEXT_TAGS.has(tag)) {
    const raw = textOf(node)
    for (const line of raw.split('\n')) lines.push(`${pad}  ${line}`)
    lines.push(`${pad}</${tag}>`)
    return
  }

  const kids = children(node)
  let elementIndex = 0
  for (const child of kids) {
    if (isElement(child)) {
      printNode(
        child,
        depth + 1,
        [...path, { tag: child.tagName.toLowerCase(), index: elementIndex }],
        state,
        lines,
      )
      elementIndex++
    } else {
      printNode(child, depth + 1, path, state, lines)
    }
  }

  lines.push(`${pad}</${tag}>`)
}

function headKey(tag: string, attrs: Record<string, string>): string {
  if (tag === 'meta') {
    if (attrs.name !== undefined) return `meta[name=${attrs.name}]`
    if (attrs.property !== undefined) return `meta[property=${attrs.property}]`
    if (attrs.charset !== undefined) return 'meta[charset]'
    if (attrs['http-equiv'] !== undefined)
      return `meta[http-equiv=${attrs['http-equiv']}]`
    return 'meta[?]'
  }
  if (tag === 'link') {
    const rel = attrs.rel ?? '?'
    const sizes = attrs.sizes ? `,sizes=${attrs.sizes}` : ''
    return `link[rel=${rel}${sizes}]`
  }
  return tag
}

function extractHead(doc: P5Node): HeadRecord {
  const record: HeadRecord = {
    title: null,
    tags: [],
    meta: [],
    link: [],
    other: [],
  }

  const findHead = (node: P5Node): P5Element | null => {
    if (isElement(node) && node.tagName.toLowerCase() === 'head') return node
    for (const child of children(node)) {
      const found = findHead(child)
      if (found) return found
    }
    return null
  }

  const head = findHead(doc)
  if (!head) return record

  for (const child of children(head)) {
    if (!isElement(child)) continue
    const tag = child.tagName.toLowerCase()
    if (tag === 'script' && isFrameworkScript(child)) continue
    if (tag === 'link' && isFrameworkPreload(child)) continue

    const attrs: Record<string, string> = {}
    for (const a of normalizeAttrs(child)) attrs[a.name] = a.value

    if (tag === 'title') {
      const text = textOf(child).replace(/\s+/g, ' ').trim()
      record.title = text
      record.tags.push({ tag, attrs, text, key: 'title' })
      continue
    }

    const entry: HeadTag = { tag, attrs, key: headKey(tag, attrs) }
    if (tag === 'meta') {
      record.meta.push(attrs)
      record.tags.push(entry)
    } else if (tag === 'link') {
      record.link.push(attrs)
      record.tags.push(entry)
    } else {
      // <style>/<script>/<base>: a fingerprint, never the body.
      //
      // The inline stylesheet is deliberately NOT sized or hashed: it is
      // regenerated wholesale by a different toolchain, and its byte count
      // drifts whenever any scanned source file changes, which would bury a
      // real head diff under 71 routes of noise. Its content lives in the
      // per-route styles.css sidecar in the raw cache.
      //
      // Inline scripts DO get a content hash: the theme, clock and embed
      // scripts are behaviour, and a silent change to one must show up.
      const body = textOf(child).replace(/\s+/g, ' ').trim()
      const text =
        tag === 'style'
          ? '(inline css)'
          : body
            ? `sha256:${createHash('sha256').update(body).digest('hex').slice(0, 12)}`
            : ''
      record.other.push({ ...entry, text })
      record.tags.push({ ...entry, text })
    }
  }

  return record
}

/**
 * A server-rendered island shell that is hidden until its module mounts:
 * `<div data-island="palette" hidden>`. Its markup is a fallback, not page
 * content, so it counts as neither prose nor code.
 */
function isInertIslandShell(el: P5Element): boolean {
  let hidden = false
  let island = false
  for (const a of el.attrs) {
    const name = a.name.toLowerCase()
    if (name === 'hidden') hidden = true
    else if (name === 'data-island') island = true
  }
  return hidden && island
}

function extractText(node: P5Node, out: string[]): void {
  if (isText(node)) {
    out.push(node.value)
    return
  }
  if (isElement(node)) {
    const tag = node.tagName.toLowerCase()
    if (NON_TEXT_TAGS.has(tag)) return
    // Skip inert island shells: the bespoke build server-renders the command
    // palette into every page as `<div data-island hidden>` so Cmd+K can
    // reveal it before the module loads, and its nav labels are text no
    // reader sees. Deliberately NOT keyed on `hidden` alone — Next streams
    // Suspense content through `<div hidden>` buffers that a script then
    // relocates into the page, and that content IS visible. Excluding those
    // hid the whole react-tweet card from the baseline.
    if (isInertIslandShell(node)) return
    const block = BLOCK_TAGS.has(tag)
    if (block) out.push('\n')
    // <pre> is NOT flattened with textOf() here. The two builds structure code
    // blocks differently: bright wraps each line in a <div>, shiki emits
    // <span class="line"> plus real newline text nodes. Concatenating
    // descendants with no separator glued bright's lines together, producing
    // fake tokens like `page.tsxexport` that then read as content loss.
    // Recursing instead lets BLOCK_TAGS put a newline after each <div>.
    for (const child of children(node)) extractText(child, out)
    if (block) out.push('\n')
    return
  }
  for (const child of children(node)) extractText(child, out)
}

/** Collapse a code block's text: trim each line, drop blank lines. */
function tidyCode(raw: string): string {
  return raw
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0)
    .join('\n')
}

/** Every <pre> on the page, in document order, runs of duplicates collapsed. */
function extractCode(node: P5Node): CodeRecord {
  const found: string[] = []

  const walk = (n: P5Node): void => {
    if (isElement(n)) {
      const tag = n.tagName.toLowerCase()
      if (NON_TEXT_TAGS.has(tag)) return
      // Same rule as extractText: an inert island shell is not on the page.
      if (isInertIslandShell(n)) return
      if (tag === 'pre') {
        const parts: string[] = []
        extractText(n, parts)
        const tidied = tidyCode(parts.join(''))
        if (tidied) found.push(tidied)
        return
      }
    }
    for (const child of children(n)) walk(child)
  }
  walk(node)

  const blocks: string[] = []
  const occurrences: number[] = []
  for (const block of found) {
    if (blocks.length > 0 && blocks[blocks.length - 1] === block) {
      occurrences[occurrences.length - 1]++
    } else {
      blocks.push(block)
      occurrences.push(1)
    }
  }
  return { blocks, occurrences }
}

function findBody(node: P5Node): P5Node | null {
  if (isElement(node) && node.tagName.toLowerCase() === 'body') return node
  for (const child of children(node)) {
    const found = findBody(child)
    if (found) return found
  }
  return null
}

export function normalizeHtml(raw: string): NormalizeResult {
  const doc = parse(raw)
  const state: WalkState = { css: [], vts: [] }

  const head = extractHead(doc)

  // `path` always includes the node itself, so selectors start at <html>.
  const lines: string[] = []
  let rootIndex = 0
  for (const child of children(doc)) {
    const path = isElement(child)
      ? [{ tag: child.tagName.toLowerCase(), index: rootIndex++ }]
      : []
    printNode(child, 0, path, state, lines)
  }

  const body = findBody(doc) ?? doc
  const textParts: string[] = []
  extractText(body, textParts)
  const text = textParts
    .join('')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')

  return {
    html: `${lines.join('\n')}\n`,
    head,
    text: `${text}\n`,
    code: extractCode(body),
    css: state.css.join('\n/* --- */\n'),
    viewTransitions: state.vts,
  }
}
