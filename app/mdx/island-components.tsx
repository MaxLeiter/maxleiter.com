import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import type { ReactElement, ReactNode } from 'react'
import FileTreeIsland from '@islands/file-tree'
import type { TreeNode } from '@islands/file-tree'
import type { ShotItem } from '@islands/shot-grid'
import { Island } from '@framework/render/islands'
import { optimizedUrl } from '@framework/render/images'

/**
 * The MDX components that hydrate: the file tree, the shot grid and the
 * Minecraft inventory.
 *
 * Split out of `static-components.tsx` so the islands work and the build-time
 * rendering work stop colliding in one file. Everything here renders real
 * markup at build and is wrapped in an `<Island>` that takes over on the
 * client; nothing here fetches or guesses.
 */

/** The article image component, supplied by `static-components.tsx`. */
export type ArticleImageComponent = (props: {
  src: string
  alt?: string
  width?: number
  height?: number
}) => ReactElement

export interface IslandComponentOptions {
  /** Repo root, for the Minecraft inventory's image walk. */
  root: string
  Image: ArticleImageComponent
}

/**
 * The text of an MDX node, with `<br>` as a newline.
 *
 * Shot captions are MDX, so they arrive as React elements; the lightbox needs
 * a plain string. `static-components.tsx` has a copy for `<Diff>`; if that file
 * ever wants one source, this is the one to import, because the dependency
 * already runs in that direction.
 */
export function flattenText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return ''
  }
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenText).join('')
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: ReactNode }>
    if (element.type === 'br') return '\n'
    return flattenText(element.props.children)
  }
  return ''
}

/* ----------------------------------------------------------- file tree -- */

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
    <Island name="file-tree" on="visible" props={{ tree }}>
      <FileTreeIsland tree={tree} />
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

/**
 * `Shot` needs the article image component, which lives in
 * `static-components.tsx`. It is passed in rather than imported so the
 * dependency runs one way, from that module to this one, with no cycle.
 */
function makeShot(Image: ArticleImageComponent) {
  return function Shot({
    src,
    alt = '',
    caption,
    width,
    height,
    poster,
    sources,
  }: ShotProps) {
    const media = mimeForSrc(src) ? (
      // These clips are silent screen recordings with no narration to caption,
      // and no caption track exists to point a `<track>` at.
      // oxlint-disable-next-line jsx-a11y/media-has-caption
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
      <Image src={src} alt={alt} width={width} height={height} />
    )

    return (
      <figure className="shot-figure">
        {media}
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    )
  }
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
      <div className="shot-grid" data-shot-grid>
        {children}
      </div>
      {items.length > 0 ? (
        <Island name="shot-grid" on="visible" props={{ items }}>
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
        className="mc-inventory"
        style={
          {
            '--slot-size': `${slotSize}px`,
            '--columns': columns,
          } as React.CSSProperties
        }
      >
        {items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="mc-slot">
            {/* 32px pixel-art icons rendered at 32px. Sending them through the
                optimizer would cost 53 billable transformations to produce the
                bytes we already have, and resampling would blur them. */}
            {/* oxlint-disable-next-line nextjs/no-img-element */}
            <img
              src={item.src}
              alt={item.name}
              width={slotSize - 4}
              height={slotSize - 4}
              loading="lazy"
              decoding="async"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="mc-tooltip">
              <div>{item.name}</div>
              <div className="mc-mod">{item.mod}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }
}

export function createIslandComponents(options: IslandComponentOptions) {
  return {
    FileTree,
    File,
    Folder,
    ShotGrid,
    Shot: makeShot(options.Image),
    MinecraftInventory: makeMinecraftInventory(options.root),
  }
}
