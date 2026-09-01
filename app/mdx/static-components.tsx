import fs from 'node:fs'
import path from 'node:path'
import React, { type ReactNode } from 'react'
import { diffLines } from 'diff'
import Link from '@components/link'
import Info from '@components/icons/info'
import Home from '@components/icons/home'
import { MDXNote } from './components/mdx-note'
import fileTreeStyles from '@components/file-tree/file-tree.module.css'
import linkStyles from '@components/link/link.module.css'
import shotStyles from './components/shot-grid.module.css'
import inventoryStyles from '@components/mc/inventory.module.css'
import FileTreeIsland from '@islands/file-tree'
import type { FileTreeClasses, TreeNode } from '@islands/file-tree'
import type { ShotGridClasses, ShotItem } from '@islands/shot-grid'
import { Island } from '../../framework/islands'
import { Img, optimizedUrl } from '../../framework/images'
import type { TweetMap } from '../../framework/tweets'
import type { DimensionMap } from '../../framework/image-dims'
// Deep import on purpose; see the note on makeTweet below.
import { EmbeddedTweet } from '../../node_modules/react-tweet/dist/twitter-theme/embedded-tweet.js'

/**
 * The MDX component map, rendered entirely at build time.
 *
 * Everything that was a Client Component behind `next/dynamic` is now either
 * static markup or static markup inside an `<Island>` that Phase 2 hydrates.
 * `pre` is deliberately absent: shiki replaces the whole `pre` element in the
 * rehype stage, so the compiled markup already carries both themes.
 */

export interface MdxComponentOptions {
  root: string
  /** Tweet id -> the payload committed under `app/data/tweets/`. */
  tweets: TweetMap
  /** Image URL -> measured intrinsic size, committed under `app/data/`. */
  dimensions: DimensionMap
}

/* -------------------------------------------------------------- images -- */

/**
 * The first image in an article body is the LCP candidate, so it renders eager
 * and high priority while everything below it stays lazy.
 *
 * Next got this for free by preloading every post image; dropping those
 * preloads is a win everywhere except the one image above the fold. The
 * counter is module state reset by `resetArticleImages()` before each page
 * renders, which is safe because `renderToStaticMarkup` is synchronous.
 */
let articleImageCount = 0

export function resetArticleImages(): void {
  articleImageCount = 0
}

/**
 * Measured intrinsic sizes, so an image with no `?w=`/`?h=` hint reserves a box
 * with the right aspect ratio instead of `<Img>`'s 550x450 default. 25 of the
 * 42 blob-hosted images have no hint.
 */
let imageDimensions: DimensionMap = {}

/**
 * `<Img>` reads intrinsic dimensions off the `?w=`/`?h=` URL convention itself
 * (`parseDimsFromUrl`, 550x450 default), so callers need only supply an alt.
 */
/** Only when the author gave both sides; a lone `?w=` is not enough. */
function statedDims(src: string): { width: number; height: number } | null {
  const params = new URL(src, 'https://maxleiter.com').searchParams
  const w = params.get('w') ?? params.get('width')
  const h = params.get('h') ?? params.get('height')
  if (!w || !h) return null
  const width = Number.parseInt(w, 10)
  const height = Number.parseInt(h, 10)
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

function ArticleImage({
  src,
  alt,
  width,
  height,
}: {
  src: string
  alt?: string
  width?: number
  height?: number
}) {
  const isFirst = articleImageCount === 0
  articleImageCount += 1
  // Precedence: an explicit prop, then a complete `?width=&height=` pair the
  // author wrote, then the measured size. A URL carrying only `?w=` is a
  // half-hint whose missing side would fall back to a guessed 450, so the
  // measurement wins there.
  const stated = statedDims(src)
  const measured = imageDimensions[src]
  return (
    <Img
      src={src}
      alt={alt ?? ''}
      width={width ?? stated?.width ?? measured?.width}
      height={height ?? stated?.height ?? measured?.height}
      priority={isFirst}
    />
  )
}

/* ---------------------------------------------------------------- diff -- */

/** The reference transcription every `<Diff>` in the typewriter post compares against. */
const DIFF_ORIGINAL = `On or about 1788 in a small town of Streliska Galitsia a
family by the name of Wolf sin Mordecai was living with his
Wife and three sons ;- Berl, Lippe, and Mordecai.`

function flattenText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean')
    return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenText).join('')
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: ReactNode }>
    if (element.type === 'br') return '\n'
    return flattenText(element.props.children)
  }
  return ''
}

