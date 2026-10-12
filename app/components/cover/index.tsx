import { artUrl } from '@art/registry'
import { emitAsset } from '@framework/render/assets'
import { optimizedUrl } from '@framework/render/images'
import { coverLayout, coverSvg, type CoverText } from '@lib/cover-art'

/**
 * A piece of box art: the art as an image, with its type drawn over it as
 * inline SVG text so it uses the page's own Geist.
 *
 * The art is the seed's bespoke piece (app/art, baked to WebP and served
 * through the image optimizer) or, for a seed with none, the generated
 * motif. A bespoke piece is its own subject, so it drops the keyword and
 * gets a shade under the title instead.
 *
 * Class names from ./cover.css. The type is `aria-hidden`: whatever wraps a
 * cover names itself with real text, and the cover only repeats it.
 */

/** The hashed URL of a seed's generated motif, written by the build. */
export function coverUrl(seed: string): string {
  return emitAsset('cover', 'svg', coverSvg(seed))
}

/** The art is 1536 wide; a larger candidate would only upscale it. */
const ART_WIDTHS = [640, 828, 1536] as const

/** What the WebGL scene samples: its covers are 640 units wide. */
const TEX_WIDTH = 640

const n = (x: number) => Math.round(x * 10) / 10

export interface CoverProps extends CoverText {
  /** Keyword only: list thumbnails are too small for the title band. */
  mini?: boolean
  /** Above the fold: fetch now, at high priority. */
  eager?: boolean
  /** The rendered width, for the srcset. Mini covers need no srcset. */
  sizes?: string
}

function Art({
  seed,
  mini,
  eager,
  sizes,
}: Pick<CoverProps, 'seed' | 'mini' | 'eager' | 'sizes'>) {
  const baked = artUrl(seed)
  const common = {
    className: 'cv-art',
    width: 640,
    height: 400,
    loading: eager ? undefined : ('lazy' as const),
    fetchPriority: eager ? ('high' as const) : undefined,
    decoding: 'async' as const,
  }
  if (!baked) return <img {...common} alt="" src={coverUrl(seed)} />
  if (mini) return <img {...common} alt="" src={optimizedUrl(baked, 640)} />
  return (
    <img
      {...common}
      alt=""
      src={optimizedUrl(baked, 828)}
      srcSet={ART_WIDTHS.map((w) => `${optimizedUrl(baked, w)} ${w}w`).join(
        ', ',
      )}
      sizes={sizes ?? '(max-width: 700px) calc(100vw - 48px), 300px'}
      data-tex={optimizedUrl(baked, TEX_WIDTH)}
    />
  )
}

export function Cover({
  seed,
  title,
  meta,
  chip,
  mini,
  eager,
  sizes,
}: CoverProps) {
  const bespoke = artUrl(seed) !== null
  const layout = coverLayout({ seed, title, meta, chip, bespoke })
  const { kw } = layout
  const transform = `translate(${n(kw.x)} ${n(kw.y)})${kw.skew ? ' skewX(-5.71)' : ''}`
  return (
    <span
      className={mini ? 'cv-box cv-mini' : bespoke ? 'cv-box cv-b' : 'cv-box'}
    >
      <Art seed={seed} mini={mini} eager={eager} sizes={sizes} />
      <svg className="cv-type" viewBox="0 0 640 400" aria-hidden="true">
        {layout.keyword && (
          <text
            className={layout.kind === 'huge' ? 'cv-kw cv-kw-huge' : 'cv-kw'}
            transform={transform}
            fontSize={n(kw.size)}
            letterSpacing={kw.spacing}
          >
            {layout.keyword}
          </text>
        )}
        {!mini && (
          <>
            {layout.lines.map((line) => (
              <text className="cv-t" key={line.y} x={line.x} y={line.y}>
                {line.text}
              </text>
            ))}
            <text className="cv-m" x={layout.meta.x} y={layout.meta.y}>
              {layout.meta.text}
            </text>
            <rect
              className="cv-chip"
              x={layout.chip.x}
              y={layout.chip.y}
              width={n(layout.chip.w)}
              height={30}
              rx={15}
            />
            <text
              className="cv-c"
              x={layout.chip.x + 13}
              y={layout.chip.y + 20}
            >
              {layout.chip.text}
            </text>
          </>
        )}
      </svg>
    </span>
  )
}
