import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/**
 * The KnightOS TI-84+ SE emulator.
 *
 * Everything it needs is already static under `public/knightos/`: RequireJS, the
 * z80 core and the ROM. This module is only imported when the calculator window
 * opens, so esbuild's code splitting keeps it out of the homepage's entry chunk.
 */

interface Emulator {
  load_rom: (rom: ArrayBuffer) => void
  cleanup?: () => void
  asic?: {
    hardware?: {
      Keyboard?: { press(k: number): void; release(k: number): void }
    }
  }
}

type RequireJs = ((deps: string[], cb: (mod: EmulatorCtor) => void) => void) & {
  config: (options: unknown) => void
}

type EmulatorCtor = new (canvas: HTMLCanvasElement) => Emulator

const KEY_CODES: Record<string, number> = {
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

const SCREEN_WIDTH = 645
const SCREEN_HEIGHT = 422

const KEY_CLASS =
  'bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] rounded active:bg-[var(--gray)]'

/** ENTER and 2nd, which are filled rather than outlined. */
const SPECIAL_KEY_CLASS =
  'bg-[var(--gray)] text-[var(--fg)] border border-[var(--border-color)] rounded active:bg-[var(--gray)]'

const ARROW_CLASS = 'font-bold py-2 px-3 text-sm'
const FUNCTION_CLASS = 'text-xs py-2 px-1'

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

function pressKeyOn(emulator: Emulator | null, keyCode: number): void {
  const keyboard = emulator?.asic?.hardware?.Keyboard
  if (!keyboard) return
  try {
    keyboard.press(keyCode)
    setTimeout(() => keyboard.release(keyCode), 100)
  } catch (error) {
    console.error('Key press error:', error)
  }
}

/**
 * Boots the emulator into a canvas.
 *
 * An effect is unavoidable here, and this is the clearest case of it in the
 * whole island set: it injects a <script> tag for RequireJS, fetches a ROM, and
 * hands a live <canvas> node to a constructor that then draws into it on its
 * own schedule. None of that is expressible as rendering, and the emulator has
 * to be torn down when the window closes.
 */
function useKnightOsEmulator(canvasRef: RefObject<HTMLCanvasElement | null>): {
  loading: boolean
  pressKey: (keyCode: number) => void
} {
  const emulatorRef = useRef<Emulator | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      try {
        const globals = window as unknown as { require?: RequireJs }
        if (!globals.require?.config) {
          // No sleep afterwards: loadScript resolves on the script's own
          // `onload`, so `window.require` is already defined here.
          await loadScript('/knightos/require.min.js')
        }

        const requireJs = globals.require
        if (!requireJs?.config) throw new Error('RequireJS failed to load')

        requireJs.config({
          baseUrl: '/knightos',
          paths: { z80e: 'z80e' },
          shim: {
            z80e: { exports: 'exports' },
            ide_emu: { exports: 'exports' },
          },
        })

        const response = await fetch('/knightos/KnightOS-TI84pSE.rom')
        if (!response.ok) {
          throw new Error(`Failed to load ROM: ${response.status}`)
        }
        const rom = await response.arrayBuffer()
        if (cancelled) return

        requireJs(['ide_emu'], (IdeEmu) => {
          if (cancelled || !canvasRef.current) return
          const emulator = new IdeEmu(canvasRef.current)
          emulatorRef.current = emulator
          emulator.load_rom(rom)
          setLoading(false)
          // Works around an emulation bug that leaves the screen blank.
          setTimeout(() => pressKeyOn(emulator, KEY_CODES['y=']), 2500)
        })
      } catch (error) {
        console.error('Error loading emulator:', error)
        setLoading(false)
      }
    }

    void boot()

    return () => {
      cancelled = true
      emulatorRef.current?.cleanup?.()
    }
  }, [canvasRef])

  return {
    loading,
    pressKey: (keyCode: number) => pressKeyOn(emulatorRef.current, keyCode),
  }
}

