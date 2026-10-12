import { emitAsset } from '@framework/render/assets'
import { coverLayout, coverSvg, type CoverText } from '@lib/cover-art'

/**
 * A piece of box art: the generated motif as an image, with its type drawn
 * over it as inline SVG text so it uses the page's own Geist.
 *
 * Class names from ./cover.css. The type is `aria-hidden`: whatever wraps a
 * cover names itself with real text, and the cover only repeats it.
 */

/** The hashed URL of a seed's motif, written by the build. */
export function coverUrl(seed: string): string {
  return emitAsset('cover', 'svg', coverSvg(seed))
}

const n = (x: number) => Math.round(x * 10) / 10

export interface CoverProps extends CoverText {
  /** Keyword only: list thumbnails are too small for the title band. */
  mini?: boolean
  /** Above the fold: fetch now, at high priority. */
  eager?: boolean
}

export function Cover({ seed, title, meta, chip, mini, eager }: CoverProps) {
  const layout = coverLayout({ seed, title, meta, chip })
  const { kw } = layout
  const transform = `translate(${n(kw.x)} ${n(kw.y)})${kw.skew ? ' skewX(-5.71)' : ''}`
  return (
    <span className={mini ? 'cv-box cv-mini' : 'cv-box'}>
      <img
        className="cv-art"
        src={coverUrl(seed)}
        alt=""
        width={640}
        height={400}
        loading={eager ? undefined : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
      />
      <svg className="cv-type" viewBox="0 0 640 400" aria-hidden="true">
        <text
          className={layout.kind === 'huge' ? 'cv-kw cv-kw-huge' : 'cv-kw'}
          transform={transform}
          fontSize={n(kw.size)}
          letterSpacing={kw.spacing}
        >
          {layout.keyword}
        </text>
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
