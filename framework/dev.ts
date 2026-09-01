import { spawn } from 'node:child_process'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { contentTypeFor, resolveRequest } from './shared/routing'

/**
 * The dev server: watch, rebuild, serve, reload.
 *
 * This is the only file allowed to use `Bun.*` APIs; everything in the build
 * path stays runtime-agnostic so `vercel build` can run it under node.
 *
 * There is no Fast Refresh: editing a component reloads the page and loses
 * component state. The content-hash caches in `.cache/` keep an incremental
 * rebuild to a few hundred ms, which is what makes that trade bearable. A
 * failed build is pushed to the page as a red overlay so a broken post shows
 * its file and line where the author is looking.
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
  '<script>(()=>{const es=new EventSource("/__reload");' +
  'es.onmessage=()=>location.reload();' +
  'es.addEventListener("build-error",e=>{let o=document.getElementById("__build_error");' +
  'if(!o){o=document.createElement("pre");o.id="__build_error";' +
  'o.style.cssText="position:fixed;inset:auto 0 0 0;max-height:45vh;overflow:auto;margin:0;padding:16px;' +
  'background:#2a0b0b;color:#ffb4b4;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap;z-index:99999;' +
  'border-top:2px solid #ff5c5c";document.body.appendChild(o)}o.textContent=JSON.parse(e.data)});' +
  '})()</script>'

const clients = new Set<ReadableStreamDefaultController<Uint8Array>>()
const encoder = new TextEncoder()

function notifyClients(event?: string, data = 'reload'): void {
  // Custom events carry JSON so multi-line build output survives the SSE
  // framing; the plain reload event stays the bare word the client expects.
  const payload = event ? JSON.stringify(data) : data
  const frame = `${event ? `event: ${event}\n` : ''}data: ${payload}\n\n`
  for (const controller of clients) {
    try {
      controller.enqueue(encoder.encode(frame))
    } catch {
      clients.delete(controller)
    }
  }
}

/** The last failed build's stderr, shown in the page until a build succeeds. */
let lastError = ''

let building: Promise<void> | null = null
let queued = false

/** Long enough to coalesce one save's events, short enough to feel instant. */
const DEBOUNCE_MS = 30
let pending: ReturnType<typeof setTimeout> | undefined

function runBuild(): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now()
    const child = spawn(process.execPath, [path.join(ROOT, 'build.ts')], {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    // Mirror stderr to the terminal and keep a copy for the browser overlay,
    // so a broken post shows its file and line where the author is looking.
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
      process.stderr.write(chunk)
    })
    child.on('exit', (code) => {
      const ok = code === 0
      const label = ok ? 'rebuilt' : `build failed (${code})`
      console.log(`  ${label} in ${Date.now() - started}ms`)
      lastError = ok ? '' : stderr.trim()
      resolve(ok)
    })
  })
}

async function rebuild(): Promise<void> {
  if (building) {
    queued = true
    return
  }
  building = runBuild().then((ok) => {
    if (ok) notifyClients()
    else notifyClients('build-error', lastError)
  })
  await building
  building = null
  if (queued) {
    queued = false
    await rebuild()
  }
}

/** The file `framework/shared/routing.ts` resolves this URL to, if it exists. */
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
      // The build itself writes under app/data and app/fonts (measured image
      // sizes, tweet payloads, font subsets); reacting to those is a loop.
      if (dir === 'app' && /^(data|fonts)\//.test(String(filename))) return
      // One editor save emits both `rename` and `change` on macOS, and the
      // in-flight guard queues the second one into a whole extra build.
      clearTimeout(pending)
      pending = setTimeout(() => void rebuild(), DEBOUNCE_MS)
    })
  }

  Bun.serve({
    port: PORT,
    async fetch(request) {
      const started = performance.now()
      const response = await handle(request)
      const { pathname } = new URL(request.url)
      // Only page routes are worth a line. Fonts, chunks and images are
      // several per page and never the thing being debugged; the reload
      // stream stays open for the life of the tab.
      if (!pathname.startsWith('/_') && !/\.\w+$/.test(pathname)) {
        const ms = (performance.now() - started).toFixed(1)
        const status = response.status
        const mark =
          status >= 400 ? '\x1b[31m' : status >= 300 ? '\x1b[33m' : '\x1b[32m'
        console.log(
          `  ${mark}${status}\x1b[0m ${request.method} ${pathname} \x1b[2m${ms}ms\x1b[0m`,
        )
      }
      return response
    },
  })

  console.log(`  http://localhost:${PORT}`)
}

async function handle(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url)

  if (pathname === '/__reload') {
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          clients.add(controller)
          // A tab opened (or reloaded) while the build is broken should
          // see the error too, not a stale page with no explanation.
          if (lastError) {
            controller.enqueue(
              encoder.encode(
                `event: build-error\ndata: ${JSON.stringify(lastError)}\n\n`,
              ),
            )
          }
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
  // Vercel's image optimizer only exists on Vercel. Locally, hand back
  // the source image so <Img> renders instead of 404ing.
  // Vercel Analytics only exists on Vercel. An empty script keeps the
  // console free of a 404 on every page.
  if (pathname === '/_vercel/insights/script.js') {
    return new Response('', { headers: { 'content-type': 'text/javascript' } })
  }
  if (pathname === '/_vercel/image') {
    const source = new URL(request.url).searchParams.get('url')
    if (!source) return new Response('Missing url', { status: 400 })
    return Response.redirect(new URL(source, request.url).href, 302)
  }

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
}

await start()
