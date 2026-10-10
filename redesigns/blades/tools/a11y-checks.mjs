// Playwright: local install, NODE_PATH, or the global npm root (ESM ignores NODE_PATH, so resolve via require).
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
const require = createRequire(import.meta.url)
const { chromium } = (() => { try { return require('playwright') } catch { return require(execSync('npm root -g').toString().trim() + '/playwright') } })()
const url = new URL('../index.html', import.meta.url).href
const AXE = process.env.AXE
const browser = await chromium.launch({ ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) })
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m)
const D = { width: 1280, height: 720 }
const mk = async (vp = D, q = '?notoast', opt = {}) => { const ctx = await browser.newContext({ viewport: vp, ignoreHTTPSErrors: true, reducedMotion: 'reduce', ...opt }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(url + q); await p.waitForTimeout(700); p.errs = errs; return p }
const focusDesc = p => p.evaluate(() => { const a = document.activeElement; return a ? (a.id || a.className || a.tagName) + (a.getAttribute('aria-activedescendant') ? ' ad=' + a.getAttribute('aria-activedescendant') : '') : 'none' })
let p = await mk()
// Tab order from the top
const order = []; for (let i = 0; i < 9; i++) { await p.keyboard.press('Tab'); order.push(await focusDesc(p)) }
console.log('tab order:', order.join(' -> '))
ok(order[0] === 'skip', 'first Tab lands on the skip link')
// skip link
await p.keyboard.press('Shift+Tab'); for (let i = 0; i < 20 && (await focusDesc(p)) !== 'skip'; i++) await p.keyboard.press('Shift+Tab')
await p.keyboard.press('Enter'); ok((await focusDesc(p)).startsWith('items'), 'skip link moves focus to the active list: ' + await focusDesc(p))
// arrows move selection & activedescendant together, live region announces
await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(400)
const ad = await p.evaluate(() => [document.activeElement.getAttribute('aria-activedescendant'), document.querySelector('.blade.is-active .item[aria-selected=true]').id, document.getElementById('live').textContent])
ok(ad[0] === ad[1], `arrow selection == focused activedescendant (${ad[0]})`); ok(/of 26/.test(ad[2]), 'live: ' + ad[2])
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400)
const st = await p.evaluate(() => [document.title, document.getElementById('live').textContent, document.activeElement.closest('.blade')?.id])
ok(st[0].startsWith('notes'), 'title: ' + st[0]); ok(/notes section/.test(st[1]), 'live: ' + st[1]); ok(st[2] === 'blade-notes', 'focus followed to notes list')
// reader: trap + return
await p.keyboard.press('Enter'); await p.waitForTimeout(600)
const inReader = []; for (let i = 0; i < 25; i++) { await p.keyboard.press('Tab'); inReader.push(await p.evaluate(() => !!document.activeElement.closest('#readerGlass'))) }
ok(inReader.every(Boolean), 'Tab x25 stays inside the reader'); ok((await p.title()).includes('·') && !(await p.title()).startsWith('notes'), 'reader title: ' + await p.title())
await p.keyboard.press('Shift+Tab'); ok(await p.evaluate(() => !!document.activeElement.closest('#readerGlass')), 'Shift+Tab stays inside the reader')
await p.keyboard.press('Escape'); await p.waitForTimeout(600)
ok((await focusDesc(p)).startsWith('items'), 'focus returns to opener list after reader: ' + await focusDesc(p))
// guide via orb button: trap + return to orb
await p.focus('#orbBtn'); await p.keyboard.press('Enter'); await p.waitForTimeout(600)
ok(await p.evaluate(() => document.activeElement.id === 'glist' && document.getElementById('orbBtn').getAttribute('aria-expanded') === 'true'), 'guide opens with focus on its list, orb aria-expanded=true')
const inGuide = []; for (let i = 0; i < 8; i++) { await p.keyboard.press('Tab'); inGuide.push(await p.evaluate(() => !!document.activeElement.closest('#guidePanel'))) }
ok(inGuide.every(Boolean), 'Tab stays inside the guide')
await p.keyboard.press('Escape'); await p.waitForTimeout(600); ok((await focusDesc(p)) === 'orbBtn', 'focus returns to the orb: ' + await focusDesc(p))
// sound switch via keyboard
await p.focus('#sound'); await p.keyboard.press('Space'); ok(await p.evaluate(() => document.getElementById('sound').getAttribute('aria-checked')) === 'true', 'Space toggles the sound switch')
await p.keyboard.press('Enter'); ok(await p.evaluate(() => document.getElementById('sound').getAttribute('aria-checked')) === 'false', 'Enter toggles it back (no double action)')
// tablist keyboard
await p.keyboard.press('2'); await p.focus('#tab-blog'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300)
ok((await focusDesc(p)) === 'tab-notes' && await p.evaluate(() => document.getElementById('tab-notes').getAttribute('aria-selected')) === 'true', 'tablist: ArrowRight moves focus + selection to next tab')
ok(await p.evaluate(() => getComputedStyle(document.getElementById('tabs')).opacity) === '1', 'desktop tablist becomes visible while focused')
console.log('errors', p.errs)
// toast: role=status and does not overlap any control
p = await mk(D, ''); await p.waitForTimeout(2400)
const ov = await p.evaluate(() => { const t = document.querySelector('.toast').getBoundingClientRect(); const hits = []
  for (const el of document.querySelectorAll('button, a[href], [role=option], [role=tab]')) { if (el.closest('.toast') || el.closest('[inert]') || !el.getClientRects().length) continue; const r = el.getBoundingClientRect(); if (getComputedStyle(el).opacity === '0' || el.closest('#tabs')) continue
    if (r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top) hits.push(el.textContent.trim().slice(0, 30) || el.id) }
  return [document.getElementById('toasts').getAttribute('role'), hits] })
