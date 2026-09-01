import { bundledLanguages, createHighlighter, type Highlighter } from 'shiki'
import { transformerStyleToClass } from '@shikijs/transformers'

/**
 * Dual-theme syntax highlighting, reproducing bright's output shape.
 *
 * bright@1.0.0 rendered BOTH themes into the markup and let CSS pick one via
 * `lightSelector: '[data-theme="light"]'`. shiki does the same with
 * `defaultColor: false`, which emits `--s-light` / `--s-dark` custom properties
 * instead of a resolved color. `transformerStyleToClass` moves those inline
 * styles into shared classes: 47% smaller markup for one shared rule block
 * (design 2.4).
 *
 * hast is walked by hand here. `unist-util-visit` is a transitive dependency
 * that pnpm does not hoist, and the server bundle keeps `packages: 'external'`,
 * so importing it would resolve at type-check time and fail at run time.
 */

interface HastText {
  type: 'text'
  value: string
}

interface HastElement {
  type: 'element'
  tagName: string
  properties?: Record<string, unknown>
  children: HastNode[]
}

interface HastRoot {
  type: 'root'
  children: HastNode[]
}

type HastNode = HastRoot | HastElement | HastText | { type: string }

const LIGHT_THEME = 'material-theme-palenight'
const DARK_THEME = 'solarized-dark'

/** Where a fence tag is a label rather than a grammar (```sidebar, ...). */
const FALLBACK_LANG = 'text'

/** The rules that switch between the two themes embedded in every block. */
const THEME_RULES = `
pre.shiki,
pre.shiki span {
  color: var(--s-dark);
  background-color: var(--s-dark-bg);
  font-style: var(--s-dark-font-style, inherit);
  font-weight: var(--s-dark-font-weight, inherit);
  text-decoration: var(--s-dark-text-decoration, inherit);
}
[data-theme='light'] pre.shiki,
[data-theme='light'] pre.shiki span {
  color: var(--s-light);
  background-color: var(--s-light-bg);
  font-style: var(--s-light-font-style, inherit);
  font-weight: var(--s-light-font-weight, inherit);
  text-decoration: var(--s-light-text-decoration, inherit);
}
`.trim()

let highlighterPromise: Promise<Highlighter> | null = null

/**
 * One highlighter for the whole build. Loading every bundled grammar costs
 * seconds, so the caller passes the fence tags it actually saw.
 */
export function getHighlighter(langs: string[]): Promise<Highlighter> {
  if (!highlighterPromise) {
    const known = langs.filter((lang) => lang in bundledLanguages)
    highlighterPromise = createHighlighter({
      themes: [LIGHT_THEME, DARK_THEME],
      langs: [...new Set([...known, FALLBACK_LANG])],
    })
  }
  return highlighterPromise
}

/** Fence tags appearing in the given sources. */
export function collectLanguages(sources: string[]): string[] {
  const found = new Set<string>()
  for (const source of sources) {
    for (const match of source.matchAll(/^```([a-zA-Z0-9_+#-]+)/gm)) {
      found.add(match[1].toLowerCase())
    }
  }
  return [...found]
}

function isElement(node: HastNode): node is HastElement {
  return node.type === 'element'
}

function childElement(node: HastElement, tagName: string): HastElement | null {
  for (const child of node.children) {
    if (isElement(child) && child.tagName === tagName) return child
  }
  return null
}

function langOf(node: HastElement): string {
  const code = childElement(node, 'code')
  if (!code) return FALLBACK_LANG
  const classes = code.properties?.className
  const list = Array.isArray(classes) ? classes.map(String) : []
  const found = list.find((name) => name.startsWith('language-'))
  return found ? found.slice('language-'.length).toLowerCase() : FALLBACK_LANG
}

function textOf(node: HastNode): string {
  if (node.type === 'text') return (node as HastText).value
  if ('children' in node && Array.isArray((node as HastRoot).children)) {
    return (node as HastRoot).children.map(textOf).join('')
  }
  return ''
}

/**
 * Class names are `cyrb53` hashes of the style string, so a fresh transformer
 * per file still mints identical names for identical styles. That is what lets
 * a file's rules be cached next to its compiled JS and replayed on a cache hit
 * without re-running shiki.
 */
const rules = new Set<string>()

export function collectHighlightCss(css: string): void {
  for (const rule of css.split('}')) {
    const trimmed = rule.trim()
    if (trimmed) rules.add(`${trimmed}}`)
  }
}

export interface HighlightPass {
  /** The rehype plugin for one file's compile. */
  plugin: () => (tree: HastRoot) => void
  /** The rules this file needed, for the cache entry. */
  css: () => string
}

/**
 * rehype plugin replacing every `pre > code` with shiki's dual-theme markup.
 * Highlighting at the AST level rather than through a `pre` component keeps
 * the output identical for pages, embeds and the RSS feed alike.
 */
export function createHighlightPass(highlighter: Highlighter): HighlightPass {
  const styleToClass = transformerStyleToClass({ classPrefix: '__s-' })
  const loaded = new Set(highlighter.getLoadedLanguages())

  const walk = (node: HastNode): void => {
    if (!('children' in node)) return
    const parent = node as HastRoot
    if (!Array.isArray(parent.children)) return
    parent.children.forEach((child, index) => {
      if (isElement(child) && child.tagName === 'pre') {
        const requested = langOf(child)
        const lang = loaded.has(requested) ? requested : FALLBACK_LANG
        const code = textOf(childElement(child, 'code') ?? child).replace(
          /\n$/,
          '',
        )
        const hast = highlighter.codeToHast(code, {
          lang,
          themes: { light: LIGHT_THEME, dark: DARK_THEME },
          defaultColor: false,
          cssVariablePrefix: '--s-',
          transformers: [styleToClass],
        })
        const replacement = hast.children[0]
        if (replacement && replacement.type === 'element') {
          parent.children[index] = replacement as unknown as HastNode
        }
        return
      }
      walk(child)
    })
  }

  return {
    plugin: () => (tree: HastRoot) => {
      walk(tree)
    },
    css: () => styleToClass.getCSS(),
  }
}

/**
 * THEME_RULES plus every class any file needed, cached or freshly compiled.
 * Sorted so the sheet does not depend on the order files happened to compile
 * in, which differs between node and bun.
 */
export function highlightCss(): string {
  return `${THEME_RULES}\n${[...rules].sort().join('')}`
}
