// WCAG contrast against the ACTUAL rendered background (WebGL wave, glass, blur, halos) for every palette.
// Method, per state: freeze the clock, screenshot A (normal) and B (text fill transparent, text-shadow halos
// kept). Pixels where A and B differ are glyph strokes; the background behind each glyph is B at those
// pixels. For every text run we take the 95th-percentile-worst background (brightest for light text),
// composite the text colour at its effective opacity over it, and compute the ratio.
// Rows at the list's fading scroll edge (effective opacity < 0.95) are reported separately.
// NODE_PATH=$(npm root -g) node contrast.mjs
import { createRequire } from 'node:module'
const { chromium } = createRequire(process.env.NODE_PATH + '/')('playwright')
const base = 'file://' + new URL('index.html', import.meta.url).pathname
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const ratio = (a, b) => { const [x, y] = a > b ? [a, b] : [b, a]; return (x + 0.05) / (y + 0.05) }

function collect([sel, mode]) {
  const out = [], sheet = document.getElementById('sheet'), P = window.__wave.P, sr = sheet.getBoundingClientRect()
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    let op = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) op *= +getComputedStyle(n).opacity
    if (op < 0.05) continue
    const m = cs.color.match(/[\d.]+/g).map(Number)
    for (const tn of el.childNodes) {
      if (tn.nodeType !== 3 || !tn.textContent.trim()) continue
      const rg = document.createRange(); rg.selectNodeContents(tn)
      for (let r of rg.getClientRects()) {
        if (mode === 'canvas' && sheet.contains(el)) r = { left: P.content[0] + r.left - sr.left, top: P.content[1] + r.top - sr.top - P.scroll, width: r.width, height: r.height }
        if (sheet.contains(el) && (r.top < P.content[1] + 22 || r.top + r.height > P.content[1] + P.content[3] - 22)) continue // edge fade
        if (r.width < 2 || r.top < 0 || r.left < 0 || r.top + r.height > innerHeight || r.left + r.width > innerWidth) continue
        out.push({ sel: (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()),
          x: r.left, y: r.top, w: r.width, h: r.height, rgb: m.slice(0, 3), a: (m[3] ?? 1) * op, size: parseFloat(cs.fontSize), weight: +cs.fontWeight })
      }
    }
  }
  return out
}
const HIDE = `#ui *, .sheet, .sheet * { color: transparent !important; -webkit-text-fill-color: transparent !important;
  text-decoration-color: transparent !important; caret-color: transparent !important }`

async function analyse(b, A, B, boxes) {
  const p = await b.newPage()
  await p.setContent(`<img id=a src="data:image/png;base64,${A.toString('base64')}"><img id=b src="data:image/png;base64,${B.toString('base64')}">`)
  await p.waitForFunction(() => [...document.images].every((i) => i.complete))
  const res = await p.evaluate((boxes) => {
    const get = (id) => { const im = document.getElementById(id), c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight
      const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height) }
    const a = get('a'), b = get('b'), W = a.width
    return boxes.map((bx) => {
      const px = []
      for (let y = Math.round(bx.y); y < Math.round(bx.y + bx.h); y++) for (let x = Math.round(bx.x); x < Math.round(bx.x + bx.w); x++) {
        const i = (y * W + x) * 4
        const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])
        if (d > 90) px.push([b.data[i], b.data[i + 1], b.data[i + 2]])   // a glyph stroke covers this pixel
      }
      return px
    })
  }, boxes)
  await p.close(); return res
}

