'use client'

import type React from 'react'
import { useState, useRef, useEffect, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { windowStyles, getHeaderClassName } from '@lib/window-styles'

interface WindowProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  defaultWidth?: number
  defaultHeight?: number
  defaultX?: number
  defaultY?: number
  blogSlug?: string
  pageType?: 'blog' | 'projects' | 'about' | 'labs' | 'books' | 'talks' | null
  zIndex?: number
  onFocus?: () => void
}

type SnapDirection = 'left' | 'right' | 'top' | 'bottom' | null

export function Window({
  title,
  onClose,
  children,
  defaultWidth = 600,
  defaultHeight = 400,
  defaultX = 100,
  defaultY = 100,
  blogSlug,
  pageType = null,
  zIndex = 50,
  onFocus,
}: WindowProps) {
  // Constrain initial size to viewport
  const constrainToViewport = (
    width: number,
    height: number,
    x: number,
    y: number,
  ) => {
    const maxWidth = window.innerWidth - 40 // Leave 20px padding on each side
    const maxHeight = window.innerHeight - 80 // Leave space for top bar (40px) and padding

    return {
      width: Math.min(width, maxWidth),
      height: Math.min(height, maxHeight),
      x: Math.max(20, Math.min(x, window.innerWidth - width - 20)),
      y: Math.max(60, Math.min(y, window.innerHeight - height - 20)),
    }
  }

  const initialConstraints =
    typeof window !== 'undefined'
      ? constrainToViewport(defaultWidth, defaultHeight, defaultX, defaultY)
      : { width: defaultWidth, height: defaultHeight, x: defaultX, y: defaultY }

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [position, setPosition] = useState({
    x: initialConstraints.x,
    y: initialConstraints.y,
  })
  const [size, setSize] = useState({
    width: initialConstraints.width,
    height: initialConstraints.height,
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [snapPreview, setSnapPreview] = useState<SnapDirection>(null)
  const [isClosing, setIsClosing] = useState(false)
  // Track pre-snap state to restore when unsnapping
  const [isSnapped, setIsSnapped] = useState(false)
  const [preSnapState, setPreSnapState] = useState<{
    position: { x: number; y: number }
    size: { width: number; height: number }
  } | null>(null)

  const windowRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const isMobile = window.innerWidth < 768
    if (isMobile) {
      setIsFullscreen(true)
    }
  }, [])

  const SNAP_DISTANCE = 20

  const getSnapDirection = (mouseX: number, mouseY: number): SnapDirection => {
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    if (mouseX < SNAP_DISTANCE) return 'left'
    if (mouseX > windowWidth - SNAP_DISTANCE) return 'right'
    if (mouseY < SNAP_DISTANCE + 40) return 'top'
    if (mouseY > windowHeight - SNAP_DISTANCE) return 'bottom'

    return null
  }

  const getSnappedPosition = (direction: SnapDirection) => {
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    switch (direction) {
      case 'left':
        return {
          position: { x: 0, y: 40 },
          size: { width: windowWidth / 2, height: windowHeight - 40 },
        }
      case 'right':
        return {
          position: { x: windowWidth / 2, y: 40 },
          size: { width: windowWidth / 2, height: windowHeight - 40 },
        }
      case 'top':
        return {
          position: { x: 0, y: 40 },
          size: { width: windowWidth, height: windowHeight - 40 },
        }
      case 'bottom':
        return {
          position: { x: position.x, y: (windowHeight - 40) / 2 + 40 },
          size: { width: size.width, height: (windowHeight - 40) / 2 },
        }
      default:
        return null
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isFullscreen) return
    if (
      (e.target as HTMLElement).closest('.window-header') &&
      !(e.target as HTMLElement).closest('button')
    ) {
      // If window is snapped, restore pre-snap size and center window on cursor
      if (isSnapped && preSnapState) {
        const restoredWidth = preSnapState.size.width
        // Calculate new position to center the restored window on cursor
        const newX = e.clientX - restoredWidth / 2
        const newY = e.clientY - 16 // Offset to account for header height
        setSize(preSnapState.size)
        setPosition({ x: newX, y: newY })
        setDragOffset({ x: restoredWidth / 2, y: 16 })
        setIsSnapped(false)
        setPreSnapState(null)
      } else {
        setDragOffset({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        })
      }
      setIsDragging(true)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isFullscreen) return
    if (
      (e.target as HTMLElement).closest('.window-header') &&
      !(e.target as HTMLElement).closest('button')
    ) {
      const touch = e.touches[0]
      // If window is snapped, restore pre-snap size and center window on cursor
      if (isSnapped && preSnapState) {
        const restoredWidth = preSnapState.size.width
        const newX = touch.clientX - restoredWidth / 2
        const newY = touch.clientY - 16
        setSize(preSnapState.size)
        setPosition({ x: newX, y: newY })
        setDragOffset({ x: restoredWidth / 2, y: 16 })
        setIsSnapped(false)
        setPreSnapState(null)
      } else {
        setDragOffset({
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
        })
      }
      setIsDragging(true)
      // Prevent scrolling when dragging
      e.preventDefault()
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isFullscreen) return
    e.stopPropagation()
    setIsResizing(true)
  }

  const handleResizeTouchStart = (e: React.TouchEvent) => {
    if (isFullscreen) return
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(true)
  }

  const toggleFullscreen = () => {
    // If this is a blog post window, navigate with View Transitions
    if (blogSlug) {
      if (!isFullscreen) {
        // Going fullscreen - navigate to blog post page
        startTransition(() => {
          router.push(`/blog/${blogSlug}`)
        })
      } else {
        // Exiting fullscreen - navigate back to homepage
        startTransition(() => {
          router.push('/')
        })
      }
    } else if (pageType) {
      // Navigate to the page
      startTransition(() => {
        router.push(`/${pageType}`)
      })
    } else {
      // Regular window - just toggle fullscreen state
      setIsFullscreen(!isFullscreen)
    }
  }

  const createExplosion = (clickX: number, clickY: number) => {
    if (!windowRef.current) return

    const centerX = clickX
    const centerY = clickY

    // Create canvas for particles
    const canvas = document.createElement('canvas')
    canvas.style.position = 'fixed'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '9999'
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    document.body.appendChild(canvas)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Create particles
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      life: number
      size: number
      color: string
    }> = []

    const particleCount = 50
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
    ]

    for (let i = 0; i < particleCount; i++) {
      const angle =
        (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5
      const speed = 5 + Math.random() * 10
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // Slight upward bias
        life: 1,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    // Animate particles
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let aliveCount = 0
      particles.forEach((p) => {
        if (p.life <= 0) return
        aliveCount++

        // Update position
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.3 // Gravity
        p.vx *= 0.98 // Air resistance
        p.life -= 0.02

        // Draw particle
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()

        // Add glow
        ctx.shadowBlur = 10
        ctx.shadowColor = p.color
      })

      if (aliveCount > 0) {
        requestAnimationFrame(animate)
      } else {
        canvas.remove()
      }
    }

    animate()
  }

  const handleClose = (e: React.MouseEvent) => {
    const isJuiced = document.body.classList.contains('juice-mode')
    if (isJuiced) {
      setIsClosing(true)
      createExplosion(e.clientX, e.clientY)
      // Wait for animation to complete before actually closing
      setTimeout(() => {
        onClose()
      }, 600)
    } else {
      onClose()
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y

        setPosition({ x: newX, y: newY })

        const snapDir = getSnapDirection(e.clientX, e.clientY)
        setSnapPreview(snapDir)
      }
      if (isResizing) {
        const newWidth = Math.max(300, e.clientX - position.x)
        const newHeight = Math.max(200, e.clientY - position.y)
        setSize({ width: newWidth, height: newHeight })
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging || isResizing) {
        e.preventDefault() // Prevent scrolling
        const touch = e.touches[0]

        if (isDragging) {
          const newX = touch.clientX - dragOffset.x
          const newY = touch.clientY - dragOffset.y

          setPosition({ x: newX, y: newY })

          const snapDir = getSnapDirection(touch.clientX, touch.clientY)
          setSnapPreview(snapDir)
        }
        if (isResizing) {
          const newWidth = Math.max(300, touch.clientX - position.x)
          const newHeight = Math.max(200, touch.clientY - position.y)
          setSize({ width: newWidth, height: newHeight })
        }
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        const snapDir = getSnapDirection(e.clientX, e.clientY)
        if (snapDir) {
          const snapped = getSnappedPosition(snapDir)
          if (snapped) {
            // Save pre-snap state before snapping (only if not already snapped)
            if (!isSnapped) {
              setPreSnapState({ position, size })
            }
            setPosition(snapped.position)
            setSize(snapped.size)
            setIsSnapped(true)
          }
        }
        setSnapPreview(null)
      }
      setIsDragging(false)
      setIsResizing(false)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDragging && e.changedTouches[0]) {
        const touch = e.changedTouches[0]
        const snapDir = getSnapDirection(touch.clientX, touch.clientY)
        if (snapDir) {
          const snapped = getSnappedPosition(snapDir)
          if (snapped) {
            // Save pre-snap state before snapping (only if not already snapped)
            if (!isSnapped) {
              setPreSnapState({ position, size })
            }
            setPosition(snapped.position)
            setSize(snapped.size)
            setIsSnapped(true)
          }
        }
        setSnapPreview(null)
      }
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      // Prevent text selection while dragging/resizing
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      })
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, isResizing, dragOffset, position, size, isSnapped])

  const renderSnapPreview = () => {
    if (!snapPreview) return null

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    let previewStyle: React.CSSProperties = {}
    let label = ''

    switch (snapPreview) {
      case 'left':
        previewStyle = {
          left: 0,
          top: 40,
          width: windowWidth / 2,
          height: windowHeight - 40,
        }
        label = 'Snap Left'
        break
      case 'right':
        previewStyle = {
          left: windowWidth / 2,
          top: 40,
          width: windowWidth / 2,
          height: windowHeight - 40,
        }
        label = 'Snap Right'
        break
      case 'top':
        previewStyle = {
          left: 0,
          top: 40,
          width: windowWidth,
          height: windowHeight - 40,
        }
        label = 'Fullscreen'
        break
      case 'bottom':
        previewStyle = {
          left: position.x,
          top: (windowHeight - 40) / 2 + 40,
          width: size.width,
          height: (windowHeight - 40) / 2,
        }
        label = 'Snap Bottom'
        break
    }

    return (
      <div
        className="fixed border-2 border-[var(--border-color)] bg-[var(--lighter-gray)] pointer-events-none z-40 flex items-center justify-center"
        style={previewStyle}
        role="status"
        aria-live="polite"
      >
        <span className="text-[var(--gray)] text-xs font-mono">{label}</span>
      </div>
    )
  }

  const windowStyle: React.CSSProperties = isFullscreen
    ? {
        left: 0,
        top: '40px',
        width: '100%',
        height: 'calc(100vh - 40px)',
        backdropFilter: 'blur(12px)',
        backgroundColor: 'var(--bg-window-alpha)',
        zIndex,
      }
    : {
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        backdropFilter: 'blur(12px)',
        backgroundColor: 'var(--bg-window-alpha)',
        zIndex,
      }

  return (
    <>
      {renderSnapPreview()}
      <div
        ref={windowRef}
        className={`fixed border border-[var(--border-color)] rounded-lg flex flex-col font-mono text-sm ${
          isClosing ? 'window-closing' : ''
        }`}
        style={windowStyle}
        onMouseDown={(e) => {
          handleMouseDown(e)
          onFocus?.()
        }}
        onTouchStart={(e) => {
          handleTouchStart(e)
          onFocus?.()
        }}
        role="dialog"
        aria-labelledby={`window-title-${title.replace(/\s+/g, '-')}`}
        aria-modal="false"
      >
        {/* Window Header */}
        <header
          className={getHeaderClassName(isFullscreen)}
          style={windowStyles.translucentBg}
        >
          <h3
            id={`window-title-${title.replace(/\s+/g, '-')}`}
            className={windowStyles.title}
          >
            {title}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleFullscreen}
              className={windowStyles.button}
              aria-label={isFullscreen ? 'Restore window' : 'Maximize window'}
              title={isFullscreen ? 'Restore' : 'Maximize'}
            >
              {isFullscreen ? (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="4"
                    y="4"
                    width="8"
                    height="8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="2"
                    y="2"
                    width="12"
                    height="12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={(e) => handleClose(e)}
              className={windowStyles.button}
              aria-label={`Close ${title}`}
            >
              ✕
            </button>
          </div>
        </header>

        {/* Window Content */}
        <div className="flex-1 overflow-hidden">{children}</div>

        {!isFullscreen && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={handleResizeMouseDown}
            onTouchStart={handleResizeTouchStart}
            aria-label="Resize window"
            role="slider"
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
