'use client'

import { Spinner } from '@components/spinner'
import { useEffect, useRef, useState } from 'react'

export function Calculator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const emulatorRef = useRef<any>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [scale, setScale] = useState(1)
  const [showKeyboard, setShowKeyboard] = useState(false)

  // Key mappings from ide_emu.js
  const keyMappings: { [key: string]: number } = {
    down: 0x00,
    left: 0x01,
    right: 0x02,
    up: 0x03,
    '2nd': 0x65,
    enter: 0x10,
    mode: 0x66,
    'y=': 0x64,
    window: 0x63,
    zoom: 0x62,
    trace: 0x61,
    graph: 0x60,
    '0': 0x40,
    '1': 0x41,
    '2': 0x31,
    '3': 0x21,
    '4': 0x42,
    '5': 0x32,
    '6': 0x22,
    '7': 0x43,
    '8': 0x33,
    '9': 0x23,
  }

  const pressKey = (keyCode: number) => {
    if (emulatorRef.current?.asic?.hardware?.Keyboard) {
      try {
        emulatorRef.current.asic.hardware.Keyboard.press(keyCode)
        setTimeout(() => {
          emulatorRef.current.asic.hardware.Keyboard.release(keyCode)
        }, 100)
      } catch (err) {
        console.error('Key press error:', err)
      }
    }
  }

  // Handle responsive scaling based on parent container
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const parent =
          containerRef.current.parentElement?.parentElement?.parentElement
        if (!parent) return

        const parentWidth = parent.clientWidth
        const parentHeight = parent.clientHeight
        const calculatorWidth = 645
        const calculatorHeight = 422

        // Reserve space for keyboard (roughly 400px) and other UI elements
        const availableHeight = parentHeight - 450

        const scaleX = (parentWidth - 80) / calculatorWidth
        const scaleY = (availableHeight - 80) / calculatorHeight
        const newScale = Math.min(scaleX, scaleY, 2.0) // Allow up to 2x scale

        setScale(Math.max(newScale, 0.4)) // Minimum 0.4x scale
      }
    }

    updateScale()
    window.addEventListener('resize', updateScale)

    const resizeObserver = new ResizeObserver(updateScale)
    if (containerRef.current?.parentElement?.parentElement?.parentElement) {
      resizeObserver.observe(
        containerRef.current.parentElement.parentElement.parentElement,
      )
    }

    return () => {
      window.removeEventListener('resize', updateScale)
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    let cleanup: (() => void) | null = null

    const initEmulator = async () => {
      try {
        if (!(window as any).require || !(window as any).require.config) {
          console.log('Loading RequireJS...')
          await loadScript('/knightos/require.min.js')
          await new Promise((resolve) => setTimeout(resolve, 200))
        }

        const requireJS = (window as any).require
        if (!requireJS || !requireJS.config) {
          throw new Error('RequireJS failed to load')
        }

        requireJS.config({
          baseUrl: '/knightos',
          paths: {
            z80e: 'z80e',
          },
          shim: {
            z80e: { exports: 'exports' },
            ide_emu: { exports: 'exports' },
          },
        })

        const romResponse = await fetch('/knightos/KnightOS-TI84pSE.rom')
        if (!romResponse.ok) {
          throw new Error(`Failed to load ROM: ${romResponse.status}`)
        }
        const romData = await romResponse.arrayBuffer()

        requireJS(['ide_emu'], (ide_emu: any) => {
          if (canvasRef.current) {
            const emu = new ide_emu(canvasRef.current)
            emulatorRef.current = emu

            emu.load_rom(romData)

            setLoading(false)

            // Send Y= command after 2 seconds to fix emulation bug
            setTimeout(() => {
              if (emu && pressKey(keyMappings['y='])) {
                emu.sendKeys('Y=')
              }
            }, 2500)
          }
        })

        cleanup = () => {
          if (emulatorRef.current && emulatorRef.current.cleanup) {
            emulatorRef.current.cleanup()
          }
        }
      } catch (err) {
        console.error('Error loading emulator:', err)
        setLoading(false)
      }
    }

    initEmulator()

    return () => {
      if (cleanup) cleanup()
    }
  }, [])

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-[var(--bg)] p-2 sm:p-4 relative overflow-auto">
      {/* Info Icon */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-[var(--lightest-gray)] hover:bg-[var(--gray)] flex items-center justify-center text-[var(--gray)] hover:text-[var(--fg)] transition-colors text-sm"
        aria-label="Info about KnightOS"
      >
        i
      </button>

      {showInfo && (
        <div className="absolute top-10 right-2 z-10 bg-[var(--bg)] border border-[var(--border-color)] rounded p-3 max-w-xs text-xs text-[var(--fg)] shadow-xl">
          <h3 className="font-semibold mb-1 text-[var(--fg)]">
            KnightOS Emulator
          </h3>
          <p className="text-[var(--gray)] leading-relaxed text-xs">
            Running KnightOS, an open-source OS for TI calculators. Fully
            functional TI-84+ SE emulator in your browser. The first project I
            ever contributed to.
          </p>
          <button
            onClick={() => setShowInfo(false)}
            className="mt-2 text-xs text-[var(--gray)] hover:text-[var(--fg)]"
          >
            Close
          </button>
        </div>
      )}

      <div
        className="shrink-0 mb-2 flex justify-center w-full"
        style={{
          height: `${422 * scale}px`,
        }}
      >
        <div
          ref={containerRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <div
            className="relative"
            style={{
              width: '645px',
              height: '422px',
              backgroundImage: 'url(/knightos/skin.png)',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              margin: '0 auto',
            }}
          >
            <canvas
              ref={canvasRef}
              className="absolute"
              style={{
                top: '130px',
                left: '122px',
                backgroundColor: '#97af97',
                imageRendering: 'pixelated',
              }}
              width={385}
              height={256}
            />
          </div>
        </div>
      </div>

      {!loading && (
        <div className="shrink-0 w-full max-w-md px-2">
          <div className="text-[var(--gray)] text-xs font-mono text-center mb-2">
            Click screen to focus • Arrow keys & numbers
          </div>

          <button
            onClick={() => setShowKeyboard(!showKeyboard)}
            className="w-full mb-2 px-3 py-2 bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] hover:text-[var(--fg)] rounded text-sm transition-colors border border-[var(--border-color)]"
          >
            {showKeyboard ? '▼ Hide Keyboard' : '▲ Show Keyboard'}
          </button>

          {showKeyboard && (
            <div className="w-full p-3 bg-[var(--bg)] border border-[var(--border-color)] rounded">
              <div className="grid gap-2">
                {/* Arrow Keys */}
                <div className="flex justify-center mb-2">
                  <div
                    className="grid grid-cols-3 gap-1"
                    style={{ maxWidth: '180px' }}
                  >
                    <div></div>
                    <button
                      onClick={() => pressKey(keyMappings['up'])}
                      className="bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] font-bold py-2 px-3 rounded text-sm active:bg-[var(--gray)]"
                    >
                      ↑
                    </button>
                    <div></div>
                    <button
                      onClick={() => pressKey(keyMappings['left'])}
                      className="bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] font-bold py-2 px-3 rounded text-sm active:bg-[var(--gray)]"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => pressKey(keyMappings['enter'])}
                      className="bg-[var(--gray)] hover:text-[var(--fg)] text-[var(--fg)] border border-[var(--border-color)] font-bold py-2 px-2 rounded text-xs active:bg-[var(--gray)]"
                    >
                      ENTER
                    </button>
                    <button
                      onClick={() => pressKey(keyMappings['right'])}
                      className="bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] font-bold py-2 px-3 rounded text-sm active:bg-[var(--gray)]"
                    >
                      →
                    </button>
                    <div></div>
                    <button
                      onClick={() => pressKey(keyMappings['down'])}
                      className="bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] font-bold py-2 px-3 rounded text-sm active:bg-[var(--gray)]"
                    >
                      ↓
                    </button>
                    <div></div>
                  </div>
                </div>

                {/* Function Keys */}
                <div className="grid grid-cols-5 gap-1 mb-2">
                  <button
                    onClick={() => pressKey(keyMappings['y='])}
                    className="bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] text-xs py-2 px-1 rounded active:bg-[var(--gray)]"
                  >
                    Y=
                  </button>
                  <button
                    onClick={() => pressKey(keyMappings['window'])}
                    className="bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] text-xs py-2 px-1 rounded active:bg-[var(--gray)]"
                  >
                    WIN
                  </button>
                  <button
                    onClick={() => pressKey(keyMappings['zoom'])}
                    className="bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] text-xs py-2 px-1 rounded active:bg-[var(--gray)]"
                  >
                    ZM
                  </button>
                  <button
                    onClick={() => pressKey(keyMappings['trace'])}
                    className="bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] text-xs py-2 px-1 rounded active:bg-[var(--gray)]"
                  >
                    TRC
                  </button>
                  <button
                    onClick={() => pressKey(keyMappings['graph'])}
                    className="bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] text-xs py-2 px-1 rounded active:bg-[var(--gray)]"
                  >
                    GRF
                  </button>
                </div>

                {/* Number Pad */}
                <div className="grid grid-cols-3 gap-2">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((num) => (
                    <button
                      key={num}
                      onClick={() => pressKey(keyMappings[num])}
                      className="bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] font-bold py-3 px-4 rounded active:bg-[var(--gray)]"
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    onClick={() => pressKey(keyMappings['2nd'])}
                    className="bg-[var(--gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] font-bold py-2 px-3 rounded text-xs active:bg-[var(--gray)]"
                  >
                    2nd
                  </button>
                  <button
                    onClick={() => pressKey(keyMappings['0'])}
                    className="bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] font-bold py-2 px-4 rounded active:bg-[var(--gray)]"
                  >
                    0
                  </button>
                  <button
                    onClick={() => pressKey(keyMappings['mode'])}
                    className="bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] font-bold py-2 px-3 rounded text-xs active:bg-[var(--gray)]"
                  >
                    MODE
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      console.log(`Script already loaded: ${src}`)
      resolve()
      return
    }

    console.log(`Loading script: ${src}`)
    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.onload = () => {
      console.log(`Script loaded successfully: ${src}`)
      resolve()
    }
    script.onerror = (e) => {
      console.error(`Failed to load script: ${src}`, e)
      reject(new Error(`Failed to load ${src}`))
    }
    document.head.appendChild(script)
  })
}
