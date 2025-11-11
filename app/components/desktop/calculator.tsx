'use client'

import { useEffect, useRef, useState } from 'react'

export function Calculator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const emulatorRef = useRef<any>(null)

  useEffect(() => {
    let cleanup: (() => void) | null = null

    const initEmulator = async () => {
      try {
        console.log('Initializing KnightOS emulator...')

        // Load RequireJS if not already loaded
        if (!(window as any).require || !(window as any).require.config) {
          console.log('Loading RequireJS...')
          await loadScript('/knightos/require.min.js')
          // Wait a bit for RequireJS to initialize
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        // Configure RequireJS
        const requireJS = (window as any).require
        if (!requireJS || !requireJS.config) {
          console.error('RequireJS object:', requireJS)
          throw new Error('RequireJS failed to load')
        }

        console.log('Configuring RequireJS...')
        requireJS.config({
          baseUrl: '/knightos',
          paths: {
            'z80e': 'z80e'
          },
          shim: {
            'kpack': { exports: 'exports' },
            'genkfs': { exports: 'exports' },
            'scas': { exports: 'exports' },
            'z80e': { exports: 'exports' },
            'ide_emu': { exports: 'exports' },
          },
        })

        // Initialize toolchain object
        ;(window as any).toolchain = {
          kpack: null,
          genkfs: null,
          scas: null,
          z80e: null,
          ide_emu: null,
          kernel_rom: null,
        }

        // Download kernel from local copy
        console.log('Downloading kernel...')
        const kernelResponse = await fetch('/knightos/kernel-TI84pSE.rom')
        const kernelData = await kernelResponse.arrayBuffer()
        ;(window as any).toolchain.kernel_rom = new Uint8Array(kernelData)
        console.log('Kernel loaded')

        let modulesLoaded = 0
        const totalModules = 4

        const checkAndInit = async () => {
          modulesLoaded++
          console.log(`Modules loaded: ${modulesLoaded}/${totalModules}`)

          if (modulesLoaded === totalModules) {
            console.log('All modules loaded, initializing...')
            try {
              const toolchain = (window as any).toolchain

              // Set up filesystem exactly like TKO does
              console.log('Setting up filesystem...')

              // Helper to safely create directory
              const safeMkdir = (fs: any, path: string) => {
                try {
                  fs.mkdir(path)
                } catch (e: any) {
                  if (!e.message?.includes('File exists')) {
                    throw e
                  }
                }
              }

              toolchain.genkfs.FS.writeFile('/kernel.rom', toolchain.kernel_rom, {
                encoding: 'binary',
              })
              safeMkdir(toolchain.genkfs.FS, '/root')
              safeMkdir(toolchain.genkfs.FS, '/root/etc')
              safeMkdir(toolchain.kpack.FS, '/packages')
              safeMkdir(toolchain.kpack.FS, '/pkgroot')
              safeMkdir(toolchain.kpack.FS, '/pkgroot/include')
              safeMkdir(toolchain.scas.FS, '/include')

              // Install core KnightOS packages
              console.log('Installing core packages...')
              await installPackage('core', 'init')
              await installPackage('core', 'kernel-headers')
              await installPackage('core', 'corelib')

              // Verify includes were copied
              console.log('Checking includes...')
              try {
                const includeFiles = toolchain.scas.FS.readdir('/include')
                console.log('Include files:', includeFiles)
              } catch (e) {
                console.error('Failed to read includes:', e)
              }

              // Load and compile hello world program
              console.log('Loading hello world program...')
              const helloAsmResponse = await fetch('/knightos/hello-world.asm')
              const helloAsmText = await helloAsmResponse.text()

              // Write the ASM file to scas filesystem
              toolchain.scas.FS.writeFile('/hello.asm', helloAsmText)

              // Assemble the program
              console.log('Assembling program...')
              const errorLog: string[] = []
              const logOutput: string[] = []
              const oldError = (window as any).ide_error
              const oldLog = (window as any).ide_log

              ;(window as any).ide_error = (text: string) => {
                console.error('Assembly error:', text)
                errorLog.push(text)
                if (oldError) oldError(text)
              }

              ;(window as any).ide_log = (text: string) => {
                console.log('Assembly log:', text)
                logOutput.push(text)
                if (oldLog) oldLog(text)
              }

              // Try to capture all output from scas
              let scasOutput = ''
              const oldPrint = toolchain.scas.Module.print
              const oldPrintErr = toolchain.scas.Module.printErr

              toolchain.scas.Module.print = (text: string) => {
                console.log('scas stdout:', text)
                scasOutput += text + '\n'
                if (oldPrint) oldPrint(text)
              }

              toolchain.scas.Module.printErr = (text: string) => {
                console.error('scas stderr:', text)
                scasOutput += 'ERROR: ' + text + '\n'
                if (oldPrintErr) oldPrintErr(text)
              }

              // Check that kernel.inc exists and can be read
              try {
                const kernelIncData = toolchain.scas.FS.readFile('/include/kernel.inc', { encoding: 'utf8' })
                console.log('kernel.inc length:', kernelIncData.length)
                console.log('kernel.inc first 500 chars:', kernelIncData.substring(0, 500))

                // Check for pcall macro
                if (kernelIncData.includes('pcall')) {
                  console.log('✓ kernel.inc contains pcall macro')
                } else {
                  console.error('✗ kernel.inc does NOT contain pcall macro!')
                }

                // Try to read macros.inc directly
                const macrosInc = toolchain.scas.FS.readFile('/include/macros.inc', { encoding: 'utf8' })
                console.log('macros.inc length:', macrosInc.length)
                if (macrosInc.includes('pcall')) {
                  console.log('✓ macros.inc contains pcall')
                  console.log('pcall definition snippet:', macrosInc.substring(macrosInc.indexOf('pcall'), macrosInc.indexOf('pcall') + 200))
                }
              } catch (e) {
                console.error('Failed to read includes:', e)
              }

              // TKO uses exact same command - just /main.asm, -I/include/, -o, executable
              console.log('Calling scas with:', ['/hello.asm', '-I/include/', '-o', 'executable'])
              const result = toolchain.scas.Module.callMain(['/hello.asm', '-I/include/', '-o', 'executable'])
              console.log('scas return code:', result)

              toolchain.scas.Module.print = oldPrint
              toolchain.scas.Module.printErr = oldPrintErr
              ;(window as any).ide_error = oldError
              ;(window as any).ide_log = oldLog

              console.log('Full scas output:', scasOutput)
              console.log('Assembly log output:', logOutput)
              console.log('Assembly error output:', errorLog)

              // List files in root to debug
              console.log('Files in scas root:', toolchain.scas.FS.readdir('/'))

              // Check if assembly succeeded
              if (!toolchain.scas.FS.analyzePath('/executable').exists) {
                console.error('Assembly errors:', errorLog)
                console.error('Executable not found at /executable')
                throw new Error('Assembly failed: ' + (errorLog.length > 0 ? errorLog.join('; ') : 'No output file created'))
              }

              console.log('Assembly successful!')

              // Read the assembled executable
              const executable = toolchain.scas.FS.readFile('/executable', { encoding: 'binary' })

              // Write executable to genkfs filesystem
              toolchain.genkfs.FS.writeFile('/root/bin/hello', executable, { encoding: 'binary' })

              // Set up inittab to boot to hello program
              console.log('Setting up inittab to boot hello...')
              toolchain.genkfs.FS.writeFile('/root/etc/inittab', '/bin/hello')

              // Generate ROM with filesystem (THIS IS THE KEY STEP!)
              console.log('Generating ROM...')
              toolchain.genkfs.FS.writeFile('/kernel.rom', new Uint8Array(toolchain.kernel_rom), {
                encoding: 'binary',
              })
              toolchain.genkfs.Module.callMain(['/kernel.rom', '/root'])
              const rom = toolchain.genkfs.FS.readFile('/kernel.rom', { encoding: 'binary' })

              // Create emulator instance
              if (canvasRef.current) {
                console.log('Creating emulator...')
                const ide_emu = toolchain.ide_emu
                const emu = new ide_emu(canvasRef.current)
                emulatorRef.current = emu

                console.log('Loading ROM into emulator...')
                emu.load_rom(rom.buffer)

                console.log('Emulator ready!')
                setLoading(false)
              }
            } catch (err) {
              console.error('Error initializing emulator:', err)
              setError(err instanceof Error ? err.message : 'Failed to initialize')
            }
          }
        }

        // Load modules one at a time like the original - using exact same paths as TKO
        console.log('Loading scas...')
        requireJS(['scas'], (scas: any) => {
          console.log('scas loaded')
          ;(window as any).toolchain.scas = scas
          // Only call preRun if it has entries
          if (scas.Module.preRun && scas.Module.preRun.length > 0) {
            scas.Module.preRun.pop()()
          }
          checkAndInit()
        })

        console.log('Loading kpack...')
        requireJS(['kpack'], (kpack: any) => {
          console.log('kpack loaded')
          ;(window as any).toolchain.kpack = kpack
          checkAndInit()
        })

        console.log('Loading genkfs...')
        requireJS(['genkfs'], (genkfs: any) => {
          console.log('genkfs loaded')
          ;(window as any).toolchain.genkfs = genkfs
          checkAndInit()
        })

        console.log('Loading ide_emu...')
        requireJS(['ide_emu'], (ide_emu: any) => {
          console.log('ide_emu loaded')
          ;(window as any).toolchain.ide_emu = ide_emu
          ;(window as any).toolchain.z80e = requireJS('z80e')
          checkAndInit()
        })

        cleanup = () => {
          if (emulatorRef.current && emulatorRef.current.cleanup) {
            emulatorRef.current.cleanup()
          }
        }
      } catch (err) {
        console.error('Error loading scripts:', err)
        setError(err instanceof Error ? err.message : 'Failed to load')
        setLoading(false)
      }
    }

    initEmulator()

    return () => {
      if (cleanup) cleanup()
    }
  }, [])

  return (
    <div className="h-full flex flex-col items-center justify-center bg-black p-4">
      {loading && (
        <div className="text-white/70 text-sm font-mono mb-4">
          Loading KnightOS...
        </div>
      )}
      {error && (
        <div className="text-red-400 text-sm font-mono mb-4">
          Error: {error}
        </div>
      )}
      <div className="relative">
        <img
          src="/knightos/skin.png"
          alt="Calculator"
          className="pointer-events-none"
          style={{ imageRendering: 'pixelated' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute"
          style={{
            top: '52px',
            left: '28px',
            width: '384px',
            height: '256px',
            imageRendering: 'pixelated',
          }}
          width={384}
          height={256}
        />
      </div>
      {!loading && !error && (
        <div className="mt-4 text-white/50 text-xs font-mono text-center">
          Click the screen to focus. Use arrow keys, F1-F5, Enter, and Esc.
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

async function installPackage(repo: string, name: string): Promise<void> {
  const fullName = `${repo}/${name}`
  console.log(`Installing ${fullName}`)

  const response = await fetch(`/knightos/packages/${repo}-${name}.pkg`)
  if (!response.ok) {
    throw new Error(`Failed to load package ${fullName}: ${response.status}`)
  }
  const data = await response.arrayBuffer()

  const kpack = (window as any).toolchain.kpack
  const fileName = `/packages/${repo}-${name}.pkg`

  kpack.FS.writeFile(fileName, new Uint8Array(data), { encoding: 'binary' })
  kpack.Module.callMain(['-e', fileName, '/pkgroot'])

  // Copy to other filesystems
  const scas = (window as any).toolchain.scas
  const genkfs = (window as any).toolchain.genkfs

  copyBetweenSystems(kpack.FS, scas.FS, '/pkgroot/include', '/include', 'utf8')
  copyBetweenSystems(kpack.FS, genkfs.FS, '/pkgroot', '/root', 'binary')
}

function copyBetweenSystems(
  fs1: any,
  fs2: any,
  from: string,
  to: string,
  encoding: string
) {
  const files = fs1.readdir(from)
  for (const f of files) {
    if (f === '.' || f === '..') continue

    const fs1p = `${from}/${f}`
    const fs2p = `${to}/${f}`
    const stat = fs1.stat(fs1p)

    if (fs1.isDir(stat.mode)) {
      try {
        fs2.mkdir(fs2p)
      } catch {}
      copyBetweenSystems(fs1, fs2, fs1p, fs2p, encoding)
    } else {
      fs2.writeFile(fs2p, fs1.readFile(fs1p, { encoding }), { encoding })
    }
  }
}
