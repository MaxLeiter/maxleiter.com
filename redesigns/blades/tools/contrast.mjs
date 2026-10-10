// Worst-case contrast: render with all text hidden, then for every text run sample the pixels under its glyph boxes.
// Playwright: local install, NODE_PATH, or the global npm root (ESM ignores NODE_PATH, so resolve via require).
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
const require = createRequire(import.meta.url)
const { chromium } = (() => { try { return require('playwright') } catch { return require(execSync('npm root -g').toString().trim() + '/playwright') } })()
const url = new URL('../index.html', import.meta.url).href
const browser = await chromium.launch({ ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) })
const states = (process.argv[2] || 'blog,projects,notes,work,system,reader,guide,toast,mobile').split(',')
const rows = []
for (const st of states) {
  const mobile = st === 'mobile', vp = mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 }
  const ctx = await browser.newContext({ viewport: vp, ignoreHTTPSErrors: true, reducedMotion: 'reduce' })
  const p = await ctx.newPage()
  const q = ['projects', 'notes', 'work', 'system'].includes(st) ? '?notoast&blade=' + st : (st === 'toast' ? '' : '?notoast')
  await p.goto(url + q); await p.waitForTimeout(900)
  if (st === 'reader') { await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(800) }
  if (st === 'guide') { await p.keyboard.press('g'); await p.waitForTimeout(800) }
  if (st === 'toast') await p.waitForTimeout(2600)
  // collect text runs
  const runs = await p.evaluate(() => {
    const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const top = document.querySelector('[aria-modal]:not([hidden])')
    while (w.nextNode()) {
      const n = w.currentNode; if (!n.textContent.trim()) continue
      const el = n.parentElement; if (el.closest('script,style,noscript,#fallback,.sr-only')) continue
      if (top && !top.contains(el)) continue
      if (el.closest('[inert]')) continue
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden') continue
      let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity; if (op < .5) continue
      const r = document.createRange(); r.selectNodeContents(n)
      let cl = [0, 0, innerWidth, innerHeight]
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const s = getComputedStyle(e); if (s.overflowX !== 'visible' || s.overflowY !== 'visible') { const b = e.getBoundingClientRect(); cl = [Math.max(cl[0], b.left), Math.max(cl[1], b.top), Math.min(cl[2], b.right), Math.min(cl[3], b.bottom)] } }
      const rects = [...r.getClientRects()].map(b => { const x0 = Math.max(b.left, cl[0]), y0 = Math.max(b.top, cl[1]), x1 = Math.min(b.right, cl[2]), y1 = Math.min(b.bottom, cl[3]); return { left: x0, top: y0, width: x1 - x0, height: y1 - y0, right: x1, bottom: y1 } }).filter(b => b.width > 2 && b.height > 4)
      if (!rects.length) continue
      const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight
      const large = fs >= 24 || (fs >= 18.66 && fw >= 700)
      const ui = !!el.closest('button, a, [role=option], [role=tab], .key, .chip, .bcount, .count, .hint, .clock, .presence')
      out.push({ text: n.textContent.trim().slice(0, 40), sel: (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()) + (el.closest('[aria-selected=true]') ? '[sel]' : ''), color: cs.color, rects: rects.map(b => [b.left, b.top, b.width, b.height]), large, ui, fs })
    }
    return out
  })
  await p.addStyleTag({ content: '*{color:transparent!important;text-shadow:none!important;caret-color:transparent!important;-webkit-text-stroke:0!important} *::placeholder{color:transparent!important}' })
  await p.waitForTimeout(300)
  const png = (await p.screenshot()).toString('base64')
  const res = await p.evaluate(async ({ png, runs }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode()
    const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d'); g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, img.width, img.height).data
    const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
    const L = (r, gg, b) => .2126 * lin(r) + .7152 * lin(gg) + .0722 * lin(b)
    return runs.map(rn => {
      const m = rn.color.match(/[\d.]+/g).map(Number); const [r, gg, b] = m; const a = m[3] ?? 1
      const ratios = []
      for (const [x, y, w, h] of rn.rects) for (let yy = Math.max(0, y | 0); yy < Math.min(img.height, y + h); yy += 2) for (let xx = Math.max(0, x | 0); xx < Math.min(img.width, x + w); xx += 2) {
        const i = (yy * img.width + xx) * 4; const br = d[i], bg = d[i + 1], bb = d[i + 2]
        // composite text colour (if translucent) over this pixel
        const tr = r * a + br * (1 - a), tg = gg * a + bg * (1 - a), tb = b * a + bb * (1 - a)
        const l1 = L(tr, tg, tb), l2 = L(br, bg, bb); ratios.push((Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05))
      }
      ratios.sort((x, y) => x - y)
      return { ...rn, worst: ratios[Math.floor(ratios.length * .05)] || 0, median: ratios[ratios.length >> 1] || 0 }
    })
  }, { png, runs })
  for (const r of res) { const need = r.large || r.ui ? 3 : 4.5; rows.push({ st, ...r, need, pass: r.worst >= need }) }
  await ctx.close()
}
const fails = rows.filter(r => !r.pass)
const agg = {}
for (const r of fails) { const k = r.st + ' ' + r.sel; (agg[k] ||= { n: 0, worst: 99, need: r.need, ex: r.text, color: r.color }); agg[k].n++; agg[k].worst = Math.min(agg[k].worst, r.worst) }
console.log(`runs checked: ${rows.length}, failing: ${fails.length}`)
for (const [k, v] of Object.entries(agg).sort()) console.log(`${k.padEnd(34)} x${String(v.n).padEnd(3)} worst ${v.worst.toFixed(2)} need ${v.need}  "${v.ex}" ${v.color}`)
const minBy = {}; for (const r of rows) { minBy[r.st] = Math.min(minBy[r.st] ?? 99, r.worst) }
console.log('min per state', JSON.stringify(Object.fromEntries(Object.entries(minBy).map(([k, v]) => [k, +v.toFixed(2)]))))
await browser.close()
