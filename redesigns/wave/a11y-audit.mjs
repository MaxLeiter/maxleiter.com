// axe-core audit across states and both render paths (axe is injected here only, never shipped).
// NODE_PATH=$(npm root -g) node a11y-audit.mjs [path/to/axe.min.js]   (default: jsDelivr URL)
import { createRequire } from 'node:module'
const { chromium } = createRequire(process.env.NODE_PATH + '/')('playwright')
const AXE = process.argv[2]
const base = 'file://' + new URL('index.html', import.meta.url).pathname
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const states = [
  ...['about', 'settings', 'blog', 'notes', 'projects', 'work'].map((c) => ({ name: 'home:' + c, q: `?cat=${c}` })),
  { name: 'article', q: '?cat=blog&item=6&open=1', wait: 1800 },
  { name: 'sysinfo', q: '?cat=settings&item=4&open=1', wait: 1800 },
  { name: 'mobile:home', q: '?cat=blog', w: 390, h: 844 },
  { name: 'mobile:article', q: '?cat=notes&open=1', w: 390, h: 844, wait: 1800 },
]
const total = {}
for (const flag of [true, false]) {
  const b = await chromium.launch({ args: flag ? [...GL, '--enable-blink-features=CanvasDrawElement'] : GL })
  for (const s of states) {
    const p = await b.newPage({ viewport: { width: s.w || 1280, height: s.h || 720 } }); p.setDefaultTimeout(240000)
    await p.goto(base + s.q); await p.waitForTimeout(s.wait || 900)
    await p.addScriptTag(AXE ? { path: AXE } : { url: 'https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js' })
    const r = await p.evaluate(async () => {
      const res = await axe.run(document, { resultTypes: ['violations', 'incomplete'] })
      return { v: res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 2).map((n) => n.target.join(' ')) })),
        inc: res.incomplete.map((v) => v.id) }
    })
    const path = await p.evaluate(() => window.__wave?.RENDER.label)
    const key = (flag ? 'canvas' : 'dom') + ' ' + s.name
    for (const v of r.v) total[v.impact] = (total[v.impact] || 0) + 1
    console.log(key.padEnd(26), r.v.length ? r.v.map((v) => `${v.impact}:${v.id}(${v.n}) ${v.t.join(' | ')}`).join('\n' + ' '.repeat(27)) : 'no violations', '  [needs review: ' + r.inc.join(',') + ']', path.includes('HTML') === flag ? '' : 'PATH MISMATCH ' + path)
    await p.close()
  }
  await b.close()
}
console.log('violations by impact:', JSON.stringify(total))
