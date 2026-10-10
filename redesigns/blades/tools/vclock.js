(() => {
  let now = 0, rafId = 0, rafQ = new Map(), tid = 0
  const timers = new Map(), born = new WeakMap()
  Object.defineProperty(performance, 'now', { value: () => now, configurable: true })
  window.requestAnimationFrame = cb => { rafQ.set(++rafId, cb); return rafId }
  window.cancelAnimationFrame = id => { rafQ.delete(id) }
  window.setTimeout = (fn, ms = 0, ...a) => { const id = ++tid; timers.set(id, { at: now + Math.max(0, +ms || 0), fn, a }); return id }
  window.setInterval = (fn, ms = 0, ...a) => { const id = ++tid; timers.set(id, { at: now + Math.max(1, +ms || 1), fn, a, every: Math.max(1, +ms || 1) }); return id }
  window.clearTimeout = window.clearInterval = id => { timers.delete(id) }
  // Chromium CHECK-crashes if a View Transition's pseudo animations are finish()ed while the document
  // timeline is frozen; end a transition with skipTransition() instead (same end state).
  let activeVT = null
  if (document.startViewTransition) { const o = document.startViewTransition; document.startViewTransition = function (cb) { const t = o.call(document, cb); activeVT = t; t.finished.finally(() => { if (activeVT === t) activeVT = null }); return t } }
  delete HTMLCanvasElement.prototype.transferControlToOffscreen // ambient renderer on the main thread, on the virtual clock
  window.__vclock = {
    step(ms) {
      const end = now + ms
      for (;;) {
        let next = null; for (const e of timers) if (e[1].at <= end && (!next || e[1].at < next[1].at)) next = e
        if (!next) break
        const [id, t] = next; now = Math.max(now, t.at); if (t.every) t.at += t.every; else timers.delete(id)
        try { if (typeof t.fn === 'function') t.fn(...t.a) } catch (e) { console.error(e) }
      }
      now = end
      const q = rafQ; rafQ = new Map(); for (const cb of q.values()) { try { cb(now) } catch (e) { console.error(e) } }
      this.seek()
    },
    seek() {
      let vtAnims = 0, vtDone = 0
      for (const a of document.getAnimations()) {
        if (!born.has(a)) { born.set(a, now); try { a.pause() } catch {} }
        const t = now - born.get(a), end = a.effect ? a.effect.getComputedTiming().endTime : 0
        const isVT = !!(a.effect && a.effect.pseudoElement && a.effect.pseudoElement.startsWith('::view-transition'))
        if (isVT) { vtAnims++; if (t >= end) vtDone++ }
        try {
          if (Number.isFinite(end) && t >= end) { if (isVT) a.currentTime = Math.max(0, end - 0.01); else a.finish() }
          else a.currentTime = t
        } catch {}
      }
      if (activeVT && vtAnims && vtDone === vtAnims) { try { activeVT.skipTransition() } catch {} }
    },
  }
})()