/**
 * Diffs are computed at build and emitted as a static two-column table.
 * This deletes react-diff-viewer (peers `react ^15 || ^16`) and the ~48KB of
 * emotion it dragged in; nothing about these diffs was ever interactive.
 */
function Diff({ children }: { children?: ReactNode }) {
  const transcribed = flattenText(children).trim()
  const parts = diffLines(DIFF_ORIGINAL, transcribed)

  const rows: { left: string | null; right: string | null; kind: string }[] = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const lines = part.value.replace(/\n$/, '').split('\n')
    if (part.removed) {
      const next = parts[i + 1]
      if (next?.added) {
        const added = next.value.replace(/\n$/, '').split('\n')
        const height = Math.max(lines.length, added.length)
        for (let n = 0; n < height; n++) {
          rows.push({
            left: lines[n] ?? null,
            right: added[n] ?? null,
            kind: 'changed',
          })
        }
        i += 1
        continue
      }
      for (const line of lines) {
        rows.push({ left: line, right: null, kind: 'removed' })
      }
      continue
    }
    if (part.added) {
      for (const line of lines) {
        rows.push({ left: null, right: line, kind: 'added' })
      }
      continue
    }
    for (const line of lines) {
      rows.push({ left: line, right: line, kind: 'same' })
    }
  }

  return (
    <table className="mdx-diff">
      <thead>
        <tr>
          <th scope="col">Original</th>
          <th scope="col">Transcribed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} data-diff={row.kind}>
            <td>{row.left}</td>
            <td>{row.right}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ----------------------------------------------------------- file tree -- */

/**
 * The scoped names lightningcss minted for the two stylesheets the tree uses.
 * They travel to the island as props: the client bundle has no CSS-module
 * plugin, so importing the stylesheets there would mint a second, different set.
 */
const FILE_TREE_CLASSES: FileTreeClasses = {
  wrapper: fileTreeStyles.wrapper,
  fileTree: fileTreeStyles.fileTree,
  file: fileTreeStyles.file,
  folder: fileTreeStyles.folder,
  folderChildren: fileTreeStyles['folder-children'],
  fileName: fileTreeStyles['file-name'],
  note: fileTreeStyles.note,
  focused: fileTreeStyles.focused,
  link: linkStyles.link,
}

interface FileProps {
  type: string
  name: string
  note?: string
  url?: string
}

interface FolderProps {
  name: string
  note?: string
  open?: boolean
  children?: ReactNode
}

/**
 * `<File>` and `<Folder>` are markers. `<FileTree>` reads them out of its own
 * children as data, because an island's props have to survive JSON and React
 * elements do not.
 */
function File(_props: FileProps) {
  return null
}

function Folder(_props: FolderProps) {
  return null
}

function toTreeNodes(children: ReactNode): TreeNode[] {
  const nodes: TreeNode[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === Folder) {
      const props = child.props as FolderProps
      nodes.push({
        kind: 'folder',
        name: props.name,
        note: props.note,
        open: props.open ?? false,
        children: toTreeNodes(props.children),
      })
    } else if (child.type === File) {
      const props = child.props as FileProps
      nodes.push({
        kind: 'file',
        type: props.type,
        name: props.name,
        note: props.note,
        url: props.url,
      })
    }
  })
  return nodes
}

function FileTree({ children }: { children?: ReactNode }) {
  const tree = toTreeNodes(children)
  return (
    <Island
      name="file-tree"
      on="visible"
      props={{ tree, classes: FILE_TREE_CLASSES }}
    >
      <FileTreeIsland tree={tree} classes={FILE_TREE_CLASSES} />
    </Island>
  )
}

/* ----------------------------------------------------------- shot grid -- */