const results = []
async function run(...args) {   // the shared machine sometimes kills browsers mid-run: retry
  for (let i = 0; i < 3; i++) { try { return await run1(...args) } catch (e) { console.error('retry', args[0], e.message.split('\n')[0]) } }
}
async function run1(label, q, sel, { flag = true, w = 1280, h = 720, mode = flag ? 'canvas' : 'dom' } = {}) {
  const b = await chromium.launch({ args: flag ? [...GL, '--enable-blink-features=CanvasDrawElement'] : GL })
  try { return await measure(b, label, q, sel, w, h, mode) } finally { await b.close().catch(() => {}) }
}
async function measure(b, label, q, sel, w, h, mode) {
  const page = await b.newPage({ viewport: { width: w, height: h } }); page.setDefaultTimeout(240000)
  await page.goto(base + q); await page.waitForTimeout(q.includes('open') ? 2400 : 1200)
  await page.waitForFunction(() => !document.querySelector('#glass.on') || getComputedStyle(document.querySelector('#glass')).opacity === '1')
  await page.waitForFunction(() => !window.__wave.state.open || window.__wave.P.prog >= 1)
  await page.evaluate(() => { window.__hold = 1; window.__tfix = window.__wave.now(); document.activeElement.blur() })
  await page.waitForTimeout(1500)
  const items = await page.evaluate(collect, [sel, mode])
  const A = await page.screenshot()
  await page.addStyleTag({ content: HIDE }); await page.waitForTimeout(q.includes('open') ? 2500 : 900)
  const B = await page.screenshot()
  const px = await analyse(b, A, B, items)
  for (let i = 0; i < items.length; i++) {
    const it = items[i]; if (px[i].length < 6) continue
    const ps = px[i].map((c) => ({ c, L: lum(c) })).sort((x, y) => x.L - y.L)
    const light = lum(it.rgb) > 0.4
    const worst = light ? ps[Math.floor((ps.length - 1) * 0.95)] : ps[Math.floor((ps.length - 1) * 0.05)]
    const comp = it.rgb.map((v, k) => v * it.a + worst.c[k] * (1 - it.a))
    const large = it.size >= 24 || (it.size >= 18.66 && it.weight >= 700)
    results.push({ label, sel: it.sel + (it.a < 0.95 ? ' (edge-fade)' : ''), cr: ratio(lum(comp), worst.L), need: large ? 3 : 4.5 })
  }
}
const MENU = '.item .t, .item .s, .item .v, .cat.on .lbl, #hints span, #hints button, #hints kbd, #clock span, #clock b, #badge-t'
const SHEET = '#sheet h1, #sheet h2, #sheet h3, #sheet p, #sheet li, #sheet a, #sheet code, #sheet strong, #sheet em, #sheet dt, #sheet dd, #sheet .sh-kicker, #sheet .sh-desc, #sheet .sh-btn, #sheet span'
const only = process.argv[2]
for (const tod of ['dawn', 'day', 'dusk', 'night']) {
  if (only && !only.includes(tod)) continue
  for (const t of [0, 45]) await run(`${tod} menu`, `?tod=${tod}&t=${t}&cat=blog`, MENU)
  await run(`${tod} settings`, `?tod=${tod}&t=20&cat=settings&item=1`, MENU)
  await run(`${tod} article canvas`, `?tod=${tod}&t=0&cat=blog&item=6&open=1`, SHEET)
  await run(`${tod} article dom`, `?tod=${tod}&t=0&cat=blog&item=6&open=1`, SHEET, { flag: false })
  await run(`${tod} mobile`, `?tod=${tod}&t=0&cat=projects`, MENU, { w: 390, h: 844 })
}
const by = {}
for (const r of results) { const k = r.label + ' ' + r.sel; (by[k] ||= { min: 99, need: 0, n: 0 }); by[k].min = Math.min(by[k].min, r.cr); by[k].need = Math.max(by[k].need, r.need); by[k].n++ }
let fails = 0, edge = 0
for (const [k, v] of Object.entries(by)) {
  const ok = v.min >= v.need; if (!ok) k.includes('edge-fade') ? edge++ : fails++
  console.log((ok ? '  ok ' : k.includes('edge-fade') ? 'fade ' : 'FAIL ') + k.padEnd(44) + v.min.toFixed(2) + ' (needs ' + v.need + ', ' + v.n + ' runs)')
}
console.log(`${Object.keys(by).length} groups: ${fails} below threshold, ${edge} edge-fade rows below threshold`)
