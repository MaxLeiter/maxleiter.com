// axe-core audit in every major state (axe is injected here only, never shipped).
//   NODE_PATH=$(npm root -g) node a11y-audit.mjs path/to/axe.min.js
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const { chromium } = createRequire(process.env.NODE_PATH + '/')('playwright')
const AXE = process.argv[2]
const base = 'file://' + new URL('index.html', import.meta.url).pathname
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const ONLY = process.argv[3] ? new RegExp(process.argv[3]) : null
const states0 = [
  { name: 'title', q: '' },
  ...['menu', 'career', 'quick', 'garage', 'crew', 'profile', 'options'].map((s) => ({ name: s, q: `?s=${s}&i=1` })),
  { name: 'article (post)', q: '?s=career&i=22&open=1', wait: 12000 },
  { name: 'article (note)', q: '?s=quick&i=2&open=1', wait: 12000 },
  { name: 'loading overlay', q: '?s=menu', key: 'Enter', wait: 600 },
  { name: 'reduced motion', q: '?s=garage&rm=1' },
  { name: 'no webgl', q: '?s=career&nogl' },
  { name: 'mobile menu', q: '?s=menu', w: 390, h: 844 },
  { name: 'mobile career', q: '?s=career&i=3', w: 390, h: 844 },
  { name: 'mobile article', q: '?s=quick&open=1', w: 390, h: 844, wait: 2500 },
  { name: 'no javascript', q: '', nojs: true },
]
const states = ONLY ? states0.filter((s) => ONLY.test(s.name)) : states0
const total = {}
const b = await chromium.launch({ args: GL })
for (const s of states) {
  const ctx = await b.newContext({ viewport: { width: s.w || 1280, height: s.h || 720 }, })
  const p = await ctx.newPage()
  await p.goto(base + s.q)
  await p.waitForTimeout(1600)
  if (s.key) await p.keyboard.press(s.key)
  if (s.wait) await p.waitForTimeout(s.wait)
  if (s.nojs) {
    // same document with every <script> stripped, as a no-JS browser would see it
    const html = readFileSync(new URL('index.html', import.meta.url), 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    await p.setContent(html, { waitUntil: 'load' })
  }
  await audit(p, s)
  await ctx.close()
}
async function audit(p, s) {
  await p.addScriptTag({ path: AXE })
  const r = await p.evaluate(async () => {
    const res = await axe.run(document, { resultTypes: ['violations'] })
    return res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
  })
  for (const v of r) total[v.impact] = (total[v.impact] || 0) + 1
  const title = await p.title()
  console.log(s.name.padEnd(18), ('[' + title + ']').padEnd(52), r.length ? r.map((v) => `${v.impact}:${v.id}(${v.n}) ${v.t.join(' | ')}`).join('\n' + ' '.repeat(72)) : 'no violations')
}
await b.close()
console.log('violations by impact:', JSON.stringify(total))
