"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"

interface WindowProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  defaultWidth?: number
  defaultHeight?: number
  defaultX?: number
  defaultY?: number
}

type SnapDirection = "left" | "right" | "top" | "bottom" | null

export function Window({
  title,
  onClose,
  children,
  defaultWidth = 600,
  defaultHeight = 400,
  defaultX = 100,
  defaultY = 100,
}: WindowProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [position, setPosition] = useState({ x: defaultX, y: defaultY })
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [snapPreview, setSnapPreview] = useState<SnapDirection>(null)
  const [isClosing, setIsClosing] = useState(false)

  const windowRef = useRef<HTMLDivElement>(null)

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

    if (mouseX < SNAP_DISTANCE) return "left"
    if (mouseX > windowWidth - SNAP_DISTANCE) return "right"
    if (mouseY < SNAP_DISTANCE + 40) return "top"
    if (mouseY > windowHeight - SNAP_DISTANCE) return "bottom"

    return null
  }

  const getSnappedPosition = (direction: SnapDirection) => {
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    switch (direction) {
      case "left":
        return {
          position: { x: 0, y: 40 },
          size: { width: windowWidth / 2, height: windowHeight - 40 },
        }
      case "right":
        return {
          position: { x: windowWidth / 2, y: 40 },
          size: { width: windowWidth / 2, height: windowHeight - 40 },
        }
      case "top":
        return {
          position: { x: position.x, y: 40 },
          size: { width: size.width, height: (windowHeight - 40) / 2 },
        }
      case "bottom":
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
    if ((e.target as HTMLElement).closest(".window-header") && !(e.target as HTMLElement).closest("button")) {
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isFullscreen) return
    e.stopPropagation()
    setIsResizing(true)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleClose = () => {
    const isJuiced = document.body.classList.contains('juice-mode')
    if (isJuiced) {
      setIsClosing(true)
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

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        const snapDir = getSnapDirection(e.clientX, e.clientY)
        if (snapDir) {
          const snapped = getSnappedPosition(snapDir)
          if (snapped) {
            setPosition(snapped.position)
            setSize(snapped.size)
          }
        }
        setSnapPreview(null)
      }
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, isResizing, dragOffset, position])

  const renderSnapPreview = () => {
    if (!snapPreview) return null

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    let previewStyle: React.CSSProperties = {}
    let label = ""

    switch (snapPreview) {
      case "left":
        previewStyle = {
          left: 0,
          top: 40,
          width: windowWidth / 2,
          height: windowHeight - 40,
        }
        label = "Snap Left"
        break
      case "right":
        previewStyle = {
          left: windowWidth / 2,
          top: 40,
          width: windowWidth / 2,
          height: windowHeight - 40,
        }
        label = "Snap Right"
        break
      case "top":
        previewStyle = {
          left: position.x,
          top: 40,
          width: size.width,
          height: (windowHeight - 40) / 2,
        }
        label = "Snap Top"
        break
      case "bottom":
        previewStyle = {
          left: position.x,
          top: (windowHeight - 40) / 2 + 40,
          width: size.width,
          height: (windowHeight - 40) / 2,
        }
        label = "Snap Bottom"
        break
    }

    return (
      <div
        className="fixed border-2 border-white/30 bg-white/5 pointer-events-none z-40 flex items-center justify-center"
        style={previewStyle}
        role="status"
        aria-live="polite"
      >
        <span className="text-white/50 text-xs font-mono">{label}</span>
      </div>
    )
  }

  const windowStyle: React.CSSProperties = isFullscreen
    ? {
        left: 0,
        top: "40px",
        width: "100%",
        height: "calc(100vh - 40px)",
        backdropFilter: "blur(12px)",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
      }
    : {
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        backdropFilter: "blur(12px)",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
      }

  return (
    <>
      {renderSnapPreview()}
      <div
        ref={windowRef}
        className={`fixed bg-black border border-white/20 rounded-lg flex flex-col font-mono text-sm z-50 ${
          isClosing ? 'window-closing' : ''
        }`}
        style={windowStyle}
        onMouseDown={handleMouseDown}
        role="dialog"
        aria-label={title}
      >
        {/* Window Header */}
        <div
          className={`window-header h-8 bg-white/5 border-b border-white/10 flex items-center justify-between px-3 rounded-t-lg select-none ${
            !isFullscreen ? "cursor-move" : ""
          }`}
        >
          <span className="text-white/60 text-xs">{title}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleFullscreen}
              className="text-white/50 hover:text-white/80 hover:bg-white/10 w-5 h-5 rounded flex items-center justify-center text-xs transition-colors"
              aria-label={isFullscreen ? "Restore window" : "Maximize window"}
              title={isFullscreen ? "Restore" : "Maximize"}
            >
              {isFullscreen ? (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <rect x="4" y="4" width="8" height="8" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
            </button>
            <button
              onClick={handleClose}
              className="text-white/50 hover:text-white/80 hover:bg-white/10 w-5 h-5 rounded flex items-center justify-center text-xs transition-colors"
              aria-label={`Close ${title}`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Window Content */}
        <div className="flex-1 overflow-hidden">{children}</div>

        {!isFullscreen && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={handleResizeMouseDown}
            aria-label="Resize window"
            role="slider"
            tabIndex={0}
          >
            <svg className="w-full h-full text-white/20" viewBox="0 0 16 16">
              <path d="M16 16L16 12L12 16Z M16 8L8 16Z" fill="currentColor" />
            </svg>
          </div>
        )}
      </div>
    </>
  )
}
