// Playwright: local install, NODE_PATH, or the global npm root (ESM ignores NODE_PATH, so resolve via require).
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
const require = createRequire(import.meta.url)
const { chromium } = (() => { try { return require('playwright') } catch { return require(execSync('npm root -g').toString().trim() + '/playwright') } })()
const url = new URL('../index.html', import.meta.url).href
const AXE = process.env.AXE // path to axe-core@4.10.2 axe.min.js (npm pack axe-core@4.10.2); injected in Playwright only, never shipped
const browser = await chromium.launch({ ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) })
const total = {}
async function audit(name, vp, q, act) {
  const ctx = await browser.newContext({ viewport: vp, ignoreHTTPSErrors: true, reducedMotion: 'reduce', hasTouch: vp.width < 500, isMobile: vp.width < 500, javaScriptEnabled: !q.includes('nojs') })
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.goto(url + q.replace('nojs', '')); await p.waitForTimeout(800)
  if (act) await act(p); await p.waitForTimeout(900)
  let r
  if (q.includes('nojs')) { await ctx.close(); return }
  await p.addScriptTag({ path: AXE })
  r = await p.evaluate(async () => { const r = await axe.run(); return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 4).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 2).join('').slice(0, 170)) })) })
  const sc = r.filter(v => v.impact === 'serious' || v.impact === 'critical')
  total[name] = [r.length, sc.length]
  console.log(`\n## ${name}: ${r.length} violations (${sc.length} serious/critical)`, errs.length ? errs : '')
  for (const v of r) console.log(`- [${v.impact}] ${v.id} x${v.n}\n    ${v.ex.join('\n    ')}`)
  await ctx.close()
}
const D = { width: 1280, height: 720 }
await audit('home', D, '?notoast')
for (const b of ['projects', 'notes', 'work', 'system']) await audit(b, D, '?notoast&blade=' + b)
await audit('reader', D, '?notoast', async p => { await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter') })
await audit('guide', D, '?notoast', async p => { await p.keyboard.press('g') })
await audit('toast', D, '', async p => { await p.waitForTimeout(1500) })
await audit('mobile', { width: 390, height: 844 }, '?notoast')
await audit('mobile-reader', { width: 390, height: 844 }, '?notoast', async p => { await p.evaluate(() => document.querySelector('.blade.is-active .item').click()) })
console.log('\nSUMMARY [all, serious+critical]', JSON.stringify(total))
await browser.close()
