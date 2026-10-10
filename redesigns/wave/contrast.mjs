// Measures text contrast against the ACTUAL rendered background (WebGL wave, glass, blur) for every palette.
// For each text element: hide all text, screenshot, take the brightest 5% of background pixels under the
// text box (the worst case; for article text we use the darkest/brightest depending on polarity), composite the
// text colour with its effective opacity over that pixel, and compute the WCAG ratio.
// NODE_PATH=$(npm root -g) node contrast.mjs
import { createRequire } from 'node:module'
const { chromium } = createRequire(process.env.NODE_PATH + '/')('playwright')
const base = 'file://' + new URL('index.html', import.meta.url).pathname
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const ratio = (a, b) => { const [x, y] = a > b ? [a, b] : [b, a]; return (x + 0.05) / (y + 0.05) }

function collect([sel, mode]) {
  const out = [], sheet = document.getElementById('sheet'), P = window.__wave.P
  for (const el of document.querySelectorAll(sel)) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue // own text only
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    let op = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) op *= +getComputedStyle(n).opacity
    if (op < 0.05) continue
    let r = el.getBoundingClientRect()
    if (mode === 'canvas' && sheet.contains(el)) {
      let x = 0, y = 0, n = el; while (n && n !== sheet) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent }
      r = { left: P.content[0] + x, top: P.content[1] + y - P.scroll, width: el.offsetWidth, height: el.offsetHeight }
    }
    if (r.width < 2 || r.height < 2 || r.top > innerHeight - 30 || r.top < P.content[1] - 2 && sheet.contains(el)) continue
    if (r.top + r.height < 4 || r.left > innerWidth || r.left + r.width < 0) continue
    const m = cs.color.match(/[\d.]+/g).map(Number)
    out.push({ sel: (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()),
      x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(r.width, innerWidth - Math.max(0, r.left)), h: Math.min(r.height, innerHeight - Math.max(0, r.top)),
      rgb: m.slice(0, 3), a: (m[3] ?? 1) * op, size: parseFloat(cs.fontSize), weight: +cs.fontWeight })
  }
  return out
}
const HIDE = `#ui *, #ui *::before, .sheet, .sheet * { color: transparent !important; text-shadow: none !important;
  -webkit-text-fill-color: transparent !important; text-decoration-color: transparent !important; caret-color: transparent !important }`

async function pixels(b, png, boxes) {
  const p = await b.newPage()
  await p.setContent(`<img id=i src="data:image/png;base64,${png.toString('base64')}">`)
  await p.waitForFunction(() => document.getElementById('i').complete)
  const res = await p.evaluate((boxes) => {
    const im = document.getElementById('i'), c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight
    const x = c.getContext('2d'); x.drawImage(im, 0, 0)
    return boxes.map((bx) => {
      const d = x.getImageData(Math.round(bx.x), Math.round(bx.y), Math.max(1, Math.round(bx.w)), Math.max(1, Math.round(bx.h))).data, px = []
      for (let i = 0; i < d.length; i += 16) px.push([d[i], d[i + 1], d[i + 2]])
      return px
    })
  }, boxes)
  await p.close(); return res
}

const results = []
async function run(label, q, sel, { flag = true, w = 1280, h = 720, mode = flag ? 'canvas' : 'dom' } = {}) {
  const b = await chromium.launch({ args: flag ? [...GL, '--enable-blink-features=CanvasDrawElement'] : GL })
  const page = await b.newPage({ viewport: { width: w, height: h } })
  await page.goto(base + q + '&motion=reduced'); await page.waitForTimeout(q.includes('open') ? 2200 : 1200)
  const items = await page.evaluate(collect, [sel, mode])
  await page.addStyleTag({ content: HIDE }); await page.waitForTimeout(q.includes('open') ? 2500 : 700)
  const png = await page.screenshot()
  const px = await pixels(b, png, items)
  for (let i = 0; i < items.length; i++) {
    const it = items[i], ps = px[i].map((c) => ({ c, L: lum(c) })).sort((a, b) => a.L - b.L)
    const tl = lum(it.rgb)
    // worst case = the background pixel (top 5% toward the text's own luminance) that is closest to the text
    const worst = tl > 0.5 ? ps[Math.floor(ps.length * 0.95)] : ps[Math.floor(ps.length * 0.05)]
    if (!worst) continue
    const comp = it.rgb.map((v, k) => v * it.a + worst.c[k] * (1 - it.a))
    const cr = ratio(lum(comp), worst.L)
    const large = it.size >= 24 || (it.size >= 18.66 && it.weight >= 700)
    results.push({ label, sel: it.sel, cr, need: large ? 3 : 4.5 })
  }
  await b.close()
}
const MENU = '.item .t, .item .s, .item .v, .cat.on .lbl, #hints span, #hints button, #clock span, #clock b, #badge-t'
const SHEET = '#sheet h1, #sheet h2, #sheet h3, #sheet p, #sheet li, #sheet a, #sheet code, #sheet dt, #sheet dd, #sheet .sh-kicker, #sheet .sh-btn, #sheet span'
for (const tod of ['dawn', 'day', 'dusk', 'night']) {
  for (const t of [0, 45]) {
    await run(`${tod} menu t=${t}`, `?tod=${tod}&t=${t}&cat=blog`, MENU)
    await run(`${tod} settings t=${t}`, `?tod=${tod}&t=${t}&cat=settings&item=1`, MENU)
  }
  await run(`${tod} article canvas`, `?tod=${tod}&t=0&cat=blog&item=6&open=1`, SHEET)
  await run(`${tod} article dom`, `?tod=${tod}&t=0&cat=blog&item=6&open=1`, SHEET, { flag: false })
  await run(`${tod} mobile`, `?tod=${tod}&t=0&cat=projects`, MENU, { w: 390, h: 844 })
}
const by = {}
for (const r of results) { const k = r.label.replace(/ t=\d+/, '') + ' ' + r.sel; (by[k] ||= { min: 99, need: r.need }); by[k].min = Math.min(by[k].min, r.cr); by[k].need = Math.max(by[k].need, r.need) }
let fails = 0
for (const [k, v] of Object.entries(by)) { const ok = v.min >= v.need; if (!ok) fails++; console.log((ok ? '  ok ' : 'FAIL ') + k.padEnd(40) + v.min.toFixed(2) + ' (needs ' + v.need + ')') }
console.log(`${Object.keys(by).length} element groups, ${fails} below threshold`)
