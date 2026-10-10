// NIGHTRUN app: screens, focus/spatial navigation, input (keys, pointer, touch,
// gamepad), loading screens, reader dialog, sound + options, deterministic clock.
;(function () {
  'use strict'
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s))
  const D = JSON.parse($('#nr-data').textContent)
  const Q = new URLSearchParams(location.search)
  const root = document.documentElement
  const CAPTURE = Q.has('capture')
  const store = { get(k) { try { return localStorage.getItem('nr.' + k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem('nr.' + k, v) } catch (e) {} } }

  // ---------------------------------------------------------------- clock
  const clock = { t: 0, jobs: [] }
  const later = (ms, fn) => clock.jobs.push({ at: clock.t + ms / 1000, fn })
  function runJobs() {
    const due = clock.jobs.filter((j) => j.at <= clock.t)
    if (due.length) { clock.jobs = clock.jobs.filter((j) => j.at > clock.t); due.forEach((j) => j.fn()) }
  }

  // ---------------------------------------------------------------- motion / quality prefs
  const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false }
  let motionPref = store.get('motion') || 'system'
  if (Q.get('rm') === '1') motionPref = 'reduced'
  if (Q.get('rm') === '0') motionPref = 'full'
  const reduced = () => (motionPref === 'system' ? mq.matches : motionPref === 'reduced')
  function applyMotion() {
    root.classList.toggle('rm', reduced())
    if (glOK) NRScene.setReduced(reduced())
    const v = reduced() ? 'reduced' : 'full'
    $$('input[name=motion]').forEach((r) => (r.checked = r.value === v))
  }
  if (mq.addEventListener) mq.addEventListener('change', applyMotion)

  // ---------------------------------------------------------------- scene
  const canvas = $('#gl')
  let glOK = false
  if (!Q.has('nogl') && window.NRScene) {
    try { glOK = NRScene.init(canvas, { preserve: CAPTURE }) } catch (e) { console.error(e); glOK = false }
  }
  if (!glOK) root.classList.add('nogl')
  else {
    const q = Q.get('q') || store.get('quality') || 'auto'
    NRScene.setQuality(q)
    $$('input[name=quality]').forEach((r) => (r.checked = r.value === q))
    if (CAPTURE) NRScene.setFixed(true)
    const p0 = D.parts[0]
    NRScene.setPaint(p0.paint, p0.vinyl, p0.glow); NRScene.setPaint(p0.paint, p0.vinyl, p0.glow)
  }
  applyMotion()

  // ---------------------------------------------------------------- ring gauge
  const NS = 'http://www.w3.org/2000/svg'
  const A0 = -130, A1 = 130
  const ang = (v) => A0 + ((A1 - A0) * v) / 9
  const pol = (a, r) => [100 + Math.sin((a * Math.PI) / 180) * r, 100 - Math.cos((a * Math.PI) / 180) * r]
  const arc = (a0, a1, r) => { const [x0, y0] = pol(a0, r), [x1, y1] = pol(a1, r); return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}` }
  ;(function ticks() {
    const g = $('#ticks')
    for (let i = 0; i <= 36; i++) {
      const v = i / 4, a = ang(v), mj = i % 4 === 0
      const [x0, y0] = pol(a, mj ? 66 : 70), [x1, y1] = pol(a, 78)
      const l = document.createElementNS(NS, 'line'); l.setAttribute('x1', x0); l.setAttribute('y1', y0); l.setAttribute('x2', x1); l.setAttribute('y2', y1)
      if (mj) l.setAttribute('class', 'mj'); g.appendChild(l)
      if (mj) { const [tx, ty] = pol(a, 54); const t = document.createElementNS(NS, 'text'); t.setAttribute('x', tx); t.setAttribute('y', ty + 4); t.textContent = v; g.appendChild(t) }
    }
    $('#r-red').setAttribute('d', arc(ang(7.5), ang(9), 74))
  })()
  const gauge = { v: 0, vel: 0, target: 1, boost: 0 }
  function gaugeStep(dt) {
    const tgt = Math.min(9, gauge.target + gauge.boost)
    gauge.boost = Math.max(0, gauge.boost - dt * 9)
    if (reduced()) { gauge.v = tgt; gauge.vel = 0 } else {
      gauge.vel += (tgt - gauge.v) * 160 * dt - gauge.vel * 15 * dt
      gauge.v += gauge.vel * dt
    }
    const v = Math.max(0, Math.min(9.2, gauge.v + (reduced() ? 0 : Math.sin(clock.t * 31) * 0.03)))
    $('#needle').setAttribute('transform', `rotate(${ang(v)} 100 100)`)
    $('#r-fill').setAttribute('d', arc(A0, Math.max(A0 + 0.5, ang(v)), 86))
  }
  const setGauge = (frac, num, lab, gear) => {
    gauge.target = 1.2 + 6.2 * frac
    $('#r-num').textContent = String(num).padStart(3, '0'); $('#r-lab').textContent = lab; $('#r-gear').textContent = gear
  }
  const rev = () => { gauge.boost = 4.5; NRAudio.play('rev') }

  // ---------------------------------------------------------------- live region
  let liveT = 0
  function announce(msg) { clearTimeout(liveT); liveT = setTimeout(() => { $('#live').textContent = ''; setTimeout(() => ($('#live').textContent = msg), 30) }, 280) }

  // ---------------------------------------------------------------- screens
  const SCREENS = {
    title: { shot: 'title', title: 'Max Leiter — Nightrun', crumb: 'Press Start', dim: 0, items: () => [$('#start')] },
    menu: { shot: 'menu', title: 'Main Menu — Max Leiter', crumb: 'Main Menu', dim: 0, items: () => $$('#s-menu .bar'), sel: 0,
      onSel(i, el) { $('#mdesc').textContent = el.dataset.desc; setGauge(i / 5, [D.posts.length, D.notes.length, D.parts.length, D.crew.length, 1, 6][i], ['EVENTS', 'SPRINTS', 'PARTS', 'JOBS', 'DRIVER', 'OPTIONS'][i], i + 1) },
      activate(el) { go(el.dataset.go) } },
    career: { shot: 'side', title: 'Career — Max Leiter', crumb: 'Career', dim: 0.15, items: () => $$('#s-career .ev'), action: () => $('#ec-go'), sel: 0,
      onSel(i) {
        const p = D.posts[i]
        $('#ec-type').textContent = p.type; $('#ec-dist').textContent = p.district; $('#ec-t').textContent = p.title
        $('#ec-date').textContent = p.date; $('#ec-intel').textContent = p.intel
        $('#ec-stars').innerHTML = stars(p.stars)
        $$('#s-career .rt, #s-career .mk').forEach((n) => n.classList.toggle('on', +n.dataset.i === i))
        $$('#s-career .dist').forEach((n) => n.classList.toggle('on', n.dataset.d === p.did))
        setGauge(i / (D.posts.length - 1), i + 1, 'EVENT', (i % 6) + 1)
        return `${p.type.toLowerCase()} in ${p.district.toLowerCase()}, difficulty ${p.stars} of 5. ${p.intel}`
      },
      activate(el) { openReader('post', +el.dataset.i, el) } },
    quick: { shot: 'side', title: 'Quick Race — Max Leiter', crumb: 'Quick Race', dim: 0.15, items: () => $$('#s-quick .qr'), action: () => $('#qc-go'), sel: 0,
      onSel(i) {
        const n = D.notes[i]
        $('#qc-t').textContent = n.title; $('#qc-date').textContent = n.date; $('#qc-intel').textContent = n.intel; $('#qc-lap').textContent = 'BEST ' + n.lap
        setGauge(i / (D.notes.length - 1), i + 1, 'SPRINT', (i % 6) + 1)
        return n.intel
      },
      activate(el) { openReader('note', +el.dataset.i, el) } },
    garage: { shot: 'garage', title: 'Garage — Max Leiter', crumb: 'Garage', dim: 0, items: () => $$('#s-garage .pt'), sel: 0,
      onSel(i) {
        const p = D.parts[i]
        $('#pc-type').textContent = p.type; $('#pc-paint').textContent = 'PAINT · ' + p.pname; $('#pc-t').textContent = p.title; $('#pc-desc').textContent = p.desc
        $('#pc-stats').innerHTML = Object.entries(p.stats).map(([k, v]) => `<div><dt>${k}</dt><dd><span class="sbar" aria-hidden="true"><i style="width:${v}%"></i></span><span class="sval">${v}</span></dd></div>`).join('')
        $('#pc-stars').innerHTML = stars(p.stars, 'Rating')
        if (glOK) NRScene.setPaint(p.paint, p.vinyl, p.glow)
        NRAudio.play('paint')
        setGauge(p.stats.POWER / 100, i + 1, 'PART', (i % 6) + 1)
        return `${p.type.toLowerCase()}, repainted ${p.pname.toLowerCase()}. Power ${p.stats.POWER}, handling ${p.stats.HANDLING}, tech ${p.stats.TECH}, hype ${p.stats.HYPE}.`
      } },
    crew: { shot: 'side', title: 'Crew — Max Leiter', crumb: 'Crew', dim: 0.15, items: () => $$('#s-crew .card'), grid: () => (innerWidth <= 760 ? 1 : 3), sel: 0,
      onSel(i) { const c = D.crew[i]; $('#crew-desc').textContent = c.desc; setGauge(c.rep / 100, i + 1, 'MEMBER', (i % 6) + 1); return c.desc } },
    profile: { shot: 'side', title: 'Profile — Max Leiter', crumb: 'Profile', dim: 0.15, items: () => $$('#s-profile .cbtn'), grid: () => 99, sel: 0,
      onSel(i) { setGauge(0.5 + i * 0.2, D.posts.length + D.notes.length, 'ENTRIES', 'S') } },
    options: { shot: 'menu', title: 'Options — Max Leiter', crumb: 'Options', dim: 0.15, sel: 0,
      items: () => [$('#o-music'), $('#o-sfx'), $('#o-vol'), $('input[name=motion]:checked'), $('input[name=quality]:checked')],
      onSel(i) { setGauge(i / 4, 6, 'OPTIONS', i + 1) } },
  }
  const stars = (n, l = 'Difficulty') => `<span class="stars" role="img" aria-label="${l} ${n} of 5">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(5 - n)}</span>`
  let cur = null, busy = false, lastOpener = null

  function show(name, opts = {}) {
    const S = SCREENS[name]
    cur = name
    $$('.screen').forEach((s) => (s.hidden = s.dataset.s !== name))
    const el = $('#s-' + name)
    el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter')
    root.classList.toggle('at-title', name === 'title')
    root.classList.toggle('in-sec', name !== 'title' && name !== 'menu')
    $('#crumb').textContent = S.crumb
    $('#plate').classList.remove('enter'); void $('#plate').offsetWidth
    if (name === 'menu') $('#hud').classList.add('enter'); else $('#hud').classList.remove('enter')
    document.title = S.title
    if (glOK) { NRScene.setShot(S.shot); NRScene.setDim(S.dim) }
    try { history.replaceState(null, '', location.pathname + location.search + (name === 'title' ? '' : '#s-' + name)) } catch (e) {}
    if (name === 'title') setGauge(0, 0, 'READY', 'N')
    const items = S.items()
    const i = Math.min(opts.sel ?? S.sel ?? 0, items.length - 1)
    select(i, { focus: true, scroll: true, quiet: true })
    if (!opts.silent) announce(name === 'title' ? 'Title screen. Press Enter to start.' : `${S.crumb}. ${items.length} items.`)
  }
  function select(i, o = {}) {
    const S = SCREENS[cur], items = S.items()
    if (!items.length) return
    i = Math.max(0, Math.min(items.length - 1, i))
    const el = items[i]
    const changed = S.sel !== i
    S.sel = i
    items.forEach((n, k) => { n.classList.toggle('sel', k === i); if (n.matches('a.row, a.card, a.bar')) { if (k === i) n.setAttribute('aria-current', 'true'); else n.removeAttribute('aria-current') } })
    let extra
    if (S.onSel && (changed || o.force || !S._init)) { extra = S.onSel(i, el); S._init = true }
    if (o.focus && document.activeElement !== el) el.focus({ preventScroll: true })
    if (o.scroll) el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    if (changed && !o.quiet) NRAudio.play('move')
    if (extra && o.announce) announce(extra)
  }
  function move(dir, axis) {
    if (!cur || busy) return
    const S = SCREENS[cur], items = S.items()
    const a = document.activeElement
    if (S.action && a === S.action()) { if (axis === 'x' && dir < 0) select(S.sel, { focus: true }); else if (axis === 'y') select(S.sel + dir, { focus: true, scroll: true, announce: true }); return }
    if (cur === 'options' && axis === 'x') return optAdjust(dir)
    const cols = S.grid ? S.grid() : 1
    if (axis === 'x') {
      if (cols > 1) return select(S.sel + dir, { focus: true, scroll: true, announce: true })
      if (dir > 0 && S.action) { S.action().focus(); NRAudio.play('move'); return }
      return
    }
    select(S.sel + dir * Math.min(cols, items.length), { focus: true, scroll: true, announce: true })
  }
  function activate() {
    if (busy) return
    const a = document.activeElement
    if (a && a !== document.body && a.matches('a,button,input[type=radio]')) { a.click(); return }
    const S = SCREENS[cur]; const el = S.items()[S.sel]; if (el) el.click()
  }
  function back() {
    if (busy) return
    if ($('#reader').open) return closeReader()
    if (cur === 'title') return
    NRAudio.play('back')
    if (cur === 'menu') { show('title'); return }
    show('menu')
  }
  function go(name) {
    if (busy) return
    NRAudio.play('whoosh'); rev()
    loading(name === 'quick' ? 'Quick Race' : SCREENS[name].crumb, () => show(name))
  }
  let tipN = Math.floor((D.tips.length * 0.37)) % D.tips.length
  function loading(label, done) {
    busy = true
    const L = $('#loading'), fill = $('#ld-fill')
    $('#ld-name').textContent = label; $('#ld-ghost').textContent = label
    $('#ld-tip').textContent = D.tips[tipN++ % D.tips.length]
    fill.style.width = '0%'
    L.hidden = false
    const dur = reduced() ? 0.45 : 1.25, t0 = clock.t
    const tick = () => {
      const k = Math.min(1, (clock.t - t0) / dur)
      fill.style.width = (100 * (1 - Math.pow(1 - k, 2.2))).toFixed(1) + '%'
      if (k < 1) later(16, tick)
      else later(120, () => { L.hidden = true; busy = false; done() })
    }
    tick()
  }

  // ---------------------------------------------------------------- reader dialog
  const reader = $('#reader')
  function openReader(kind, i, opener) {
    if (busy) return
    lastOpener = opener || document.activeElement
    const p = kind === 'post' ? D.posts[i] : D.notes[i]
    NRAudio.play('whoosh'); rev()
    loading(kind === 'post' ? 'Event' : 'Sprint', () => {
      $('#rd-kind').textContent = kind === 'post' ? 'Event briefing' : 'Quick race notes'
      $('#rd-meta').textContent = kind === 'post' ? `${p.date} · ${p.district} · ${p.type}` : `${p.date} · best ${p.lap}`
      $('#rd-t').textContent = p.title
      const b = $('#rd-body'); b.innerHTML = ''; b.appendChild($('#ex-' + (kind === 'post' ? 'p' : 'n') + i).content.cloneNode(true)); b.scrollTop = 0
      $('#rd-link').href = p.href
      reader.showModal()
      $('#rd-t').focus()
      document.title = p.title + ' — Max Leiter'
      if (glOK) { NRScene.setDim(0.45) }
    })
  }
  function closeReader() { if (reader.open) reader.close() }
  reader.addEventListener('close', () => {
    NRAudio.play('back')
    document.title = SCREENS[cur].title
    if (glOK) NRScene.setDim(SCREENS[cur].dim)
    if (lastOpener && lastOpener.isConnected) lastOpener.focus({ preventScroll: true })
  })
  $('#rd-close').addEventListener('click', closeReader)
  reader.addEventListener('click', (e) => { if (e.target === reader) closeReader() })

  // ---------------------------------------------------------------- wiring: clicks, pointer, touch
  let ptrType = 'mouse', downSel = false
  document.addEventListener('pointerdown', (e) => {
    ptrType = e.pointerType || 'mouse'
    const it = e.target.closest('.bar,.row,.card,.cbtn')
    downSel = !!(it && it.classList.contains('sel'))
  }, true)
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || busy || reader.open) return
    const it = e.target.closest('.bar,.row,.card,.cbtn,#o-music,#o-sfx')
    if (!it || !cur) return
    const items = SCREENS[cur].items(), i = items.indexOf(it)
    if (i >= 0 && i !== SCREENS[cur].sel) select(i, { focus: true })
  })
  document.addEventListener('focusin', (e) => {
    if (!cur) return
    const items = SCREENS[cur].items(), i = items.indexOf(e.target)
    if (i >= 0 && i !== SCREENS[cur].sel) select(i, { announce: true })
  })
  document.addEventListener('click', (e) => {
    const it = e.target.closest('.bar,.row,.card,.cbtn')
    if (!it || !cur) return
    const S = SCREENS[cur], items = S.items(), i = items.indexOf(it)
    if (i < 0) return
    // touch: first tap selects, second tap activates
    if (ptrType === 'touch' && e.detail > 0 && !downSel) { e.preventDefault(); select(i, { focus: true, announce: true }); return }
    if (S.activate) { e.preventDefault(); select(i); S.activate(it) }
    else rev()
    ptrType = 'mouse'
  })
  $('#start').addEventListener('click', () => { if (busy) return; NRAudio.play('start'); rev(); show('menu') })
  $('#ec-go').addEventListener('click', () => { const S = SCREENS.career; openReader('post', S.sel, S.items()[S.sel]) })
  $('#qc-go').addEventListener('click', () => { const S = SCREENS.quick; openReader('note', S.sel, S.items()[S.sel]) })
  $('#hb-back').addEventListener('click', back)

  // ---------------------------------------------------------------- sound + options
  const sndBtn = $('#snd')
  function syncSound() {
    const on = NRAudio.music || NRAudio.sfx
    sndBtn.setAttribute('aria-pressed', String(on)); sndBtn.querySelector('b').textContent = on ? 'On' : 'Off'
    $('#o-music').setAttribute('aria-checked', String(NRAudio.music)); $('#o-sfx').setAttribute('aria-checked', String(NRAudio.sfx))
  }
  function toggleSound() {
    const on = !(NRAudio.music || NRAudio.sfx)
    NRAudio.setSfx(on); NRAudio.setMusic(on); syncSound()
    announce(on ? 'Sound on. Music playing.' : 'Sound off.')
    if (on) NRAudio.play('clunk')
  }
  sndBtn.addEventListener('click', toggleSound)
  $('#o-music').addEventListener('click', () => { NRAudio.setMusic(!NRAudio.music); syncSound() })
  $('#o-sfx').addEventListener('click', () => { NRAudio.setSfx(!NRAudio.sfx); syncSound(); NRAudio.play('clunk') })
  $('#o-vol').addEventListener('input', (e) => { const v = +e.target.value; $('#o-volv').textContent = v; NRAudio.setVol(v / 10) })
  $$('input[name=motion]').forEach((r) => r.addEventListener('change', () => { motionPref = r.value; store.set('motion', r.value); applyMotion() }))
  $$('input[name=quality]').forEach((r) => r.addEventListener('change', () => { store.set('quality', r.value); if (glOK) NRScene.setQuality(r.value) }))
  function optAdjust(dir) {
    const a = document.activeElement
    if (a.id === 'o-vol') return // native range handles left/right
    if (a.type === 'radio') return // native radio group handles left/right
    if (a.getAttribute('role') === 'switch') { const want = dir > 0; if ((a.getAttribute('aria-checked') === 'true') !== want) a.click() }
  }
  syncSound()

  // ---------------------------------------------------------------- keyboard
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    root.classList.remove('pad')
    const k = e.key, t = e.target
    if (busy) { if (k !== 'Tab') e.preventDefault(); return }
    if (reader.open) {
      if (k === 'ArrowDown' || k === 'ArrowUp') { $('#rd-body').scrollBy({ top: k === 'ArrowDown' ? 80 : -80 }); e.preventDefault() }
      return
    }
    if (k === 'm' || k === 'M') { toggleSound(); return }
    if (cur === 'title') { if (k === 'Enter' || k === ' ') { e.preventDefault(); $('#start').click() } return }
    const inRange = t && t.type === 'range', inRadio = t && t.type === 'radio'
    if (k === 'ArrowDown') { e.preventDefault(); move(1, 'y') }
    else if (k === 'ArrowUp') { e.preventDefault(); move(-1, 'y') }
    else if (k === 'ArrowRight' && !inRange && !inRadio) { e.preventDefault(); move(1, 'x') }
    else if (k === 'ArrowLeft' && !inRange && !inRadio) { e.preventDefault(); move(-1, 'x') }
    else if (k === 'Escape' || (k === 'Backspace' && !inRange)) { e.preventDefault(); back() }
    else if (k === ' ' && t && t.matches('a')) { e.preventDefault(); activate() }
  })

  // ---------------------------------------------------------------- gamepad
  const pad = { held: {}, seen: false }
  function pollPad(dt) {
    if (!navigator.getGamepads) return
    const pads = navigator.getGamepads()
    let gp = null
    for (const p of pads) if (p && p.connected) { gp = p; break }
    $('#padstat').textContent = gp ? 'Controller connected' : ''
    if (!gp) return
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed)
    const ax = gp.axes || []
    const st = { up: b(12) || ax[1] < -0.55, down: b(13) || ax[1] > 0.55, left: b(14) || ax[0] < -0.55, right: b(15) || ax[0] > 0.55, ok: b(0), back: b(1), start: b(9) }
    for (const key in st) {
      const h = pad.held[key] || (pad.held[key] = { on: false, t: 0 })
      if (st[key] && !h.on) { h.on = true; h.t = 0.38; root.classList.add('pad'); padAct(key) }
      else if (st[key] && h.on && /up|down|left|right/.test(key)) { h.t -= dt; if (h.t <= 0) { h.t = 0.11; padAct(key) } }
      else if (!st[key]) h.on = false
    }
  }
  function padAct(key) {
    if (busy) return
    if (reader.open) {
      if (key === 'back') closeReader()
      else if (key === 'down' || key === 'up') $('#rd-body').scrollBy({ top: key === 'down' ? 90 : -90 })
      else if (key === 'ok' && document.activeElement) document.activeElement.click()
      return
    }
    if (cur === 'title') { if (key === 'ok' || key === 'start') $('#start').click(); return }
    if (key === 'up') move(-1, 'y'); else if (key === 'down') move(1, 'y')
    else if (key === 'left' || key === 'right') {
      const a = document.activeElement, d = key === 'left' ? -1 : 1
      if (a && a.type === 'range') { a.value = +a.value + d; a.dispatchEvent(new Event('input')) }
      else if (a && a.type === 'radio') { const g = $$(`input[name=${a.name}]`), j = (g.indexOf(a) + d + g.length) % g.length; g[j].checked = true; g[j].focus(); g[j].dispatchEvent(new Event('change')) }
      else move(d, 'x')
    } else if (key === 'ok') activate()
    else if (key === 'back') back()
    else if (key === 'start') toggleSound()
  }

  // ---------------------------------------------------------------- text zones (CA mask)
  function textRects() {
    if (!glOK) return
    const W = innerWidth, H = innerHeight, out = []
    const els = $$('.tz').filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
    if (reader.open) els.push($('.rd-in'))
    if (!$('#loading').hidden) out.push([0, 0, 1, 1])
    for (const e of els) { const r = e.getBoundingClientRect(); if (r.width > 4 && r.height > 4) out.push([r.left / W, r.top / H, r.right / W, r.bottom / H, r.width * r.height]) }
    out.sort((a, b) => (b[4] || 1e9) - (a[4] || 1e9))
    // merge into at most 6 boxes
    while (out.length > 6) { const a = out.pop(), b = out.pop(); out.push([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3]), 0]) }
    NRScene.setTextRects(out.map((r) => r.slice(0, 4)))
  }

  // ---------------------------------------------------------------- frame loop
  let frameN = 0, lastReal = performance.now()
  function tick(dt, realDt, draw) {
    clock.t += dt
    runJobs()
    pollPad(dt)
    gaugeStep(dt)
    if (glOK) {
      if (frameN % 10 === 0) textRects()
      NRScene.frame(clock.t, dt, realDt, draw)
      if (cur === 'options' && frameN % 30 === 0) { const i = NRScene.info(); $('#o-info').textContent = `Renderer: WebGL2 · ${i.hdr ? 'HDR 16F' : 'LDR'} · MSAA ${i.msaa}× · ${i.w}×${i.h} (${Math.round(i.scale * 100)}%)` }
    }
    frameN++
  }
  if (!glOK) $('#o-info').textContent = 'Renderer: CSS fallback (WebGL2 unavailable)'
  addEventListener('resize', () => { if (glOK) { NRScene.resize(); NRScene.setShot(SCREENS[cur] ? SCREENS[cur].shot : 'title') } })
  function raf(now) {
    const realDt = now - lastReal; lastReal = now
    tick(Math.min(0.05, realDt / 1000), realDt)
    requestAnimationFrame(raf)
  }
  // deterministic capture hook: the page only advances when told to
  if (CAPTURE) {
    const seen = new WeakMap()
    window.__NR = {
      advance(ms, draw) {
        tick(ms / 1000, ms, draw)
        for (const a of document.getAnimations()) {
          if (!seen.has(a)) { seen.set(a, clock.t - ms / 1000); a.pause() }
          a.currentTime = (clock.t - seen.get(a)) * 1000
        }
      },
      t: () => clock.t,
    }
  }

  // ---------------------------------------------------------------- boot
  const start = Q.get('s') || (location.hash.startsWith('#s-') ? location.hash.slice(3) : '')
  if (SCREENS[start]) { show(start, { sel: +(Q.get('i') || 0), silent: true }) } else show('title', { silent: true })
  if (Q.get('open') === '1' && (cur === 'career' || cur === 'quick')) { busy = false; openReader(cur === 'career' ? 'post' : 'note', SCREENS[cur].sel) }
  if (glOK) NRScene.setShot(SCREENS[cur].shot, true)
  if (!CAPTURE) requestAnimationFrame(raf)
  else tick(0, 0)
  window.NRApp = { show, select, go, openReader, back, move, clock, get cur() { return cur } }
})()
