// Deterministic walkthrough capture -> demo.mp4 (H.264 1280x720 30fps).
// The page runs with ?capture: no rAF; we advance a virtual clock 1/30 s per
// frame (WebGL + every CSS animation are slaved to it), screenshot, repeat.
//   NODE_PATH=$(npm root -g) node video.mjs [framesDir]
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const { chromium } = createRequire(process.env.NODE_PATH + '/')('playwright')
const here = new URL('.', import.meta.url).pathname
const dir = process.argv[2] || here + '.frames'
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true })
const FPS = 30, DT = 1000 / FPS
// [time in s, key]
const script = [
  [2.0, 'Enter'],
  [2.7, 'ArrowDown'], [3.1, 'ArrowDown'],
  [3.6, 'Enter'],
  [5.6, 'ArrowDown'], [6.3, 'ArrowDown'], [7.0, 'ArrowDown'],
  [7.7, 'Escape'],
  [8.1, 'ArrowUp'], [8.4, 'ArrowUp'],
  [8.8, 'Enter'],
  [10.7, 'ArrowDown'], [11.1, 'ArrowDown'],
  [11.7, 'Enter'],
  [13.9, 'ArrowDown'], [14.2, 'ArrowDown'],
]
const END = 14.8
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
p.on('pageerror', (e) => console.log('PAGEERR', e.message))
await p.goto('file://' + here + 'index.html?capture&q=high')
await p.evaluate(() => document.fonts.ready)
const cdp = await p.context().newCDPSession(p)
const n = Math.round(END * FPS)
let k = 0
const t0 = Date.now()
for (let f = 0; f < n; f++) {
  const t = f / FPS
  while (k < script.length && script[k][0] <= t) { await p.keyboard.press(script[k][1]); k++ }
  await p.evaluate((dt) => window.__NR.advance(dt, true), DT)
  const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 })
  writeFileSync(`${dir}/${String(f).padStart(4, '0')}.jpg`, Buffer.from(r.data, 'base64'))
  if (f % 30 === 0) console.log(`frame ${f}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`)
}
await b.close()
const out = here + 'demo.mp4'
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/%04d.jpg`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out])
console.log('demo.mp4', (statSync(out).size / 1e6).toFixed(2) + ' MB')
