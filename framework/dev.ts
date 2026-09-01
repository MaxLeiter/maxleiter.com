import { spawn } from 'node:child_process'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { contentTypeFor, resolveRequest } from './routing'

/**
 * The dev server: watch, rebuild, serve, reload.
 *
 * This is the only file allowed to use `Bun.*` APIs; everything in the build
 * path stays runtime-agnostic so `vercel build` can run it under node.
 *
 * There is no Fast Refresh and no error overlay. Editing a component reloads
 * the page and loses component state; the honest accounting is in
 * `docs/rewrite/04-architecture-design.md` section 2.13. The content-hash
 * caches in `.cache/` keep an incremental rebuild to a few hundred ms.
 */

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const STATIC = path.join(ROOT, '.vercel', 'output', 'static')
const PORT = Number(process.env.PORT ?? 3000)
const WATCHED = ['posts', 'notes', 'app', 'framework']

/**
 * A minimal local declaration instead of `@types/bun`: this is the only file
 * that touches a Bun API, and pulling in the full type package would change
 * global types for the whole project.
 */
declare const Bun: {
  serve(options: {
    port: number
    fetch: (request: Request) => Response | Promise<Response>
  }): unknown
}

const RELOAD_SCRIPT =
  '<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>'

const clients = new Set<ReadableStreamDefaultController<Uint8Array>>()
const encoder = new TextEncoder()

function notifyClients(): void {
  for (const controller of clients) {
    try {
      controller.enqueue(encoder.encode('data: reload\n\n'))
    } catch {
      clients.delete(controller)
    }
  }
}

let building: Promise<void> | null = null
let queued = false

/** Long enough to coalesce one save's events, short enough to feel instant. */
const DEBOUNCE_MS = 30
let pending: ReturnType<typeof setTimeout> | undefined

function runBuild(): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now()
    const child = spawn(process.execPath, [path.join(ROOT, 'build.ts')], {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'inherit'],
    })
    child.on('exit', (code) => {
      const label = code === 0 ? 'rebuilt' : `build failed (${code})`
      console.log(`  ${label} in ${Date.now() - started}ms`)
      resolve()
    })
  })
}

async function rebuild(): Promise<void> {
  if (building) {
    queued = true
    return
  }
  building = runBuild()
  await building
  building = null
  if (queued) {
    queued = false
    await rebuild()
    return
  }
  notifyClients()
}

/** The file `framework/routing.ts` resolves this URL to, if it exists. */
async function resolveFile(relative: string): Promise<string | null> {
  const candidate = path.join(STATIC, relative)
  // `..` in a request path must not escape the output tree.
  if (!candidate.startsWith(STATIC)) return null
  try {
    if ((await fsp.stat(candidate)).isFile()) return candidate
  } catch {
    // Not built, or not a file.
  }
  return null
}

async function respond(file: string): Promise<Response> {
  const ext = path.extname(file).toLowerCase()
  const type = contentTypeFor(file)
  if (ext === '.html') {
    const html = await fsp.readFile(file, 'utf8')
    return new Response(html.replace('</body>', `${RELOAD_SCRIPT}</body>`), {
      headers: { 'content-type': type },
    })
  }
  return new Response(await fsp.readFile(file), {
    headers: { 'content-type': type },
  })
}

async function start(): Promise<void> {
  console.log('building...')
  await runBuild()

  for (const dir of WATCHED) {
    const target = path.join(ROOT, dir)
    if (!fs.existsSync(target)) continue
    fs.watch(target, { recursive: true }, (_event, filename) => {
      // The build writes .d.ts files next to CSS modules; ignore its own output.
      if (filename && filename.endsWith('.d.ts')) return
      // One editor save emits both `rename` and `change` on macOS, and the
      // in-flight guard queues the second one into a whole extra build.
      clearTimeout(pending)
      pending = setTimeout(() => void rebuild(), DEBOUNCE_MS)
    })
  }

  Bun.serve({
    port: PORT,
    async fetch(request) {
      const { pathname } = new URL(request.url)

      if (pathname === '/__reload') {
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              clients.add(controller)
            },
            cancel() {
              // The controller is dropped with the stream.
            },
          }),
          {
            headers: {
              'content-type': 'text/event-stream',
              'cache-control': 'no-cache',
              connection: 'keep-alive',
            },
          },
        )
      }

      // The same rules config.json runs on: trailing slash, redirects, the
      // `?embed` rewrite, then the filesystem. The dev server could not
      // exercise any redirect at all while it had its own resolver.
      const resolved = resolveRequest(pathname, new URL(request.url).search)
      if (resolved.redirect !== undefined) {
        return new Response(null, {
          status: 308,
          headers: { location: resolved.redirect },
        })
      }

      const file =
        resolved.file === undefined ? null : await resolveFile(resolved.file)
      if (file) return respond(file)
      // A missing hashed asset 404s outright rather than serving the 404 page,
      // matching the guard route in config.json.
      if (resolved.noFallback) {
        return new Response('Not found', { status: 404 })
      }

      const notFound = await resolveFile('404/index.html')
      if (notFound) {
        const response = await respond(notFound)
        return new Response(response.body, {
          status: 404,
          headers: response.headers,
        })
      }
      return new Response('Not found', { status: 404 })
    },
  })

  console.log(`  http://localhost:${PORT}`)
}

await start()