/**
 * The emulator is a fixed-size canvas, so it is scaled to fit its window.
 *
 * An effect is required: a ResizeObserver is an external subscription. There is
 * no `window` resize listener beside it, because the observer on the frame
 * already reports every resize that changes the frame's box.
 */
function useScaleToFrame(
  containerRef: RefObject<HTMLDivElement | null>,
): number {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    // `closest` rather than three `parentElement` hops, which broke on any
    // change to the markup in between.
    const frame = containerRef.current?.closest<HTMLElement>('[role="dialog"]')
    if (!frame) return

    const updateScale = () => {
      const available = frame.clientHeight - 450
      const scaleX = (frame.clientWidth - 80) / SCREEN_WIDTH
      const scaleY = (available - 80) / SCREEN_HEIGHT
      setScale(Math.max(Math.min(scaleX, scaleY, 2), 0.4))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [containerRef])

  return scale
}

export default function Calculator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [showKeyboard, setShowKeyboard] = useState(false)

  const { loading, pressKey } = useKnightOsEmulator(canvasRef)
  const scale = useScaleToFrame(containerRef)

  const key = (
    label: string,
    code: string,
    extra: string,
    base = KEY_CLASS,
  ) => (
    <button
      type="button"
      key={code}
      onClick={() => pressKey(KEY_CODES[code])}
      className={`${base} ${extra}`}
    >
      {label}
    </button>
  )

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-[var(--bg)] p-2 sm:p-4 relative overflow-auto">
      <button
        type="button"
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
            type="button"
            onClick={() => setShowInfo(false)}
            className="mt-2 text-xs text-[var(--gray)] hover:text-[var(--fg)]"
          >
            Close
          </button>
        </div>
      )}

      <div
        className="shrink-0 mb-2 flex justify-center w-full"
        style={{ height: `${SCREEN_HEIGHT * scale}px` }}
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
              width: `${SCREEN_WIDTH}px`,
              height: `${SCREEN_HEIGHT}px`,
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
            type="button"
            onClick={() => setShowKeyboard(!showKeyboard)}
            className="w-full mb-2 px-3 py-2 bg-[var(--lightest-gray)] hover:bg-[var(--gray)] text-[var(--fg)] rounded text-sm transition-colors border border-[var(--border-color)]"
          >
            {showKeyboard ? '▼ Hide Keyboard' : '▲ Show Keyboard'}
          </button>

          {showKeyboard && (
            <div className="w-full p-3 bg-[var(--bg)] border border-[var(--border-color)] rounded">
              <div className="grid gap-2">
                <div className="flex justify-center mb-2">
                  <div
                    className="grid grid-cols-3 gap-1"
                    style={{ maxWidth: '180px' }}
                  >
                    <div />
                    {key('↑', 'up', ARROW_CLASS)}
                    <div />
                    {key('←', 'left', ARROW_CLASS)}
                    {key(
                      'ENTER',
                      'enter',
                      'font-bold py-2 px-2 text-xs',
                      SPECIAL_KEY_CLASS,
                    )}
                    {key('→', 'right', ARROW_CLASS)}
                    <div />
                    {key('↓', 'down', ARROW_CLASS)}
                    <div />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1 mb-2">
                  {key('Y=', 'y=', FUNCTION_CLASS)}
                  {key('WIN', 'window', FUNCTION_CLASS)}
                  {key('ZM', 'zoom', FUNCTION_CLASS)}
                  {key('TRC', 'trace', FUNCTION_CLASS)}
                  {key('GRF', 'graph', FUNCTION_CLASS)}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((num) =>
                    key(num, num, 'font-bold py-3 px-4'),
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  {key(
                    '2nd',
                    '2nd',
                    'font-bold py-2 px-3 text-xs',
                    SPECIAL_KEY_CLASS,
                  )}
                  {key('0', '0', 'font-bold py-2 px-4')}
                  {key('MODE', 'mode', 'font-bold py-2 px-3 text-xs')}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
