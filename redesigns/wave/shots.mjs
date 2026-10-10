// Final screenshots: NODE_PATH=$(npm root -g) node shots.mjs
import { createRequire } from 'node:module'
const { chromium } = createRequire(process.env.NODE_PATH + '/')('playwright')
const base = 'file://' + new URL('index.html', import.meta.url).pathname
const GLARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const FLAG = '--enable-blink-features=CanvasDrawElement'
async function shot(name, { q = '', w = 1280, h = 720, flag = true, pose } = {}) {
  const b = await chromium.launch({ args: flag ? [...GLARGS, FLAG] : GLARGS })
  const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await p.goto(base + q); await p.waitForTimeout(1500)
  if (pose) { await p.evaluate(pose); await p.waitForTimeout(2500) }
  await p.screenshot({ path: new URL(name, import.meta.url).pathname })
  const info = await p.evaluate(() => ({ path: __wave.RENDER.label, sw: document.scrollingElement.scrollWidth, vw: innerWidth }))
  console.log(name, JSON.stringify(info), errs.length ? errs : '')
  await b.close()
}
// a held, frozen pose so slow software GL still captures the intended frame
const ripplePose = () => {
  const P = __wave.P; window.__hold = 1
  const T = __wave.now(); P.openAt = T - 1.35
  P.target = P.scroll = 150; P.vel = 16
  P.rips = [[760, 360, T - 0.62, 1.25]]
  window.__tfix = T
}
const restPose = () => { window.__hold = 1; const T = __wave.now(); __wave.P.openAt = T - 3; window.__tfix = T }
await shot('shot-home.png', { q: '?tod=day&t=0' })
await shot('shot-article-canvas.png', { q: '?tod=dusk&cat=blog&item=6&open=1', pose: ripplePose })
await shot('shot-article-fallback.png', { q: '?tod=dusk&cat=blog&item=6&open=1', flag: false, pose: restPose })
await shot('shot-notes-night.png', { q: '?tod=night&cat=notes&item=1&t=40' })
await shot('shot-mobile.png', { q: '?tod=dawn&t=0', w: 390, h: 844 })
