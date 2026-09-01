import React, { type ReactNode } from 'react'
import { diffLines } from 'diff'
import Link from '@components/link'
import Info from '@components/icons/info'
import Home from '@components/icons/home'
import { MDXNote } from './components/mdx-note'
import { createIslandComponents, flattenText } from './island-components'
import { Img, urlDims } from '@framework/render/images'
import type { TweetMap } from '@framework/content/tweets'
import type { DimensionMap } from '@framework/content/dimensions'
// Deep import on purpose; see the note on makeTweet below.
import { EmbeddedTweet } from '../../node_modules/react-tweet/dist/twitter-theme/embedded-tweet.js'

/**
 * The MDX components that render once at build and never hydrate: images, the
 * diff table, the tweet card, notes, details and links.
 *
 * The three that do hydrate -- the file tree, the shot grid and the Minecraft
 * inventory -- live in `island-components.tsx`, and `createMdxComponents`
 * composes both halves. `pre` is deliberately absent from the map: shiki
 * replaces the whole `pre` element in the rehype stage, so the compiled markup
 * already carries both themes.
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
  const url = urlDims(src)
  const stated =
    url.width !== undefined && url.height !== undefined ? url : undefined
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

/* --------------------------------------------------------------- tweet -- */

/**
 * The full react-tweet Twitter theme, rendered at build.
 *
 * `EmbeddedTweet` is the presentational half of the package: it takes a tweet
 * payload and renders the header, entity-linked body, media, actions bar and
 * replies link, with no data fetching and no swr. Importing it by file path
 * rather than by package specifier is deliberate: `packages: 'external'` in the
 * server bundle would otherwise leave it unbundled, and its CSS modules have to
 * go through the build's `react-tweet-css` plugin so the class names it hands
 * the components match `app/styles/fragments/react-tweet.css`. `react-tweet` is
 * pinned to 3.3.1 because this is a deep import into `dist/`, not a public
 * export, and because that sheet is generated from this exact version.
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
    Tweet: makeTweet(options.tweets),
    ...createIslandComponents({ root: options.root, Image: ArticleImage }),
  }
}
