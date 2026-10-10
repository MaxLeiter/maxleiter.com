// Deterministic 30 fps walkthrough → demo.mp4 (HTML-in-Canvas path).
// Software GL renders ~1 fps, so the page runs on a virtual clock: performance.now, Date, rAF, timers and
// every CSS/Web Animation are stepped by exactly 1/30 s per captured frame.
// NODE_PATH=$(npm root -g) node record.mjs [framesDir]   then it calls ffmpeg (libx264).
import { createRequire } from 'node:module'
import { mkdirSync, rmSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const { chromium } = createRequire(process.env.NODE_PATH + '/')('playwright')
const here = new URL('.', import.meta.url).pathname
const dir = process.argv[2] || here + '.frames'
const ONLY = process.env.FRAMES ? +process.env.FRAMES : Infinity
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true })

const VIRTUAL_CLOCK = () => {
  let vt = 0
  const t0 = performance.now(), RealDate = Date, realNow = performance.now.bind(performance)
  performance.now = () => t0 + vt
  const raf = []; window.requestAnimationFrame = (cb) => (raf.push(cb), raf.length); window.cancelAnimationFrame = () => {}
  const timers = []; let tid = 1
  window.setTimeout = (fn, ms = 0, ...a) => { const id = tid++; timers.push({ id, at: vt + (+ms || 0), fn: () => fn(...a) }); return id }
  window.setInterval = (fn, ms = 0, ...a) => { const id = tid++; timers.push({ id, at: vt + ms, every: Math.max(1, ms), fn: () => fn(...a) }); return id }
  window.clearTimeout = window.clearInterval = (id) => { const i = timers.findIndex((x) => x.id === id); if (i >= 0) timers.splice(i, 1) }
  let dateBase = new RealDate(2026, 9, 10, 13, 5).getTime()
  window.__setClock = (h) => { const d = new RealDate(2026, 9, 10); dateBase = d.getTime() + h * 3600e3 - vt }
  const fakeNow = () => dateBase + vt
  window.Date = class extends RealDate { constructor(...a) { a.length ? super(...a) : super(fakeNow()) } static now() { return fakeNow() } }
  const born = new WeakMap()
  window.__step = (ms) => {
    vt += ms
    for (;;) {
      timers.sort((a, b) => a.at - b.at)
      if (!timers.length || timers[0].at > vt) break
      const t = timers.shift(); if (t.every) { t.at += t.every; timers.push(t) }
      try { t.fn() } catch (e) { console.error(e) }
    }
    for (const a of document.getAnimations()) {
      if (!born.has(a)) born.set(a, vt - ms)
      try { a.pause(); a.currentTime = vt - born.get(a) } catch {}
    }
    const q = raf.splice(0); for (const cb of q) { try { cb(performance.now()) } catch (e) { console.error(e) } }
  }
}

const FPS = 30, F = (s) => Math.round(s * FPS)
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-blink-features=CanvasDrawElement'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } }); page.setDefaultTimeout(240000)
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await page.addInitScript(VIRTUAL_CLOCK)
await page.goto('file://' + here + 'index.html?cat=blog&t=12')
await page.waitForTimeout(1500)
await page.evaluate(() => { __setClock(13.1); __wave.tickClock(); document.activeElement.blur() })
const label = await page.evaluate(() => __wave.RENDER.label)
if (!label.includes('HTML-in-Canvas')) throw new Error('not on the HTML-in-Canvas path: ' + label)

// timeline: [seconds, action]
const key = (k) => () => page.keyboard.press(k)
const wheel = (dy) => async () => { await page.mouse.move(720, 380); await page.mouse.wheel(0, dy) }
const T = [
  [1.3, key('ArrowRight')], [1.75, key('ArrowRight')], [2.2, key('ArrowLeft')], [2.65, key('ArrowLeft')],
  [3.2, key('ArrowDown')], [3.45, key('ArrowDown')], [3.7, key('ArrowDown')], [3.95, key('ArrowDown')], [4.2, key('ArrowDown')], [4.45, key('ArrowDown')],
  [5.0, key('Enter')],
  [6.9, wheel(240)], [7.3, wheel(240)], [7.7, wheel(260)], [8.2, wheel(-160)], [8.6, wheel(300)],
  [9.9, key('Escape')],
  [10.3, () => page.evaluate(() => document.activeElement.blur())],   // keep the time-lapse frame clean
]
const LAPSE = [10.6, 14.7]           // time-lapse: 13:00 → dusk → night → dawn → day
const END = 15.0
// hour keyframes with a short dwell on each palette: day → dusk → night → dawn → day
const HK = [[0, 13.1], [0.2, 18.9], [0.3, 19.5], [0.48, 23.0], [0.56, 26.5], [0.68, 30.6], [0.78, 31.1], [1, 37.1]]
const lapseHour = (f) => {
  for (let i = 0; i < HK.length - 1; i++) if (f <= HK[i + 1][0]) {
    const u = (f - HK[i][0]) / (HK[i + 1][0] - HK[i][0]), e = u * u * (3 - 2 * u)
    return HK[i][1] + (HK[i + 1][1] - HK[i][1]) * e
  }
  return HK[HK.length - 1][1]
}
let ti = 0, n = 0
const total = Math.min(F(END), ONLY)
const t0 = Date.now()
for (let i = 0; i < total; i++) {
  const s = i / FPS
  while (ti < T.length && T[ti][0] <= s) { await T[ti][1](); ti++ }
  if (s >= LAPSE[0] && s <= LAPSE[1]) {
    const f = (s - LAPSE[0]) / (LAPSE[1] - LAPSE[0])
    await page.evaluate((h) => { __setClock(h % 24); __wave.tickClock(); window.__waveSpeed = 3 }, lapseHour(f))
  } else if (s > LAPSE[1]) await page.evaluate(() => { window.__waveSpeed = 1 })
  await page.evaluate((ms) => __step(ms), 1000 / FPS)
  await page.screenshot({ path: `${dir}/f${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 })
  if (i % 30 === 0) console.log(`frame ${i}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`)
}
await b.close()
if (errs.length) console.log('page errors:', errs)
if (ONLY !== Infinity) process.exit(0)
const out = here + 'demo.mp4'
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/f%04d.jpg`,
  '-vf', `fade=t=in:st=0:d=0.35,fade=t=out:st=${(END - 0.45).toFixed(2)}:d=0.45,format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high', '-movflags', '+faststart', out], { stdio: 'inherit' })
console.log('wrote', out, (statSync(out).size / 1e6).toFixed(2), 'MB')
rmSync(dir, { recursive: true, force: true })