ok(ov[0] === 'status', 'toast region role=status'); ok(!ov[1].length, 'toast overlaps no control ' + JSON.stringify(ov[1]))
// touch targets on mobile
p = await mk({ width: 390, height: 844 }, '?notoast', { hasTouch: true, isMobile: true })
const small = await p.evaluate(() => [...document.querySelectorAll('button, a[href], [role=option], [role=tab]')].filter(el => !el.closest('[inert]') && el.getClientRects().length && !el.classList.contains('blade-tab') && !el.closest('[hidden]')).map(el => { const r = el.getBoundingClientRect(); const a = getComputedStyle(el, '::after'); const ex = a.content !== 'none' ? 18 : 0; return [el.id || el.className || el.textContent.trim().slice(0, 20), Math.round(r.width), Math.round(r.height), ex] }).filter(([, w, h, ex]) => Math.min(w, h) + ex < 44))
ok(!small.length, 'mobile touch targets >= 44px ' + JSON.stringify(small))
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal scroll at 390px')
// zoom 200%: 1280x720 at 200% = 640x360 CSS px; 1920x1080 at 200% = 960x540
for (const vp of [{ width: 640, height: 360 }, { width: 960, height: 540 }]) {
  p = await mk(vp); 
  const r = await p.evaluate(() => { const l = document.querySelector('.blade.is-active .items').getBoundingClientRect(); return [Math.round(l.height), document.documentElement.scrollWidth <= innerWidth] })
  ok(r[0] >= 88 && r[1], `zoom ${vp.width}x${vp.height}: list height ${r[0]}px, no h-scroll ${r[1]}`)
}
// no-JS
p = await mk(D, '', { javaScriptEnabled: false }); 
const nj = await p.evaluate(() => [document.querySelectorAll('#fallback a[href^="https://maxleiter.com/blog/"]').length, document.querySelectorAll('#fallback li').length, getComputedStyle(document.getElementById('fallback')).display])
ok(nj[0] >= 26 && nj[2] === 'block', `no-JS fallback visible with ${nj[1]} links (${nj[0]} blog)`)
// boot failure fallback + axe on it
p = await mk(D); await p.evaluate(() => document.documentElement.classList.remove('js')); await p.addScriptTag({ path: AXE })
const fv = await p.evaluate(async () => (await axe.run()).violations.map(v => v.id + ':' + v.impact)); ok(!fv.length, 'axe on fallback: ' + JSON.stringify(fv))
await browser.close()
