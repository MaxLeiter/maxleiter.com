import type { CSSProperties, MouseEvent, ReactNode, TouchEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { getHeaderClassName, windowStyles } from '@lib/window-styles'

/**
 * A draggable, resizable, snappable window.
 *
 * A near-verbatim port of `app/components/desktop/window.tsx`. The two changes
 * are that `router.push` becomes `location.assign` (maximize has always been a
 * navigation, not a resize) and that the window can carry a
 * `view-transition-name` so it pairs with the article it opens into.
 */

type SnapDirection = 'left' | 'right' | 'top' | 'bottom' | null

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
  /** Lets the runtime's `pageswap` handler find this frame. */
  slug?: string
}

interface Point {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

function constrainToViewport(
  width: number,
  height: number,
  x: number,
  y: number,
): Point & Size {
  const maxWidth = window.innerWidth - 40
  const maxHeight = window.innerHeight - 80

  return {
    width: Math.min(width, maxWidth),
    height: Math.min(height, maxHeight),
    x: Math.max(20, Math.min(x, window.innerWidth - width - 20)),
    y: Math.max(60, Math.min(y, window.innerHeight - height - 20)),
  }
}

function getSnapDirection(mouseX: number, mouseY: number): SnapDirection {
  if (mouseX < SNAP_DISTANCE) return 'left'
  if (mouseX > window.innerWidth - SNAP_DISTANCE) return 'right'
  if (mouseY < SNAP_DISTANCE + MENUBAR_HEIGHT) return 'top'
  if (mouseY > window.innerHeight - SNAP_DISTANCE) return 'bottom'
  return null
}

/** True when the pointer went down on the title bar rather than a button. */
function isHeaderDrag(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(el?.closest('.window-header') && !el.closest('button'))
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
  const initial = constrainToViewport(
    defaultWidth,
    defaultHeight,
    defaultX,
    defaultY,
  )

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [position, setPosition] = useState<Point>({
    x: initial.x,
    y: initial.y,
  })
  const [size, setSize] = useState<Size>({
    width: initial.width,
    height: initial.height,
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })
  const [snapPreview, setSnapPreview] = useState<SnapDirection>(null)
  const [isSnapped, setIsSnapped] = useState(false)
  const [preSnapState, setPreSnapState] = useState<{
    position: Point
    size: Size
  } | null>(null)

  // Read inside the pointer-move listener, which is re-registered per drag but
  // must not close over a stale frame's geometry.
  const geometry = useRef({ position, size, dragOffset, isSnapped })
  geometry.current = { position, size, dragOffset, isSnapped }

  useEffect(() => {
    if (window.innerWidth < 768) setIsFullscreen(true)
  }, [])

  const getSnappedGeometry = (
    direction: SnapDirection,
  ): { position: Point; size: Size } | null => {
    const vw = window.innerWidth
    const vh = window.innerHeight

    switch (direction) {
      case 'left':
        return {
          position: { x: 0, y: MENUBAR_HEIGHT },
          size: { width: vw / 2, height: vh - MENUBAR_HEIGHT },
        }
      case 'right':
        return {
          position: { x: vw / 2, y: MENUBAR_HEIGHT },
          size: { width: vw / 2, height: vh - MENUBAR_HEIGHT },
        }
      case 'top':
        return {
          position: { x: 0, y: MENUBAR_HEIGHT },
          size: { width: vw, height: vh - MENUBAR_HEIGHT },
        }
      case 'bottom':
        return {
          position: {
            x: geometry.current.position.x,
            y: (vh - MENUBAR_HEIGHT) / 2 + MENUBAR_HEIGHT,
          },
          size: {
            width: geometry.current.size.width,
            height: (vh - MENUBAR_HEIGHT) / 2,
          },
        }
      default:
        return null
    }
  }

  /** Shared by mouse and touch: a snapped window pops back to its old size. */
  const beginDrag = (clientX: number, clientY: number) => {
    if (isSnapped && preSnapState) {
      const restoredWidth = preSnapState.size.width
      setSize(preSnapState.size)
      setPosition({ x: clientX - restoredWidth / 2, y: clientY - 16 })
      setDragOffset({ x: restoredWidth / 2, y: 16 })
      setIsSnapped(false)
      setPreSnapState(null)
    } else {
      setDragOffset({ x: clientX - position.x, y: clientY - position.y })
    }
    setIsDragging(true)
  }

  const handleMouseDown = (event: MouseEvent) => {
    if (isFullscreen) return
    if (isHeaderDrag(event.target)) beginDrag(event.clientX, event.clientY)
  }

  const handleTouchStart = (event: TouchEvent) => {
    if (isFullscreen) return
    if (!isHeaderDrag(event.target)) return
    const touch = event.touches[0]
    beginDrag(touch.clientX, touch.clientY)
    event.preventDefault()
  }

  const startResize = (event: { stopPropagation: () => void }) => {
    if (isFullscreen) return
    event.stopPropagation()
    setIsResizing(true)
  }

  const toggleFullscreen = () => {
    if (maximizeHref) {
      location.assign(isFullscreen ? '/' : maximizeHref)
      return
    }
    setIsFullscreen(!isFullscreen)
  }

  useEffect(() => {
    if (!isDragging && !isResizing) return

    const move = (clientX: number, clientY: number) => {
      const current = geometry.current
      if (isDragging) {
        setPosition({
          x: clientX - current.dragOffset.x,
          y: clientY - current.dragOffset.y,
        })
        setSnapPreview(getSnapDirection(clientX, clientY))
      }
      if (isResizing) {
        setSize({
          width: Math.max(MIN_WIDTH, clientX - current.position.x),
          height: Math.max(MIN_HEIGHT, clientY - current.position.y),
        })
      }
    }

    const end = (clientX: number, clientY: number) => {
      if (isDragging) {
        const direction = getSnapDirection(clientX, clientY)
        const snapped = direction && getSnappedGeometry(direction)
        if (snapped) {
          const current = geometry.current
          if (!current.isSnapped) {
            setPreSnapState({
              position: current.position,
              size: current.size,
            })
          }
          setPosition(snapped.position)
          setSize(snapped.size)
          setIsSnapped(true)
        }
        setSnapPreview(null)
      }
      setIsDragging(false)
      setIsResizing(false)
    }

    const onMouseMove = (event: globalThis.MouseEvent) =>
      move(event.clientX, event.clientY)
    const onMouseUp = (event: globalThis.MouseEvent) =>
      end(event.clientX, event.clientY)

    const onTouchMove = (event: globalThis.TouchEvent) => {
      event.preventDefault()
      const touch = event.touches[0]
      if (touch) move(touch.clientX, touch.clientY)
    }
    const onTouchEnd = (event: globalThis.TouchEvent) => {
      const touch = event.changedTouches[0]
      if (touch) end(touch.clientX, touch.clientY)
      else end(0, 0)
    }

    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)

    return () => {
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, isResizing])

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
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
        }),
    ...(transitionName ? { viewTransitionName: transitionName } : null),
  }

  return (
    <>
      <SnapPreview direction={snapPreview} position={position} size={size} />
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the frame owns click-to-focus and drag-to-move for the whole window; moving the handlers to the header alone would stop a click in the body raising the window. */}
      <div
        className="fixed border border-[var(--border-color)] rounded-lg flex flex-col font-mono text-sm"
        style={frameStyle}
        data-slug={slug}
        onMouseDown={(event) => {
          handleMouseDown(event)
          onFocus?.()
        }}
        onTouchStart={(event) => {
          handleTouchStart(event)
          onFocus?.()
        }}
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="false"
      >
        <header
          className={getHeaderClassName(isFullscreen)}
          style={windowStyles.translucentBg}
        >
          <h3 id={titleId} className={windowStyles.title}>
            {title}
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleFullscreen}
              className={windowStyles.button}
              aria-label={isFullscreen ? 'Restore window' : 'Maximize window'}
              title={isFullscreen ? 'Restore' : 'Maximize'}
            >
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
            </button>
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
            onMouseDown={startResize}
            onTouchStart={(event) => {
              event.preventDefault()
              startResize(event)
            }}
            aria-label="Resize window"
            role="slider"
            aria-valuenow={Math.round(size.width)}
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
  position,
  size,
}: {
  direction: SnapDirection
  position: Point
  size: Size
}) {
  if (!direction) return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  const half = (vh - MENUBAR_HEIGHT) / 2

  const previews: Record<
    Exclude<SnapDirection, null>,
    { style: CSSProperties; label: string }
  > = {
    left: {
      style: { left: 0, top: MENUBAR_HEIGHT, width: vw / 2, height: vh - 40 },
      label: 'Snap Left',
    },
    right: {
      style: {
        left: vw / 2,
        top: MENUBAR_HEIGHT,
        width: vw / 2,
        height: vh - MENUBAR_HEIGHT,
      },
      label: 'Snap Right',
    },
    top: {
      style: {
        left: 0,
        top: MENUBAR_HEIGHT,
        width: vw,
        height: vh - MENUBAR_HEIGHT,
      },
      label: 'Fullscreen',
    },
    bottom: {
      style: {
        left: position.x,
        top: half + MENUBAR_HEIGHT,
        width: size.width,
        height: half,
      },
      label: 'Snap Bottom',
    },
  }

  const preview = previews[direction]

  return (
    <div
      className="fixed border-2 border-[var(--border-color)] bg-[var(--lighter-gray)] pointer-events-none z-40 flex items-center justify-center"
      style={preview.style}
      role="status"
      aria-live="polite"
    >
      <span className="text-[var(--gray)] text-xs font-mono">
        {preview.label}
      </span>
    </div>
  )
}
