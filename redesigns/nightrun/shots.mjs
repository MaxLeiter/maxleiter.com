// Screenshots: NODE_PATH=$(npm root -g) node shots.mjs [outdir] [names...]
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
const { chromium } = createRequire(process.env.NODE_PATH + '/')('playwright')
const out = process.argv[2] || new URL('.', import.meta.url).pathname
const only = process.argv.slice(3)
const base = 'file://' + new URL('index.html', import.meta.url).pathname
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const shots = [
  { name: 'shot-1-title', q: '?capture', t: 2600 },
  { name: 'shot-2-menu', q: '?capture&s=menu&i=2', t: 1800 },
  { name: 'shot-3-garage', q: '?capture&s=garage&i=0', t: 1800, keys: [[400, 'ArrowDown'], [500, 'ArrowDown'], [500, 'ArrowDown']] },
  { name: 'shot-4-career', q: '?capture&s=career&i=0', t: 1600, keys: [[300, 'ArrowDown'], [300, 'ArrowDown'], [300, 'ArrowDown'], [300, 'ArrowDown']] },
  { name: 'shot-5-article', q: '?capture&s=career&i=22&open=1', t: 2200 },
  { name: 'shot-mobile', q: '?capture&s=menu&i=0', t: 1800, w: 390, h: 844 },
  { name: 'm-career', q: '?capture&s=career&i=3', t: 1800, w: 390, h: 844 },
  { name: 'm-garage', q: '?capture&s=garage&i=2', t: 1800, w: 390, h: 844 },
  { name: 'x-quick', q: '?capture&s=quick&i=1', t: 1600 },
  { name: 'x-crew', q: '?capture&s=crew&i=1', t: 1600 },
  { name: 'x-profile', q: '?capture&s=profile', t: 1600 },
  { name: 'x-options', q: '?capture&s=options', t: 1600 },
  { name: 'x-loading', q: '?capture&s=menu', t: 800, keys: [[300, 'Enter']], after: 500 },
  { name: 'x-nogl', q: '?capture&nogl&s=menu&i=1', t: 1500 },
  { name: 'x-rm', q: '?capture&rm=1&s=garage&i=4', t: 1500 },
  { name: 'm-title', q: '?capture', t: 2600, w: 390, h: 844 },
  { name: 'm-article', q: '?capture&s=quick&i=2&open=1', t: 2200, w: 390, h: 844 },
]
const b = await chromium.launch({ args: GL })
for (const s of shots) {
  if (only.length && !only.some((o) => s.name.includes(o))) continue
  const p = await b.newPage({ viewport: { width: s.w || 1280, height: s.h || 720 }, deviceScaleFactor: 1, hasTouch: !!s.w })
  const errs = []
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 300)) })
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message))
  await p.goto(base + s.q)
  await p.evaluate(() => document.fonts.ready)
  const adv = async (ms) => { const n = Math.round(ms / 33.333); await p.evaluate((n) => { for (let i = 0; i < n; i++) window.__NR.advance(33.333, false) }, n) }
  for (const [wait, key] of s.keys || []) { await adv(wait); await p.keyboard.press(key) }
  await adv(s.t)
  if (s.after) await adv(s.after)
  await p.evaluate(() => window.__NR.advance(33.333, true))
  const cdp = await p.context().newCDPSession(p)
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${out}/${s.name}.png`, Buffer.from(r.data, 'base64'))
  console.log(s.name, errs.length ? errs.join(' | ') : 'ok')
  await p.close()
}
await b.close()
