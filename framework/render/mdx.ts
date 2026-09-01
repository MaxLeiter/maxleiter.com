import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile, run } from '@mdx-js/mdx'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement, type ComponentType, type ReactElement } from 'react'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import remarkToc from 'remark-toc'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
// @ts-expect-error the package ships no types
import remarkA11yEmoji from '@fec/remark-a11y-emoji'
import type { Highlighter } from 'shiki'
import {
  collectHighlightCss,
  createHighlightPass,
  type HighlightPass,
} from './highlight'

/**
 * MDX compiled once per file at build, not once per render.
 *
 * The current site runs the full unified pipeline inside the RSC renderer for
 * every page. Compiling here, with a content-hash cache in `.cache/mdx/`, is
 * the single biggest build-time lever (design 2.3).
 *
 * `blockJS: false` has no analogue and needs none: that flag exists because
 * next-mdx-remote@6 strips JSX attribute expressions by default, silently
 * dropping `width={600}`. @mdx-js/mdx is the compiler it wraps and has no such
 * behaviour, so `width={600}` and `style={{...}}` survive (checklist item 29).
 */

/** Bump when the plugin stack changes so stale cache entries are ignored. */
const CACHE_VERSION = 'v3'

export type MdxComponents = Record<string, ComponentType<never> | unknown>

export interface MdxCompiler {
  render: (source: string, components: MdxComponents) => Promise<ReactElement>
  renderHtml: (source: string, components: MdxComponents) => Promise<string>
  stats: () => { hits: number; misses: number }
}

/**
 * Routes literal JSX `<img>` in post bodies through the `Image` component.
 *
 * MDX resolves markdown-derived images through `_components.img`, but a JSX
 * `<img>` written by hand in a post is emitted as a host element and never
 * touches the component map. Nine such images across six posts were therefore
 * skipping the image optimizer entirely, including the 754KB `ladybird.png`
 * that is the single largest byte on the site. React 19 also emits a
 * `<link rel="preload" as="image">` for any `<img>` without `loading="lazy"`,
 * so those images were being fetched eagerly on top of being unoptimized.
 *
 * Dimensions are normalized on the way through. `width="300px"` becomes 300:
 * the HTML `width` content attribute must be a valid non-negative integer, so
 * browsers were discarding `"300px"` outright and the author's sizing intent
 * was already being lost. `height="auto"` and other non-numeric values are
 * dropped, which changes nothing visually because `markdown.css` already sets
 * `article img { max-width: 100%; height: auto }`.
 */
interface JsxAttribute {
  type: string
  name?: string
  value?: unknown
}

interface JsxNode {
  type: string
  name?: string
  attributes?: JsxAttribute[]
  children?: JsxNode[]
}

/** `300`, or a `px` length the HTML attribute cannot express on its own. */
const PIXELS = /^(\d+)(?:px)?$/

function normalizeDimension(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = PIXELS.exec(value.trim())
  return match ? match[1] : null
}

function remarkJsxImages() {
  const walk = (node: JsxNode): void => {
    if (
      (node.type === 'mdxJsxFlowElement' ||
        node.type === 'mdxJsxTextElement') &&
      node.name === 'img'
    ) {
      node.name = 'Image'
      const attributes: JsxAttribute[] = []
      for (const attr of node.attributes ?? []) {
        if (attr.name !== 'width' && attr.name !== 'height') {
          attributes.push(attr)
          continue
        }
        const normalized = normalizeDimension(attr.value)
        if (normalized !== null) attributes.push({ ...attr, value: normalized })
      }
      node.attributes = attributes
    }
    for (const child of node.children ?? []) walk(child)
  }
  return (tree: JsxNode) => {
    walk(tree)
  }
}

function mdxOptions(pass: HighlightPass) {
  return {
    outputFormat: 'function-body' as const,
    development: false,
    remarkPlugins: [
      remarkFrontmatter,
      remarkGfm,
      remarkA11yEmoji,
      [remarkToc, { tight: true, maxDepth: 5 }],
      remarkJsxImages,
    ],
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings, pass.plugin],
  }
}

/** What lands in `.cache/mdx/<hash>.json`. */
interface CacheEntry {
  code: string
  /** The shiki class rules this file needs, replayed on a cache hit. */
  css: string
}

