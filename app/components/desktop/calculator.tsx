'use client'

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
        console.log('Initializing KnightOS emulator...')

        if (!(window as any).require || !(window as any).require.config) {
          console.log('Loading RequireJS...')
          await loadScript('/knightos/require.min.js')
          await new Promise((resolve) => setTimeout(resolve, 200))
        }

        const requireJS = (window as any).require
        if (!requireJS || !requireJS.config) {
          throw new Error('RequireJS failed to load')
        }

        console.log('Configuring RequireJS...')
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

        console.log('Downloading ROM...')
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
                console.log('Sending Y= command to fix emulation bug')
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
    <div className="h-full w-full flex flex-col items-center justify-start bg-black p-2 sm:p-4 relative overflow-auto">
      {/* Info Icon */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors text-sm"
        aria-label="Info about KnightOS"
      >
        i
      </button>

      {/* Info Tooltip */}
      {showInfo && (
        <div className="absolute top-10 right-2 z-10 bg-black border border-white/20 rounded p-3 max-w-xs text-xs text-white/90 shadow-xl">
          <h3 className="font-semibold mb-1 text-white">KnightOS Emulator</h3>
          <p className="text-white/70 leading-relaxed text-xs">
            Running KnightOS, an open-source OS for TI calculators. Fully
            functional TI-84+ SE emulator in your browser.
          </p>
          <button
            onClick={() => setShowInfo(false)}
            className="mt-2 text-xs text-white/50 hover:text-white/70"
          >
            Close
          </button>
        </div>
      )}

      {loading && (
        <div className="text-white/70 text-sm font-mono mb-4">
          Loading KnightOS...
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
          <div className="text-white/50 text-xs font-mono text-center mb-2">
            Click screen to focus • Arrow keys & numbers
          </div>

          <button
            onClick={() => setShowKeyboard(!showKeyboard)}
            className="w-full mb-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/90 hover:text-white rounded text-sm transition-colors border border-white/20"
          >
            {showKeyboard ? '▼ Hide Keyboard' : '▲ Show Keyboard'}
          </button>

          {showKeyboard && (
            <div className="w-full p-3 bg-black border border-white/20 rounded">
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
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold py-2 px-3 rounded text-sm active:bg-white/30"
                    >
                      ↑
                    </button>
                    <div></div>
                    <button
                      onClick={() => pressKey(keyMappings['left'])}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold py-2 px-3 rounded text-sm active:bg-white/30"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => pressKey(keyMappings['enter'])}
                      className="bg-white/20 hover:bg-white/30 text-white border border-white/40 font-bold py-2 px-2 rounded text-xs active:bg-white/40"
                    >
                      ENTER
                    </button>
                    <button
                      onClick={() => pressKey(keyMappings['right'])}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold py-2 px-3 rounded text-sm active:bg-white/30"
                    >
                      →
                    </button>
                    <div></div>
                    <button
                      onClick={() => pressKey(keyMappings['down'])}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold py-2 px-3 rounded text-sm active:bg-white/30"
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
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/30 text-xs py-2 px-1 rounded active:bg-white/30"
                  >
                    Y=
                  </button>
                  <button
                    onClick={() => pressKey(keyMappings['window'])}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/30 text-xs py-2 px-1 rounded active:bg-white/30"
                  >
                    WIN
                  </button>
                  <button
                    onClick={() => pressKey(keyMappings['zoom'])}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/30 text-xs py-2 px-1 rounded active:bg-white/30"
                  >
                    ZM
                  </button>
                  <button
                    onClick={() => pressKey(keyMappings['trace'])}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/30 text-xs py-2 px-1 rounded active:bg-white/30"
                  >
                    TRC
                  </button>
                  <button
                    onClick={() => pressKey(keyMappings['graph'])}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/30 text-xs py-2 px-1 rounded active:bg-white/30"
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
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold py-3 px-4 rounded active:bg-white/30"
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    onClick={() => pressKey(keyMappings['2nd'])}
                    className="bg-white/20 hover:bg-white/30 text-white border border-white/40 font-bold py-2 px-3 rounded text-xs active:bg-white/40"
                  >
                    2nd
                  </button>
                  <button
                    onClick={() => pressKey(keyMappings['0'])}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold py-2 px-4 rounded active:bg-white/30"
                  >
                    0
                  </button>
                  <button
                    onClick={() => pressKey(keyMappings['mode'])}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold py-2 px-3 rounded text-xs active:bg-white/30"
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
