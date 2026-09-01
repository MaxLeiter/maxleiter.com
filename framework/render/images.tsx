import type { ImgHTMLAttributes, ReactElement } from 'react'

/**
 * The image component: a plain <img> with a Vercel-optimized srcset.
 *
 * Vercel's image optimizer is a platform feature, not a framework feature: it
 * is enabled purely by the `images` key in .vercel/output/config.json and
 * answers on /_vercel/image. There is no first-party helper for non-Next
 * frameworks, so the srcset is generated here.
 */

/**
 * Every width emitted must appear in `images.sizes` in config.json or that
 * srcset candidate 400s. `vercel.ts` imports this constant to build that list,
 * so there is one declaration; keep it short, because each distinct
 * (url, w, q, format) tuple is a separate billable transformation.
 *
 * Retargeted to the ladder `sizes` below can actually select. The article
 * column is 768px, so above the breakpoint a DPR-1 screen wants 768 and a
 * DPR-2 screen wants 1536 -- which used to round up to the 1920 candidate,
 * 1.56x the pixels required. 1200 was unreachable above the breakpoint and
 * 640 unreachable below it at any DPR above 1.
 */
export const IMAGE_WIDTHS = [640, 828, 1536, 1920] as const

/** The only quality in `images.qualities`. */
export const IMAGE_QUALITY = 75

/** The `src` fallback for a browser ignoring `srcset`. Must be in IMAGE_WIDTHS. */
const DEFAULT_WIDTH = 1536

/**
 * The real column width. `max-w-3xl` is 48rem = 768px (article-pages.tsx)
 * inside `p-6`, so the breakpoint is 768 + 48 and the wide case is 768px flat.
 * The old `700px` understated the desktop column by 68px, which is how a page
 * ends up upscaling an image it had a bigger candidate for.
 */
const DEFAULT_SIZES = '(max-width: 816px) calc(100vw - 48px), 768px'

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
 *
 * Only what the URL actually states. The 550x450 default belongs to `Img`,
 * which is the one place that has to produce both numbers; a caller that cares
 * whether the author stated a size can see the difference, which is what
 * `ArticleImage` needs to prefer a measured size over a half-stated one.
 *
 * The base is a placeholder: `URL` needs one to parse a relative `src`, and
 * nothing but `searchParams` is read.
 */
export function urlDims(src: string): Partial<Dims> {
  const params = new URL(src, 'https://example.invalid').searchParams
  const dims: Partial<Dims> = {}
  for (const [side, aliases] of [
    ['width', ['w', 'width']],
    ['height', ['h', 'height']],
  ] as const) {
    const raw = aliases.map((name) => params.get(name)).find(Boolean)
    const value = raw ? Number.parseInt(raw, 10) : Number.NaN
    if (Number.isFinite(value) && value > 0) dims[side] = value
  }
  return dims
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
  // Skip the parse entirely when the caller stated both sides, which is what
  // every article image does once its size has been measured.
  const dims = width !== undefined && height !== undefined ? {} : urlDims(src)
  const w = width ?? dims.width ?? FALLBACK_WIDTH
  const h = height ?? dims.height ?? FALLBACK_HEIGHT
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