export async function createMdxCompiler(
  cacheDir: string,
  highlighter: Highlighter,
): Promise<MdxCompiler> {
  const dir = path.join(cacheDir, 'mdx')
  await fs.mkdir(dir, { recursive: true })

  const compiled = new Map<string, Promise<ComponentType<MdxProps>>>()
  let hits = 0
  let misses = 0

  interface MdxProps {
    components: MdxComponents
  }

  const load = async (source: string): Promise<ComponentType<MdxProps>> => {
    const key = createHash('sha256')
      .update(CACHE_VERSION)
      .update('\0')
      .update(source)
      .digest('hex')
      .slice(0, 32)
    const cacheFile = path.join(dir, `${key}.json`)

    // Highlighting runs inside compile(), so a cache hit has to replay the
    // rules that compile would have minted or the code blocks lose their
    // colors on every warm build.
    let entry: CacheEntry
    try {
      entry = JSON.parse(await fs.readFile(cacheFile, 'utf8')) as CacheEntry
      hits += 1
    } catch {
      misses += 1
      const pass = createHighlightPass(highlighter)
      const code = String(await compile(source, mdxOptions(pass)))
      entry = { code, css: pass.css() }
      await fs.writeFile(cacheFile, JSON.stringify(entry))
    }
    collectHighlightCss(entry.css)

    const mod = await run(entry.code, {
      ...jsxRuntime,
      baseUrl: import.meta.url,
    })
    return mod.default as ComponentType<MdxProps>
  }

  const componentFor = (source: string) => {
    // Two pages can render the same body (a post and its embed variant); the
    // in-process map keeps that to one compile.
    const key = createHash('sha256').update(source).digest('hex')
    let existing = compiled.get(key)
    if (!existing) {
      existing = load(source)
      compiled.set(key, existing)
    }
    return existing
  }

  return {
    async render(source, components) {
      const Content = await componentFor(source)
      return createElement(Content, { components })
    },
    async renderHtml(source, components) {
      const Content = await componentFor(source)
      return renderToStaticMarkup(createElement(Content, { components }))
    },
    stats: () => ({ hits, misses }),
  }
}

/**
 * Feed-shaped rendering: the same MDX pipeline, but with a component map that
 * imports no CSS modules, so it runs in plain Node outside the server bundle.
 * `framework/platform/feeds.ts` uses this instead of `marked`, which is what makes JSX
 * components render rather than leaking into the feed as raw text.
 */
const feedCompilers = new Map<string, Promise<MdxCompiler>>()

export function renderPostHtml(
  source: string,
  options: { cacheDir: string; highlighter: Highlighter },
): Promise<string> {
  // One compiler for the whole feed, so 32 items share the in-process compile
  // map rather than re-running `run()` per call.
  let compiler = feedCompilers.get(options.cacheDir)
  if (!compiler) {
    compiler = createMdxCompiler(options.cacheDir, options.highlighter)
    feedCompilers.set(options.cacheDir, compiler)
  }
  return compiler.then((c) => c.renderHtml(source, feedComponents))
}

const feedComponents: MdxComponents = {
  // Feed readers strip most attributes; anything interactive degrades to its
  // children or disappears, which is the right outcome in an RSS body.
  // Every image carries `loading="lazy"`: without it React 19 hoists a
  // `<link rel="preload" as="image">` in front of each one, which is pure noise
  // inside a feed description.
  img: ({ src, alt }: { src?: string; alt?: string }) =>
    createElement('img', { src, alt: alt ?? '', loading: 'lazy' }),
  Note: ({ children }: { children?: unknown }) =>
    createElement('blockquote', null, children as never),
  Details: ({ summary, children }: { summary?: string; children?: unknown }) =>
    createElement(
      'details',
      null,
      summary ? createElement('summary', null, summary) : null,
      children as never,
    ),
  Diff: ({ children }: { children?: unknown }) =>
    createElement('pre', null, children as never),
  FileTree: ({ children }: { children?: unknown }) =>
    createElement('ul', null, children as never),
  Folder: ({ name, children }: { name?: string; children?: unknown }) =>
    createElement('li', null, name, children as never),
  File: ({ name }: { name?: string }) => createElement('li', null, name),
  ShotGrid: ({ children }: { children?: unknown }) =>
    createElement('div', null, children as never),
  Shot: ({ src, alt }: { src?: string; alt?: string }) =>
    createElement('img', { src, alt: alt ?? '', loading: 'lazy' }),
  Image: ({ src, alt }: { src?: string; alt?: string }) =>
    createElement('img', { src, alt: alt ?? '', loading: 'lazy' }),
  Tweet: ({ id }: { id?: string }) =>
    createElement(
      'p',
      null,
      createElement(
        'a',
        { href: `https://twitter.com/i/status/${id}` },
        'View this post on X',
      ),
    ),
  MinecraftInventory: () => null,
  InfoIcon: () => null,
  HomeIcon: () => null,
}
