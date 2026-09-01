import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { useRef, useState } from 'react'
import { getHeaderClassName, windowStyles } from '@lib/window-styles'
import { DESKTOP_MIN_WIDTH } from './data'

/**
 * A draggable, resizable, snappable window.
 *
 * Ported from `app/components/desktop/window.tsx`. Three things changed:
 * `router.push` became `location.assign` (maximize has always been a
 * navigation, not a resize); the window can carry a `view-transition-name` so
 * it pairs with the article it opens into; and dragging is Pointer Events with
 * `setPointerCapture` instead of document-level mouse and touch listener pairs.
 *
 * That last one is why there is no effect in this file. The old version
 * registered `mousemove`/`mouseup`/`touchmove`/`touchend` on `document` from an
 * effect keyed on `[isDragging, isResizing]`, which meant the listeners could
 * not see fresh `position`, `size` or `dragOffset` and had to read them out of
 * a ref rewritten during every render. Pointer capture routes every move and
 * the release back to the element the gesture started on, so the handlers are
 * ordinary React props that close over the current render's values.
 */

type SnapDirection = 'left' | 'right' | 'top' | 'bottom' | null
type Mode = 'idle' | 'drag' | 'resize'

const SNAP_DISTANCE = 20
const MENUBAR_HEIGHT = 40
const MIN_WIDTH = 300
const MIN_HEIGHT = 200

export interface WindowProps {
  title: string
  onClose: () => void
  children: ReactNode
  defaultWidth?: number
  defaultHeight?: number
  defaultX?: number
  defaultY?: number
  /** Maximize navigates here instead of toggling local fullscreen. */
  maximizeHref?: string
  zIndex?: number
  onFocus?: () => void
  /** Emitted as `view-transition-name` on the window frame. */
  transitionName?: string
  /** Which post the frame is showing. */
  slug?: string
}

interface Size {
  width: number
  height: number
}

/** Position and size together: they are seeded together and snapped together. */
interface Rect extends Size {
  x: number
  y: number
}

function constrainToViewport(
  width: number,
  height: number,
  x: number,
  y: number,
): Rect {
  const maxWidth = window.innerWidth - 40
  const maxHeight = window.innerHeight - 80

  return {
    width: Math.min(width, maxWidth),
    height: Math.min(height, maxHeight),
    x: Math.max(20, Math.min(x, window.innerWidth - width - 20)),
    y: Math.max(60, Math.min(y, window.innerHeight - height - 20)),
  }
}

function getSnapDirection(
  pointerX: number,
  pointerY: number,
  viewport: Size,
): SnapDirection {
  if (pointerX < SNAP_DISTANCE) return 'left'
  if (pointerX > viewport.width - SNAP_DISTANCE) return 'right'
  if (pointerY < SNAP_DISTANCE + MENUBAR_HEIGHT) return 'top'
  if (pointerY > viewport.height - SNAP_DISTANCE) return 'bottom'
  return null
}

function getSnappedRect(
  direction: Exclude<SnapDirection, null>,
  current: Rect,
  viewport: Size,
): Rect {
  const { width: vw, height: vh } = viewport
  const belowMenubar = vh - MENUBAR_HEIGHT

  switch (direction) {
    case 'left':
      return { x: 0, y: MENUBAR_HEIGHT, width: vw / 2, height: belowMenubar }
    case 'right':
      return {
        x: vw / 2,
        y: MENUBAR_HEIGHT,
        width: vw / 2,
        height: belowMenubar,
      }
    case 'top':
      return { x: 0, y: MENUBAR_HEIGHT, width: vw, height: belowMenubar }
    case 'bottom':
      return {
        x: current.x,
        y: belowMenubar / 2 + MENUBAR_HEIGHT,
        width: current.width,
        height: belowMenubar / 2,
      }
  }
}

/** True when the pointer went down on the title bar rather than a button. */
function isHeaderDrag(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(el?.closest('.window-header') && !el.closest('button, a'))
}