const VIDEO_MIME: Record<string, string> = {
  webm: 'video/webm',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  ogv: 'video/ogg',
}

const extensionOf = (src: string) =>
  src.split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? ''

const mimeForSrc = (src: string) => VIDEO_MIME[extensionOf(src)]

interface ShotProps {
  src: string
  alt?: string
  caption?: ReactNode
  width?: number
  height?: number
  poster?: string
  sources?: string[]
}

function Shot({
  src,
  alt = '',
  caption,
  width,
  height,
  poster,
  sources,
}: ShotProps) {
  const media = mimeForSrc(src) ? (
    <video
      poster={poster}
      width={width}
      height={height}
      controls
      playsInline
      preload="metadata"
      aria-label={alt || undefined}
    >
      {[src, ...(sources ?? [])].map((source) => (
        <source key={source} src={source} type={mimeForSrc(source)} />
      ))}
    </video>
  ) : (
    // Through the optimizer like every other post image, rather than the raw
    // blob URL the client-side version used.
    <ArticleImage src={src} alt={alt} width={width} height={height} />
  )

  return (
    <figure className={shotStyles.shot}>
      {media}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

const SHOT_GRID_CLASSES: ShotGridClasses = {
  trigger: shotStyles.trigger,
  lightbox: shotStyles.lightbox,
  lightboxFigure: shotStyles.lightboxFigure,
  lightboxMedia: shotStyles.lightboxMedia,
  lightboxCaption: shotStyles.lightboxCaption,
  counter: shotStyles.counter,
  control: shotStyles.control,
  close: shotStyles.close,
  prev: shotStyles.prev,
  next: shotStyles.next,
}

/** The optimizer width the lightbox opens at. Must be in IMAGE_WIDTHS. */
const LIGHTBOX_WIDTH = 1920

/** Formats the optimizer would reject; the lightbox links them directly. */
const UNOPTIMIZABLE = /\.svg(\?|$)/i

/**
 * The lightbox-able shots, in the order the island will find their `<figure>`s
 * in the static grid. Videos keep their own controls and are skipped, exactly
 * as in the client-side version.
 */
function toShotItems(children: ReactNode): ShotItem[] {
  const items: ShotItem[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const props = child.props as ShotProps
    if (!props.src || mimeForSrc(props.src)) return
    const caption = flattenText(props.caption).trim()
    items.push({
      src: props.src,
      full: UNOPTIMIZABLE.test(props.src)
        ? props.src
        : optimizedUrl(props.src, LIGHTBOX_WIDTH),
      alt: props.alt ?? '',
      caption: caption || undefined,
    })
  })
  return items
}

/**
 * The grid is static markup and stays outside the island: hydrating over it
 * would mean rebuilding the optimizer's `<img>` markup in the client bundle,
 * and any drift there would show up as preact re-creating every image. The
 * island is an empty sibling that finds the grid by `data-shot-grid`, wraps
 * each still in a button, and owns the `<dialog>`. No JavaScript, no lightbox,
 * and the grid is still a grid.
 */
function ShotGrid({ children }: { children?: ReactNode }) {
  const items = toShotItems(children)
  return (
    <>
      <div className={shotStyles.grid} data-shot-grid>
        {children}
      </div>
      {items.length > 0 ? (
        <Island
          name="shot-grid"
          on="visible"
          props={{ items, classes: SHOT_GRID_CLASSES }}
        >
          {null}
        </Island>
      ) : null}
    </>
  )
}

/* --------------------------------------------------- minecraft inventory -- */

interface MinecraftItem {
  name: string
  mod: string
  src: string
}

let inventoryCache: MinecraftItem[] | null = null

/**
 * Walks `public/mc/images/`, where directory structure carries the metadata:
 * the subdirectory is the mod name and the filename is the item name. Icons are
 * referenced by URL rather than base64-inlined, which kept ~500KB of data URIs
 * out of one page's HTML.
 */
function readInventory(root: string): MinecraftItem[] {
  if (inventoryCache) return inventoryCache
  const publicDir = path.join(root, 'public')
  const imagesDir = path.join(publicDir, 'mc', 'images')
  const items: MinecraftItem[] = []

  const walk = (current: string, relMod = ''): void => {
    let entries: fs.Dirent[]
    try {
      // Sorted: node returns directory entries ordered and bun returns them in
      // raw directory order, so an unsorted walk made this one page's HTML
      // differ between the two runtimes.
      entries = fs
        .readdirSync(current, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name))
    } catch {
      return
    }
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(entryPath, path.join(relMod, entry.name))
      } else if (
        entry.isFile() &&
        /\.(png|jpe?g|gif|webp)$/i.test(entry.name)
      ) {
        items.push({
          name: path.parse(entry.name).name.replace(/_/g, ' '),
          mod: relMod.split(path.sep).pop() || 'Unknown Mod',
          src: encodeURI(
            `/${path.relative(publicDir, entryPath).split(path.sep).join('/')}`,
          ),
        })
      }
    }
  }

  walk(imagesDir)
  inventoryCache = items
  return items
}

