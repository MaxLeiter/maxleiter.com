import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The lightbox half of the MDX `<ShotGrid>`.
 *
 * The grid itself is static markup rendered by app/mdx/static-components.tsx:
 * optimized `<img>`s with their four-candidate srcset, and videos with their
 * own controls. This island is a sibling of that grid rather than a wrapper
 * around it, which is the whole trick — hydrating over the grid would mean
 * reproducing the optimizer's markup in the client bundle, and any drift would
 * show up as preact rebuilding every image on mount.
 *
 * So on mount it does two things: wraps each still image in a real `<button>`
 * so the lightbox is keyboard-reachable, and renders the `<dialog>` into its
 * own (empty) wrapper. With JavaScript off, neither exists and the grid is
 * still a grid.
 */

export interface ShotItem {
  /** The optimized URL used in the grid, for matching only. */
  src: string
  /** A wider optimizer URL, used inside the lightbox. */
  full: string
  alt: string
  caption?: string
}

export interface ShotGridClasses {
  trigger: string
  lightbox: string
  lightboxFigure: string
  lightboxMedia: string
  lightboxCaption: string
  counter: string
  control: string
  close: string
  prev: string
  next: string
}

export interface ShotGridProps {
  items: ShotItem[]
  classes: ShotGridClasses
}

/**
 * The grid this island belongs to. It is the nearest preceding sibling of the
 * island wrapper, marked by static-components.tsx.
 */
function findGrid(anchor: Element | null): HTMLElement | null {
  const wrapper = anchor?.closest<HTMLElement>('[data-island]')
  let node = wrapper?.previousElementSibling ?? null
  while (node) {
    if (node instanceof HTMLElement && node.dataset.shotGrid !== undefined) {
      return node
    }
    node = node.previousElementSibling
  }
  return null
}

export default function ShotGrid({ items, classes }: ShotGridProps) {
  const [index, setIndex] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isOpen = index !== null

  // Upgrade the static grid: every still image becomes the content of a button
  // that opens the lightbox at that image's position. Videos keep their own
  // controls and are skipped, matching the order the server built `items` in.
  useEffect(() => {
    const grid = findGrid(dialogRef.current)
    if (!grid) return
    const cleanups: (() => void)[] = []
    let position = 0

    for (const figure of grid.querySelectorAll('figure')) {
      if (figure.querySelector('video')) continue
      const image = figure.querySelector('img')
      if (!image || image.parentElement?.tagName === 'BUTTON') continue
      const at = position++
      const item = items[at]
      if (!item) continue

      const button = document.createElement('button')
      button.type = 'button'
      button.className = classes.trigger
      button.setAttribute(
        'aria-label',
        item.alt ? `Expand: ${item.alt}` : 'Expand image',
      )
      const onClick = () => setIndex(at)
      button.addEventListener('click', onClick)
      image.replaceWith(button)
      button.appendChild(image)

      cleanups.push(() => {
        button.removeEventListener('click', onClick)
        button.replaceWith(image)
      })
    }

    return () => {
      for (const cleanup of cleanups) cleanup()
    }
  }, [items, classes.trigger])

  useEffect(() => {
    const dialog = dialogRef.current
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

  const close = useCallback(() => setIndex(null), [])

  const step = useCallback(
    (delta: number) => {
      setIndex((current) =>
        current === null || items.length < 2
          ? current
          : (current + delta + items.length) % items.length,
      )
    },
    [items.length],
  )

  if (items.length === 0) return null

  const item = index === null ? null : items[index]

  return (
    // The backdrop of a modal `<dialog>` is the dialog element itself, so
    // click-to-dismiss and the arrow keys have nowhere else to live.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      className={classes.lightbox}
      // fires on Escape and on close()
      onClose={close}
      onClick={(event) => {
        // the dialog element itself is the backdrop around the figure
        if (event.target === dialogRef.current) close()
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          step(1)
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault()
          step(-1)
        }
      }}
    >
      {item && index !== null ? (
        <>
          <button
            type="button"
            className={`${classes.control} ${classes.close}`}
            onClick={close}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {items.length > 1 ? (
            <button
              type="button"
              className={`${classes.control} ${classes.prev}`}
              onClick={() => step(-1)}
              aria-label="Previous image"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          ) : null}

          <figure className={classes.lightboxFigure}>
            <img
              className={classes.lightboxMedia}
              src={item.full}
              alt={item.alt}
            />
            {item.caption ? (
              <figcaption className={classes.lightboxCaption}>
                {item.caption}
                {items.length > 1 ? (
                  <span className={classes.counter}>
                    {index + 1} / {items.length}
                  </span>
                ) : null}
              </figcaption>
            ) : null}
          </figure>

          {items.length > 1 ? (
            <button
              type="button"
              className={`${classes.control} ${classes.next}`}
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