export function Window({
  title,
  onClose,
  children,
  defaultWidth = 600,
  defaultHeight = 400,
  defaultX = 100,
  defaultY = 100,
  maximizeHref,
  zIndex = 50,
  onFocus,
  transitionName,
  slug,
}: WindowProps) {
  // Lazy initializers: both read layout, and both are seeds. Computing them in
  // the render body meant two viewport reads on every one of the ~60 renders a
  // second a drag produces, every result but the first discarded.
  const [rect, setRect] = useState<Rect>(() =>
    constrainToViewport(defaultWidth, defaultHeight, defaultX, defaultY),
  )
  const [isFullscreen, setIsFullscreen] = useState(
    () => window.innerWidth < DESKTOP_MIN_WIDTH,
  )
  const [mode, setMode] = useState<Mode>('idle')
  const [snapPreview, setSnapPreview] = useState<SnapDirection>(null)
  /** The geometry to restore on un-snap. Non-null IS "currently snapped". */
  const [preSnapRect, setPreSnapRect] = useState<Rect | null>(null)

  /** Where in the window the pointer grabbed it. Never rendered. */
  const dragOffset = useRef({ x: 0, y: 0 })
  /**
   * Viewport size, captured once per gesture instead of read on every move.
   * `getSnapDirection` alone used to read `innerWidth` and `innerHeight` on
   * each of a drag's ~60 events per second. Written on pointer-down and read
   * only during the gesture that wrote it, so every render in between sees the
   * value that gesture captured.
   */
  const viewport = useRef<Size>({ width: 0, height: 0 })

  const beginGesture = (event: PointerEvent<HTMLElement>, next: Mode) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Capture can be refused (an unknown or already-captured pointer). The
      // gesture still works while the pointer stays over the frame, so this
      // must not abort the drag.
    }
    viewport.current = {
      width: window.innerWidth,
      height: window.innerHeight,
    }
    setMode(next)
  }

  const onFramePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onFocus?.()
    if (isFullscreen || !isHeaderDrag(event.target)) return
    beginGesture(event, 'drag')

    if (preSnapRect) {
      // A snapped window pops back to its old size under the cursor.
      const restoredWidth = preSnapRect.width
      dragOffset.current = { x: restoredWidth / 2, y: 16 }
      setRect({
        ...preSnapRect,
        x: event.clientX - restoredWidth / 2,
        y: event.clientY - 16,
      })
      setPreSnapRect(null)
      return
    }
    dragOffset.current = {
      x: event.clientX - rect.x,
      y: event.clientY - rect.y,
    }
  }

  const onFramePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (mode === 'idle') return
    const { clientX, clientY } = event

    if (mode === 'drag') {
      setRect((current) => ({
        ...current,
        x: clientX - dragOffset.current.x,
        y: clientY - dragOffset.current.y,
      }))
      setSnapPreview(getSnapDirection(clientX, clientY, viewport.current))
      return
    }
    setRect((current) => ({
      ...current,
      width: Math.max(MIN_WIDTH, clientX - current.x),
      height: Math.max(MIN_HEIGHT, clientY - current.y),
    }))
  }

  const onFramePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (mode === 'idle') return
    if (mode === 'drag') {
      const direction = getSnapDirection(
        event.clientX,
        event.clientY,
        viewport.current,
      )
      if (direction) {
        if (!preSnapRect) setPreSnapRect(rect)
        setRect(getSnappedRect(direction, rect, viewport.current))
      }
      setSnapPreview(null)
    }
    setMode('idle')
  }

  /**
   * A cancelled pointer is not a release: `pointercancel` carries no meaningful
   * coordinates (the browser reports 0, 0), and feeding those to
   * `getSnapDirection` reads as "released against the left edge" and snaps a
   * window the reader never dragged there.
   */
  const onFramePointerCancel = () => {
    setSnapPreview(null)
    setMode('idle')
  }

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    if (isFullscreen) return
    // Resizing must not also raise-and-drag the frame behind the handle.
    event.stopPropagation()
    beginGesture(event, 'resize')
  }

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen)

  /**
   * Maximize is a navigation, so it renders as a real link rather than a
   * button calling `location.assign`: Chrome runs the cross-document view
   * transition (window frame morphing into the article) for link clicks but
   * skips it for script-initiated navigations. Verified 2026-08-31 against a
   * two-page control with Chrome 151.
   */
  const maximizeTarget = maximizeHref
    ? isFullscreen
      ? '/'
      : maximizeHref
    : null
  const maximizeIcon = (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <rect
        x={isFullscreen ? '4' : '2'}
        y={isFullscreen ? '4' : '2'}
        width={isFullscreen ? '8' : '12'}
        height={isFullscreen ? '8' : '12'}
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )

  const titleId = `window-title-${title.replace(/\s+/g, '-')}`

  const frameStyle: CSSProperties = {
    backdropFilter: 'blur(12px)',
    backgroundColor: 'var(--bg-window-alpha)',
    zIndex,
    ...(isFullscreen
      ? {
          left: 0,
          top: `${MENUBAR_HEIGHT}px`,
          width: '100%',
          height: `calc(100vh - ${MENUBAR_HEIGHT}px)`,
        }
      : {
          left: `${rect.x}px`,
          top: `${rect.y}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        }),
    ...(transitionName ? { viewTransitionName: transitionName } : null),
  }

  // `touch-action: none` only on the two grab handles. On the frame it would
  // also stop a finger scrolling the page the window is showing.
  const headerStyle: CSSProperties = {
    ...windowStyles.translucentBg,
    touchAction: 'none',
    userSelect: 'none',
  }

  return (
    <>
      <SnapPreview
        direction={snapPreview}
        rect={rect}
        viewport={viewport.current}
      />
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the frame owns click-to-focus and drag-to-move for the whole window; moving the handlers to the header alone would stop a click in the body raising the window. */}
      <div
        className="fixed border border-[var(--border-color)] rounded-lg flex flex-col font-mono text-sm"
        style={frameStyle}
        data-slug={slug}
        onPointerDown={onFramePointerDown}
        onPointerMove={onFramePointerMove}
        onPointerUp={onFramePointerUp}
        onPointerCancel={onFramePointerCancel}
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="false"
      >
        <header
          className={getHeaderClassName(isFullscreen)}
          style={headerStyle}
        >
          <h3 id={titleId} className={windowStyles.title}>
            {title}
          </h3>
          <div className="flex items-center gap-1">
            {maximizeTarget ? (
              <a
                href={maximizeTarget}
                className={windowStyles.button}
                aria-label={isFullscreen ? 'Restore window' : 'Maximize window'}
                title={isFullscreen ? 'Restore' : 'Maximize'}
              >
                {maximizeIcon}
              </a>
            ) : (
              <button
                type="button"
                onClick={toggleFullscreen}
                className={windowStyles.button}
                aria-label={isFullscreen ? 'Restore window' : 'Maximize window'}
                title={isFullscreen ? 'Restore' : 'Maximize'}
              >
                {maximizeIcon}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={windowStyles.button}
              aria-label={`Close ${title}`}
            >
              ✕
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">{children}</div>

        {!isFullscreen && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            style={{ touchAction: 'none' }}
            onPointerDown={startResize}
            aria-label="Resize window"
            role="slider"
            aria-valuenow={Math.round(rect.width)}
            tabIndex={0}
          >
            <svg
              className="w-full h-full text-[var(--border-color)]"
              viewBox="0 0 16 16"
            >
              <path d="M16 16L16 12L12 16Z M16 8L8 16Z" fill="currentColor" />
            </svg>
          </div>
        )}
      </div>
    </>
  )
}

function SnapPreview({
  direction,
  rect,
  viewport,
}: {
  direction: SnapDirection
  rect: Rect
  viewport: Size
}) {
  if (!direction) return null

  const target = getSnappedRect(direction, rect, viewport)
  const label =
    direction === 'top'
      ? 'Fullscreen'
      : `Snap ${direction[0].toUpperCase()}${direction.slice(1)}`

  return (
    <div
      className="fixed border-2 border-[var(--border-color)] bg-[var(--lighter-gray)] pointer-events-none z-40 flex items-center justify-center"
      style={{
        left: target.x,
        top: target.y,
        width: target.width,
        height: target.height,
      }}
      role="status"
      aria-live="polite"
    >
      <span className="text-[var(--gray)] text-xs font-mono">{label}</span>
    </div>
  )
}
