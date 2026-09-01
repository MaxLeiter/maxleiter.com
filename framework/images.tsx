/* oxlint-disable nextjs/no-img-element -- this framework replaces next/image */
import type { ImgHTMLAttributes, ReactElement } from 'react'

/**
 * The replacement for next/image.
 *
 * Vercel's image optimizer is a platform feature, not a framework feature: it
 * is enabled purely by the `images` key in .vercel/output/config.json and
 * answers on /_vercel/image. There is no first-party helper for non-Next
 * frameworks, so the srcset is generated here.
 */

/**
 * Every width emitted must appear in `images.sizes` in config.json or that
 * srcset candidate 400s. Keep this list and vercel.ts's IMAGE_SIZES together,
 * and keep it short: each distinct (url, w, q, format) tuple is a separate
 * billable transformation.
 */
export const IMAGE_WIDTHS = [640, 828, 1200, 1920] as const

/** The only quality in `images.qualities`. */
export const IMAGE_QUALITY = 75

/** Widest width, used for the `src` fallback. */
const DEFAULT_WIDTH = 1200

const DEFAULT_SIZES = '(max-width: 700px) 100vw, 700px'

/** Formats /_vercel/image cannot optimize, or would reject outright. */
const PASS_THROUGH = /\.(webm|mp4|m4v|mov|ogv|svg)(\?|$)/i
const VIDEO = /\.(webm|mp4|m4v|mov|ogv)(\?|$)/i

/** Fallback intrinsic size, matching app/mdx/components/mdx-image.tsx. */
const FALLBACK_WIDTH = 550
const FALLBACK_HEIGHT = 450

export interface Dims {
  width: number
  height: number
}

/**
 * Posts annotate intrinsic dimensions on the image URL itself, as `?w=`/`?h=`
 * (or `?width=`/`?height=`), because markdown has nowhere else to put them.
 * Ported unchanged from MDXImage, including the 550x450 default.
 */
export function parseDimsFromUrl(src: string): Dims {
  const url = new URL(src, 'https://maxleiter.com')
  const widthParam = url.searchParams.get('w') ?? url.searchParams.get('width')
  const heightParam =
    url.searchParams.get('h') ?? url.searchParams.get('height')

  const width = widthParam ? Number.parseInt(widthParam, 10) : Number.NaN
  const height = heightParam ? Number.parseInt(heightParam, 10) : Number.NaN

  return {
    width: Number.isFinite(width) && width > 0 ? width : FALLBACK_WIDTH,
    height: Number.isFinite(height) && height > 0 ? height : FALLBACK_HEIGHT,
  }
}

/** A single /_vercel/image URL. `w` must be one of IMAGE_WIDTHS. */
export function optimizedUrl(
  src: string,
  w: number,
  q: number = IMAGE_QUALITY,
): string {
  return `/_vercel/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`
}

export interface ImgProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'width' | 'height' | 'srcSet' | 'loading' | 'decoding'
> {
  src: string
  alt: string
  /**
   * Intrinsic dimensions. Required in spirit — every `<img>` this emits ends
   * up with both attributes, or the page shifts on load. They are optional in
   * the signature only so callers can lean on the `?w=`/`?h=` URL convention
   * instead of restating the numbers.
   */
  width?: number
  height?: number
  /** The `sizes` attribute. Defaults to the article column. */
  sizes?: string
  /** Skip the optimizer entirely. */
  unoptimized?: boolean
  /** Above-the-fold images should be eager and high priority. */
  priority?: boolean
}

/**
 * An optimized `<img>` with a four-candidate srcset. Videos, SVGs and
 * `unoptimized` sources pass straight through.
 */
export function Img({
  src,
  alt,
  width,
  height,
  sizes = DEFAULT_SIZES,
  unoptimized = false,
  priority = false,
  ...rest
}: ImgProps): ReactElement {
  const dims = parseDimsFromUrl(src)
  const w = width ?? dims.width
  const h = height ?? dims.height
  const loading = priority ? 'eager' : 'lazy'
  const priorityProps = priority ? { fetchPriority: 'high' as const } : {}

  if (VIDEO.test(src)) {
    return (
      <video
        src={src}
        width={w}
        height={h}
        className={rest.className}
        title={rest.title}
        aria-label={alt || undefined}
        controls
        loop
        muted
        playsInline
        preload="metadata"
      />
    )
  }

  if (unoptimized || PASS_THROUGH.test(src)) {
    return (
      <img
        src={src}
        alt={alt}
        width={w}
        height={h}
        loading={loading}
        decoding="async"
        {...priorityProps}
        {...rest}
      />
    )
  }

  const srcSet = IMAGE_WIDTHS.map(
    (width_) => `${optimizedUrl(src, width_)} ${width_}w`,
  ).join(', ')

  return (
    <img
      src={optimizedUrl(src, DEFAULT_WIDTH)}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={w}
      height={h}
      loading={loading}
      decoding="async"
      {...priorityProps}
      {...rest}
    />
  )
}

export default Img
