// Deterministic walkthrough recorder: virtual clock for performance.now / rAF / timers, and every
// Web Animation (CSS animations, transitions, WAAPI, View Transition pseudos) is paused and seeked
// to virtual time each frame. Frames are captured at 30 fps regardless of how slow rendering is.
// Playwright: local install, NODE_PATH, or the global npm root (ESM ignores NODE_PATH, so resolve via require).
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
const require = createRequire(import.meta.url)
const { chromium } = (() => { try { return require('playwright') } catch { return require(execSync('npm root -g').toString().trim() + '/playwright') } })()
import { mkdirSync, rmSync } from 'node:fs'
const FPS = 30, DT = 1000 / FPS
// Usage: NODE_PATH=$(npm root -g) node tools/record.mjs [fromSec] [toSec] [frameDir]
//   then: ffmpeg -framerate 30 -i <frameDir>/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 demo.mp4
const [fromS = '0', toS = '15', OUT = 'frames'] = process.argv.slice(2)
const FROM = Math.round(+fromS * FPS), TO = Math.round(+toS * FPS)
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ args: ['--hide-scrollbars'], ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true, deviceScaleFactor: 1 })
await ctx.addInitScript({ path: new URL('./vclock.js', import.meta.url).pathname })
const page = await ctx.newPage()
page.on('crash', () => console.log('RENDERER CRASH')); browser.on('disconnected', () => console.log('BROWSER DISCONNECTED')); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()))
await page.goto(new URL('../index.html', import.meta.url).href)
await page.evaluate(() => document.fonts.ready)
const cdp = await ctx.newCDPSession(page)
// freeze the document timeline: animations only move when vclock seeks them
await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 })
// pre-roll 1 s of virtual time so the toast (scheduled at 1.6 s) slides up at ~0.6 s of video
for (let i = 0; i < 30; i++) await page.evaluate(ms => window.__vclock.step(ms), DT)

const key = k => page.keyboard.press(k)
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const script = [
  [2.8, () => key('ArrowRight')],
  [4.0, () => key('ArrowRight')],
  [5.2, () => key('ArrowLeft')],
  [5.55, () => key('ArrowLeft')],
  [7.0, () => key('ArrowDown')], [7.35, () => key('ArrowDown')], [7.7, () => key('ArrowDown')],
  [8.6, () => key('Enter')],
  [11.9, () => key('Escape')],
  [13.0, () => key('g')],
  [13.9, () => key('ArrowRight')],
  [14.4, () => key('ArrowDown')],
]
const scrollFrom = 10.0, scrollTo = 11.4
const t0 = Date.now()
for (let f = 0; f < TO; f++) {
  const t = f / FPS
  for (const [at, fn] of script) if (Math.round(at * FPS) === f) await fn()
  if (t >= scrollFrom && t <= scrollTo) await page.evaluate(k => { const s = document.getElementById('rScroll'); if (s) s.scrollTop = k * 260 }, ease((t - scrollFrom) / (scrollTo - scrollFrom)))
  await page.evaluate(ms => window.__vclock.step(ms), DT)
  if (f >= FROM) {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    await import('node:fs').then(fs => fs.writeFileSync(`${OUT}/f${String(f - FROM).padStart(4, '0')}.png`, Buffer.from(data, 'base64')))
    if (f % 30 === 0) console.log(`frame ${f} (${t.toFixed(1)}s) ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`)
  }
}
console.log(errs.length ? errs : 'no page errors')
await browser.close()
