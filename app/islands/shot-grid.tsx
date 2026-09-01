import { useEffect, useRef, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'

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

export interface ShotGridProps {
  items: ShotItem[]
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

/**
 * Opening and closing the lightbox are both caused by an event, so the two
 * imperative calls each cause live in the handler rather than in an effect
 * watching a boolean derived from `index`. `showModal()` blocks interaction but
 * not scrolling, hence the body lock; pure CSS via `body:has(dialog[open])` is
 * not an option, because the esbuild target in framework/assets/client.ts includes
 * firefox111 and Firefox only got `:has` in 121.
 */
function openLightbox(
  dialog: HTMLDialogElement | null,
  at: number,
  setIndex: Dispatch<SetStateAction<number | null>>,
): void {
  setIndex(at)
  if (dialog && !dialog.open) dialog.showModal()
  document.body.style.overflow = 'hidden'
}

function closeLightbox(
  dialog: HTMLDialogElement | null,
  setIndex: Dispatch<SetStateAction<number | null>>,
): void {
  setIndex(null)
  // A no-op on an already-closed dialog, so the `close`/`cancel` paths stay
  // idempotent however the platform got there.
  dialog?.close()
  document.body.style.overflow = ''
}

/**
 * Upgrades the static grid: every still image becomes the content of a button
 * that opens the lightbox at that image's position. Videos keep their own
 * controls and are skipped, matching the order the server built `items` in.
 *
 * An effect is genuinely required here. This is DOM the server rendered and
 * React does not own — the grid is the island's sibling, not its child — so
 * there is no render pass that could produce these buttons. One delegated
 * listener on the grid serves all of them; the per-image position travels in a
 * data attribute rather than a captured closure.
 */
function useGridTriggers(
  dialogRef: RefObject<HTMLDialogElement | null>,
  items: ShotItem[],
  setIndex: Dispatch<SetStateAction<number | null>>,
): void {
  useEffect(() => {
    const grid = findGrid(dialogRef.current)
    if (!grid) return
    const buttons: HTMLButtonElement[] = []
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
      button.className = 'shot-trigger'
      button.dataset.shotIndex = String(at)
      button.setAttribute(
        'aria-label',
        item.alt ? `Expand: ${item.alt}` : 'Expand image',
      )
      image.replaceWith(button)
      button.appendChild(image)
      buttons.push(button)
    }

    const onClick = (event: Event) => {
      const at = (event.target as Element).closest<HTMLElement>(
        '[data-shot-index]',
      )?.dataset.shotIndex
      if (at !== undefined) {
        openLightbox(dialogRef.current, Number(at), setIndex)
      }
    }
    grid.addEventListener('click', onClick)

    return () => {
      grid.removeEventListener('click', onClick)
      for (const button of buttons) {
        const image = button.firstElementChild
        if (image) button.replaceWith(image)
      }
    }
  }, [dialogRef, items, setIndex])
}

export default function ShotGrid({ items }: ShotGridProps) {
  const [index, setIndex] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useGridTriggers(dialogRef, items, setIndex)

  const close = () => closeLightbox(dialogRef.current, setIndex)

  const step = (delta: number) => {
    setIndex((current) =>
      current === null || items.length < 2
        ? current
        : (current + delta + items.length) % items.length,
    )
  }

  if (items.length === 0) return null

  const item = index === null ? null : items[index]

  return (
    // The backdrop of a modal `<dialog>` is the dialog element itself, so
    // click-to-dismiss and the arrow keys have nowhere else to live.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      className="shot-lightbox"
      // `close` fires on close(); `cancel` on the platform's own Escape. Both
      // are fallbacks for the keydown handler below, and both are idempotent.
      onClose={close}
      onCancel={close}
      onClick={(event) => {
        // the dialog element itself is the backdrop around the figure
        if (event.target === dialogRef.current) close()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          // Handled here rather than left to the platform. The browser's own
          // Escape dismissal closes the element without the `close` event
          // reaching this component reliably, which left `index` set and the
          // body scroll-locked after the lightbox had visibly gone away.
          event.preventDefault()
          close()
        } else if (event.key === 'ArrowRight') {
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
            className="shot-control shot-close"
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
              className="shot-control shot-prev"
              onClick={() => step(-1)}
              aria-label="Previous image"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          ) : null}

          <figure className="shot-lightbox-figure">
            <img
              className="shot-lightbox-media"
              src={item.full}
              alt={item.alt}
            />
            {item.caption ? (
              <figcaption className="shot-lightbox-caption">
                {item.caption}
                {items.length > 1 ? (
                  <span className="shot-counter">
                    {index + 1} / {items.length}
                  </span>
                ) : null}
              </figcaption>
            ) : null}
          </figure>

          {items.length > 1 ? (
            <button
              type="button"
              className="shot-control shot-next"
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