function makeMinecraftInventory(root: string) {
  return function MinecraftInventory({
    columns = 9,
    slotSize = 36,
  }: {
    columns?: number
    slotSize?: number
  }) {
    const items = readInventory(root)
    // Not an island. The tooltips are `.slot:hover .tooltip` in the stylesheet,
    // and the only JavaScript this component ever had was a resize listener
    // that recomputed the column count. Nine 36px columns fit a 360px phone,
    // so that listener bought a grid of 53 icons nothing at all.
    return (
      <div
        className={inventoryStyles.container}
        style={
          {
            '--slot-size': `${slotSize}px`,
            '--columns': columns,
          } as React.CSSProperties
        }
      >
        {items.map((item, index) => (
          <div key={`${item.name}-${index}`} className={inventoryStyles.slot}>
            <img
              src={item.src}
              alt={item.name}
              width={slotSize - 4}
              height={slotSize - 4}
              loading="lazy"
              decoding="async"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className={inventoryStyles.tooltip}>
              <div>{item.name}</div>
              <div className={inventoryStyles.mod}>{item.mod}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }
}

/* --------------------------------------------------------------- tweet -- */

/**
 * The full react-tweet Twitter theme, rendered at build.
 *
 * `EmbeddedTweet` is the presentational half of the package: it takes a tweet
 * payload and renders the header, entity-linked body, media, actions bar and
 * replies link, with no data fetching and no swr. Importing it by file path
 * rather than by package specifier is deliberate: `packages: 'external'` in the
 * server bundle would otherwise leave it unbundled, and its CSS modules have to
 * go through the build's own lightningcss plugin so their scoped class names
 * match the emitted stylesheet. `react-tweet` is pinned to 3.3.1 because this
 * is a deep import into `dist/`, not a public export.
 */
function makeTweet(tweets: TweetMap) {
  return function TweetBlock({ id }: { id: string }) {
    const tweet = tweets[id]
    if (!tweet) {
      throw new Error(`<Tweet id="${id}"> has no committed payload`)
    }
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EmbeddedTweet tweet={tweet} />
      </div>
    )
  }
}

/* ----------------------------------------------------------------- map -- */

export function createMdxComponents(options: MdxComponentOptions) {
  imageDimensions = options.dimensions
  return {
    a: ({
      children,
      href,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      const isExternal = Boolean(href?.startsWith('http'))
      return (
        <Link
          {...props}
          href={href ?? ''}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
        >
          {children}
        </Link>
      )
    },
    img: ArticleImage,
    Image: ArticleImage,
    Details: ({
      children,
      summary,
      ...props
    }: React.HTMLAttributes<HTMLElement> & { summary?: string }) => (
      <details {...props}>
        {summary && <summary>{summary}</summary>}
        {children}
      </details>
    ),
    Note: MDXNote,
    InfoIcon: Info,
    HomeIcon: Home,
    Diff,
    FileTree,
    File,
    Folder,
    Tweet: makeTweet(options.tweets),
    MinecraftInventory: makeMinecraftInventory(options.root),
    ShotGrid,
    Shot,
  }
}
