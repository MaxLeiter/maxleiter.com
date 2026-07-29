'use client'

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import styles from './shot-grid.module.css'

type ShotProps = {
  /** an image, or a video (.webm/.mp4/.mov/.m4v) — detected from the extension */
  src: string
  alt?: string
  caption?: React.ReactNode
  /** intrinsic dimensions, used to reserve space and avoid layout shift */
  width?: number
  height?: number
  /** poster frame, videos only */
  poster?: string
  /** additional video sources for browsers that can't play `src` */
  sources?: string[]
  /** set by ShotGrid on lightbox-able shots; don't pass this yourself */
  index?: number
}

type LightboxItem = Pick<ShotProps, 'src' | 'alt' | 'caption'>

const GridContext = createContext<((index: number) => void) | null>(null)

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

const isVideo = (src: string) => Boolean(mimeForSrc(src))

export function ShotGrid({ children }: { children: React.ReactNode }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  // Collect the lightbox-able shots (videos keep their own controls) and hand
  // each one its index in that list.
  const items: LightboxItem[] = []
  const shots = Children.map(children, (child) => {
    if (!isValidElement<ShotProps>(child)) return child
    const { src, alt, caption } = child.props
    if (!src || isVideo(src)) return child
    const index = items.length
    items.push({ src, alt, caption })
    return cloneElement(child, { index })
  })

  return (
    <GridContext.Provider value={setOpenIndex}>
      <div className={styles.grid}>{shots}</div>
      <Lightbox
        items={items}
        index={openIndex}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </GridContext.Provider>
  )
}

export function Shot({
  src,
  alt = '',
  caption,
  width,
  height,
  poster,
  sources,
  index,
}: ShotProps) {
  const open = useContext(GridContext)

  const media = isVideo(src) ? (
    // no autoPlay: nothing plays until the reader hits play
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
    // eslint-disable-next-line @next/next/no-img-element -- natural aspect ratios, no fixed size to give next/image
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
    />
  )

  return (
    <figure className={styles.shot}>
      {open && index !== undefined ? (
        <button
          type="button"
          className={styles.trigger}
          onClick={() => open(index)}
          aria-label={alt ? `Expand: ${alt}` : 'Expand image'}
        >
          {media}
        </button>
      ) : (
        media
      )}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: LightboxItem[]
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const isOpen = index !== null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    else if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  // showModal() blocks interaction but not scrolling.
  useEffect(() => {
    if (!isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  const step = useCallback(
    (delta: number) => {
      if (index === null || items.length < 2) return
      onIndexChange((index + delta + items.length) % items.length)
    },
    [index, items.length, onIndexChange],
  )

  if (items.length === 0) return null
  const item = index === null ? null : items[index]

  return (
    <dialog
      ref={ref}
      className={styles.lightbox}
      // fires on Escape and on close()
      onClose={onClose}
      onClick={(e) => {
        // the dialog element itself is the backdrop area around the figure
        if (e.target === ref.current) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          step(1)
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          step(-1)
        }
      }}
    >
      {item ? (
        <>
          <button
            type="button"
            className={`${styles.control} ${styles.close}`}
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {items.length > 1 ? (
            <button
              type="button"
              className={`${styles.control} ${styles.prev}`}
              onClick={() => step(-1)}
              aria-label="Previous image"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          ) : null}

          <figure className={styles.lightboxFigure}>
            {/* eslint-disable-next-line @next/next/no-img-element -- dimensions are unknown; the box is capped by CSS */}
            <img
              className={styles.lightboxMedia}
              src={item.src}
              alt={item.alt}
            />
            {item.caption ? (
              <figcaption className={styles.lightboxCaption}>
                {item.caption}
                {items.length > 1 ? (
                  <span className={styles.counter}>
                    {index! + 1} / {items.length}
                  </span>
                ) : null}
              </figcaption>
            ) : null}
          </figure>

          {items.length > 1 ? (
            <button
              type="button"
              className={`${styles.control} ${styles.next}`}
              onClick={() => step(1)}
              aria-label="Next image"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : null}
        </>
      ) : null}
    </dialog>
  )
}
