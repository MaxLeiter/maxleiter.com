/* ================================================================ app */
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const root = document.documentElement
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)')
let RM = mqReduce.matches, motionChoice = null
function setRM(v) {
  RM = !!v
  root.classList.toggle('rm', RM)
  root.classList.toggle('motion-ok', !RM)
  surfaces.forEach((s) => (s.dirty = true))
  $('#stMotion')?.setAttribute('aria-checked', RM)
}
mqReduce.addEventListener?.('change', (e) => { if (motionChoice === null) setRM(e.matches) })

/* polite, debounced announcements for focus moved by arrows or a controller */
let annT = 0
function announce(msg) {
  clearTimeout(annT)
  annT = setTimeout(() => { const a = $('#announcer'); a.textContent = ''; setTimeout(() => (a.textContent = msg), 30) }, 220)
}
function setTitle(part) { document.title = part ? `${part} · Plaza · Max Leiter` : 'Max Leiter · Plaza' }
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches
const COARSE = matchMedia('(pointer: coarse)').matches

const CH = [
  { id: 'blog', name: 'Blog', color: '#f08a24', sub: `${DATA.posts.length} posts, newest first`, r: R.blog },
  { id: 'notes', name: 'Notes', color: '#2fae6b', sub: `${DATA.notes.length} short notes`, r: R.notes },
  { id: 'projects', name: 'Projects', color: '#8a5ad6', sub: `${DATA.projects.length} things I've made`, r: R.projects },
  { id: 'work', name: 'Work', color: '#2f74d0', sub: 'Writing and launches at Vercel', r: R.work },
  { id: 'about', name: 'About', color: '#3a9be0', sub: 'Hello there', r: R.about },
  { id: 'links', name: 'Links', color: '#e0559a', sub: 'Elsewhere on the internet', r: R.links },
  { id: 'forecast', name: 'Forecast', color: '#f29b1e', sub: "Today's build conditions", r: R.forecast },
  { id: 'jukebox', name: 'Jukebox', color: '#d6409f', sub: 'An original procedural loop', r: R.jukebox },
  { id: 'empty1', empty: true }, { id: 'empty2', empty: true }, { id: 'empty3', empty: true }, { id: 'empty4', empty: true },
]
const byId = Object.fromEntries(CH.map((c) => [c.id, c]))

/* ---------------------------------------------------------------- surfaces */
const surfaces = new Set()
const ro = new ResizeObserver((ents) => ents.forEach((e) => fit(e.target.__s)))
const io = new IntersectionObserver((ents) => ents.forEach((e) => { e.target.__s.visible = e.isIntersecting; e.target.__s.dirty = true }))

function surface(canvas, draw, opts = {}) {
  const s = { canvas, ctx: canvas.getContext('2d'), draw, st: opts.st || {}, w: 0, h: 0, dpr: 1, visible: true, dirty: true, off: opts.off || 0, cull: !!opts.cull }
  canvas.__s = s
  surfaces.add(s)
  ro.observe(canvas)
  if (s.cull) io.observe(canvas)
  fit(s)
  return s
}
function fit(s) {
  if (!s) return
  // layout size, not getBoundingClientRect: a canvas measured mid-zoom would come out tiny
  const r = { width: s.canvas.clientWidth, height: s.canvas.clientHeight }
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  if (!r.width || !r.height) return
  const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr)
  if (W !== s.canvas.width || H !== s.canvas.height) { s.canvas.width = W; s.canvas.height = H }
  s.w = r.width; s.h = r.height; s.dpr = dpr; s.dirty = true
}
function paint(s, t) {
  if (!s.w) return
  s.ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0)
  s.draw(s.ctx, s.w, s.h, t + s.off, s.st)
  s.dirty = false
}
function drop(s) { if (!s) return; ro.unobserve(s.canvas); io.unobserve(s.canvas); surfaces.delete(s) }

/* ---------------------------------------------------------------- tiles */
const track = $('#track')
const tiles = CH.map((ch, i) => {
  const el = document.createElement(ch.empty ? 'div' : 'button')
  el.className = 'tile' + (ch.empty ? ' empty' : '')
  el.style.setProperty('--i', i)
  el.style.setProperty('--d', (i * 0.73) % 9 + 's')
  if (ch.empty) el.setAttribute('aria-hidden', 'true')
  else { el.type = 'button'; el.dataset.ch = ch.id }
  el.innerHTML = (ch.empty ? '' : `<span class="sr-only">${ch.name} channel</span>`) + '<span class="bezel" aria-hidden="true"><span class="screen"><canvas></canvas><span class="glare"></span></span></span>'
  el.__ch = ch
  return el
})
let perPage = 0, pageCount = 1, curPage = 0, isMobile = false, dockGeo = null

function layout() {
  const W = innerWidth, H = innerHeight
  isMobile = W < 700
  dockGeo = isMobile
    ? { H: 134, cx: 58, cy: 74, R: 50, r: 38, top: 52 }
    : { H: 150, cx: Math.min(118, W * 0.09), cy: 86, R: 74, r: 56, top: 58 }
  drawDock(W)
  const availH = H - dockGeo.H - (isMobile ? 64 : 44)
  let cols = 4, rows = 3
  if (isMobile) { cols = 2; rows = Math.max(1, Math.min(4, Math.floor((availH + 14) / 124))) }
  else if (W < 1000) { cols = 3; rows = 3 }
  const gx = isMobile ? 14 : Math.max(14, Math.min(26, W * 0.018)), gy = isMobile ? 14 : gx
  const aspect = isMobile ? 1.38 : 1.72
  const availW = W - (isMobile ? 32 : Math.max(48, W * 0.1))
  const tw = Math.floor(Math.min((availW - gx * (cols - 1)) / cols, ((availH - gy * (rows - 1)) / rows) * aspect))
  // phones: let tiles grow taller to use the height, within a sane aspect
  const th = isMobile ? Math.round(Math.min(tw / 1.12, Math.max(tw / aspect, (availH - gy * (rows - 1)) / rows))) : Math.round(tw / aspect)
  const set = (k, v) => root.style.setProperty(k, v)
  set('--tw', tw + 'px'); set('--th', th + 'px'); set('--gx', gx + 'px'); set('--gy', gy + 'px'); set('--cols', cols)
  set('--tr', Math.round(th * 0.15) + 'px'); set('--bz', Math.max(4, Math.round(th * 0.042)) + 'px')
  set('--dh', dockGeo.H + 'px'); set('--ocx', dockGeo.cx + 'px'); set('--ocy', dockGeo.cy + 'px'); set('--or', dockGeo.r + 'px'); set('--btop', dockGeo.top + 'px')
  const per = cols * rows
  if (per !== perPage) {
    perPage = per
    track.textContent = ''
    pageCount = Math.ceil(tiles.length / per)
    for (let p = 0; p < pageCount; p++) {
      const page = document.createElement('div')
      page.className = 'page'
      page.setAttribute('role', 'group')
      page.setAttribute('aria-label', `Page ${p + 1} of ${pageCount}`)
      tiles.slice(p * per, p * per + per).forEach((t) => page.appendChild(t))
      track.appendChild(page)
    }
    $('#dots').innerHTML = pageCount > 1 ? Array.from({ length: pageCount }, (_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('') : ''
    curPage = 0; track.scrollLeft = 0
  }
  $('#prevPage').hidden = $('#nextPage').hidden = isMobile || pageCount < 2
  updatePageUI()
}

function drawDock(W) {
  const g = dockGeo, svg = $('#dockShape'), H = g.H
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
  const a = 0.95, fil = g.R * 0.75
  const ax = g.R * Math.sin(a), ay = g.cy - g.R * Math.cos(a)
  const L = g.cx, Rr = W - g.cx
  const top = `M0 ${g.cy - g.R} H${L} A${g.R} ${g.R} 0 0 1 ${L + ax} ${ay} C${L + ax + fil * 0.45} ${g.top} ${L + g.R + fil * 0.2} ${g.top} ${L + g.R + fil} ${g.top} H${Rr - g.R - fil} C${Rr - g.R - fil * 0.2} ${g.top} ${Rr - ax - fil * 0.45} ${g.top} ${Rr - ax} ${ay} A${g.R} ${g.R} 0 0 1 ${Rr} ${g.cy - g.R} H${W}`
  svg.querySelector('.fill').setAttribute('d', top + ` V${H} H0 Z`)
  svg.querySelector('.line').setAttribute('d', top)
  svg.querySelector('.hi').setAttribute('d', top)
}

function updatePageUI() {
  $$('#dots i').forEach((d, i) => d.classList.toggle('on', i === curPage))
  $('#prevPage').classList.toggle('dim', curPage === 0)
  $('#nextPage').classList.toggle('dim', curPage >= pageCount - 1)
}
function goPage(p, smooth = true) {
  p = Math.max(0, Math.min(pageCount - 1, p))
  track.scrollTo({ left: p * track.clientWidth, behavior: smooth && !RM ? 'smooth' : 'auto' })
  if (p !== curPage) Sound.tick()
  curPage = p; updatePageUI()
}
track.addEventListener('scroll', () => {
  const p = Math.round(track.scrollLeft / Math.max(1, track.clientWidth))
  if (p !== curPage) { curPage = p; updatePageUI(); Sound.tick(); hideBubble(); announce(`Page ${p + 1} of ${pageCount}`) }
}, { passive: true })
$('#prevPage').onclick = () => goPage(curPage - 1)
$('#nextPage').onclick = () => goPage(curPage + 1)

/* ---------------------------------------------------------------- hover, bubble, rumble */
const bubble = $('#bubble')
let hot = null
function setHot(el, via) {
  if (hot === el) return
  if (hot) hot.classList.remove('hot')
  hot = el
  if (!el) return hideBubble()
  el.classList.add('hot')
  if (el.classList.contains('tile') && !el.__ch.empty) {
    if (!RM) { el.classList.remove('rumble'); void el.offsetWidth; el.classList.add('rumble') }
    Sound.bloop(tiles.indexOf(el))
    showBubble(el)
    if (via === 'pad') padRumble(0.25)
    if (via === 'touch') navigator.vibrate?.(8)
  }
}
function showBubble(el) {
  const r = el.getBoundingClientRect()
  bubble.textContent = el.__ch.name
  bubble.style.left = r.left + r.width / 2 + 'px'
  const above = r.top > 70
  bubble.style.top = (above ? r.top - 6 : r.bottom + 50) + 'px'
  bubble.classList.toggle('below', !above)
  bubble.classList.add('show')
}
function hideBubble(now) {
  if (now) { bubble.style.transition = 'none'; bubble.classList.remove('show'); void bubble.offsetWidth; bubble.style.transition = ''; return }
  bubble.classList.remove('show')
}
for (const t of tiles) {
  if (t.__ch.empty) continue
  t.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return
    // keep one selection: if a tile holds focus, the pointer takes it along
    if (document.activeElement?.classList.contains('tile') && document.activeElement !== t) t.focus({ preventScroll: true })
    setHot(t, 'mouse')
  })
  t.addEventListener('pointerleave', (e) => { if (hot === t && e.pointerType !== 'touch') setHot(null) })
  t.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') setHot(t, 'touch') })
  t.addEventListener('focus', () => setHot(t, 'key'))
  t.addEventListener('blur', () => { if (hot === t) setHot(null) })
  t.addEventListener('click', () => openChannel(t.__ch))
}
for (const b of $$('.orb, .pill-sm')) b.addEventListener('pointerenter', () => Sound.bloop(3))

/* ---------------------------------------------------------------- clock */
function tickClock() {
  const d = new Date(), h = d.getHours(), m = d.getMinutes()
  $('#hh').textContent = String(h % 12 || 12)
  $('#mm').textContent = String(m).padStart(2, '0')
  $('#ampm').textContent = h < 12 ? 'AM' : 'PM'
  $('#date').textContent = `${DAY_NAMES[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`
  $('#chClock').textContent = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
tickClock(); setInterval(tickClock, 1000)

/* ---------------------------------------------------------------- toast */
let toastT = 0
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show')
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms)
}

/* ---------------------------------------------------------------- sound UI */
Jingle.wanted = true
function syncSound() {
  const on = Sound.on
  $('#soundBtn').setAttribute('aria-pressed', on)
  $('#soundBtn').classList.toggle('on', on)
  $('#soundBtn .lbl').textContent = on ? 'Sound on' : 'Sound off'
  $('#stSound').setAttribute('aria-checked', on)
  $('#stJingle').setAttribute('aria-checked', Jingle.wanted)
  const jb = $('#jbPlay'); if (jb) jb.textContent = Jingle.playing ? 'Stop' : 'Play'
}
Sound.onChange(syncSound)
$('#soundBtn').onclick = () => { Sound.setOn(!Sound.on); if (Sound.on) { Sound.select(); toast(Jingle.wanted ? 'Sound on. Enjoy the little tune.' : 'Sound on.') } }
$('#stSound').onclick = () => { Sound.setOn(!Sound.on); if (Sound.on) Sound.select() }
$('#stJingle').onclick = () => {
  if (Jingle.wanted) Jingle.stop(); else { Jingle.wanted = true; if (Sound.on) Jingle.start() }
  syncSound()
}

/* ---------------------------------------------------------------- zoom transitions */
let busy = false
// ?flip forces the manual FLIP fallback (what browsers without View Transitions get)
const FORCE_FLIP = /[?&]flip\b/.test(location.search)
async function zoom(from, to, update, back) {
  hideBubble(true)
  if (!from) { update(); return }
  if (RM) {
    // calm version: a short crossfade, no scaling
    if (!document.startViewTransition) { update(); return }
    root.classList.add('vt-fade')
    const vt = document.startViewTransition(update)
    const guard = setTimeout(() => vt.skipTransition(), 700)
    try { await vt.finished } catch (e) {} finally { clearTimeout(guard); root.classList.remove('vt-fade') }
    return
  }
  if (document.startViewTransition && !FORCE_FLIP) {
    const a = from, other = to
    a.style.viewTransitionName = 'zoom'
    root.classList.add(back ? 'vt-back' : 'vt-in')
    let ran = false
    const vt = document.startViewTransition(() => { ran = true; a.style.viewTransitionName = ''; update(); other.style.viewTransitionName = 'zoom' })
    // some GPU-less configurations never capture; skipping still runs the update
    const guard = setTimeout(() => { if (!ran) vt.skipTransition() }, 700)
    try { await vt.finished } catch (e) {} finally { clearTimeout(guard); other.style.viewTransitionName = ''; root.classList.remove('vt-back', 'vt-in') }
    return
  }
  // FLIP fallback: animate the overlay between the tile's box and the viewport
  const tileEl = back ? to : from, overlay = back ? from : to
  const r = tileEl.getBoundingClientRect(), W = innerWidth, H = innerHeight
  const small = { transform: `translate(${r.left}px, ${r.top}px) scale(${r.width / W}, ${r.height / H})`, borderRadius: '60px', opacity: 0.4 }
  const big = { transform: 'none', borderRadius: '0px', opacity: 1 }
  if (!back) update()
  overlay.style.transformOrigin = '0 0'
  await overlay.animate(back ? [big, small] : [small, big], { duration: 480, easing: 'cubic-bezier(.2,.85,.25,1)' }).finished.catch(() => {})
  if (back) update()
}

/* ---------------------------------------------------------------- channel */
const channel = $('#channel'), splash = $('#splash'), chView = $('#chView'), chBody = $('#chBody')
const splashS = surface($('#splashCanvas'), () => {})
let cur = null, chState = 'splash', listScroll = 0, extra = [], filterYear = 'all'
let view = 'boot'

function setInert(on) { $('#menu').inert = on }

async function openChannel(ch, opts = {}) {
  if (busy || !ch || ch.empty) return
  busy = true
  const tile = tiles.find((t) => t.__ch === ch)
  cur = ch
  Sound.select(); setTimeout(() => Sound.whoosh(true), 60)
  channel.style.setProperty('--cc', ch.color)
  $('#chTitle').textContent = ch.name
  $('#chSub').textContent = ch.sub
  splashS.draw = ch.r
  $('#splashDesc').textContent = `${ch.name} channel. ${ch.sub}. Choose Start to open it, or Menu to go back.`
  setTitle(ch.name)
  const update = () => {
    setInert(true)
    channel.hidden = false
    splash.hidden = !!opts.skipSplash; chView.hidden = !opts.skipSplash
    chState = 'splash'
    view = 'channel'
    if (opts.skipSplash) showList(true)
    fit(splashS); paint(splashS, T)
  }
  await zoom(opts.instant ? null : tile, channel, update)
  if (!opts.skipSplash) { $('#splashStart').focus({ preventScroll: true }); announce(`${ch.name} channel opened. ${ch.sub}.`) }
  busy = false
  return true
}

async function closeChannel() {
  if (busy || view !== 'channel') return
  busy = true
  Sound.back(); Sound.whoosh(false)
  const tile = tiles.find((t) => t.__ch === cur)
  const page = tile ? [...track.children].indexOf(tile.parentElement) : 0
  if (page !== curPage) goPage(page, false)
  const update = () => {
    channel.hidden = true
    setInert(false)
    clearExtra()
    view = 'menu'
    setHash('')
    setTitle('')
  }
  await zoom(channel, tile, update, true)
  tile?.focus({ preventScroll: true })
  busy = false
}

function startChannel() {
  Sound.select()
  splash.hidden = true
  chView.hidden = false
  showList(true)
}

function clearExtra() { extra.forEach(drop); extra = [] }

function setHash(h) { try { history.replaceState(null, '', h ? '#/' + h : location.pathname + location.search) } catch (e) {} }

const fmtBadge = (date) => {
  const d = parseDate(date)
  if (!d) return '<span class="cal-badge"><b>&nbsp;</b><i>&middot;</i></span>'
  return `<span class="cal-badge"><b>${MONTH_NAMES[d.getMonth()].slice(0, 3)}</b><i>${d.getDate()}</i><s>${d.getFullYear()}</s></span>`
}
const host = (u) => { try { return new URL(abs(u)).host.replace(/^www\./, '') } catch (e) { return '' } }

const LIST = {
  blog() {
    const years = [...new Set(DATA.posts.map((p) => parseDate(p.date)?.getFullYear()).filter(Boolean))]
    const chips = ['all', ...years].map((y) => `<button class="chip${String(y) === String(filterYear) ? ' on' : ''}" aria-pressed="${String(y) === String(filterYear)}" data-nav data-year="${y}">${y === 'all' ? 'All' : y}</button>`).join('')
    const rows = DATA.posts.map((p, i) => [p, i]).filter(([p]) => filterYear === 'all' || parseDate(p.date)?.getFullYear() === +filterYear)
      .map(([p, i]) => `<li><button class="row" data-nav data-art="post:${i}">${fmtBadge(p.date)}<span class="row-main"><span class="row-title">${esc(p.t)}</span><span class="row-desc">${esc(p.d || 'Blog post')}</span></span><span class="chev" aria-hidden="true"></span></button></li>`).join('')
    return { html: `<div class="chips" role="group" aria-label="Filter by year">${chips}</div><ul class="list ul-reset" aria-label="Posts">${rows}</ul>`, mid: `${DATA.posts.length} posts` }
  },
  notes() {
    const html = DATA.notes.map((n, i) => `<li><button class="sticky s${i % 4}" data-nav data-art="note:${i}" style="--rot:${[-2, 1.5, -1, 2.2][i % 4]}deg"><span class="tape" aria-hidden="true"></span><span class="st-title">${esc(n.t)}</span><span class="st-date">${esc(n.date)}</span></button></li>`).join('')
    return { html: `<ul class="stickies ul-reset" aria-label="Notes">${html}</ul>`, mid: `${DATA.notes.length} notes` }
  },
  projects() {
    const html = DATA.projects.map((p, i) => {
      const ini = p.t.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
      return `<li><a class="card" data-nav href="${abs(p.href)}" target="_blank" rel="noopener" style="--h:${(i * 47 + 250) % 360}"><span class="card-ico" aria-hidden="true">${esc(ini)}</span><span class="card-main"><b>${esc(p.t)}</b><span>${esc(p.d)}</span><em>${esc(host(p.href))} &rsaquo;</em></span></a></li>`
    }).join('')
    return { html: `<ul class="cards ul-reset" aria-label="Projects">${html}</ul>`, mid: 'Opens in a new tab' }
  },
  work() {
    const html = DATA.work.map((p) => `<li><a class="row news" data-nav href="${abs(p.href)}" target="_blank" rel="noopener">${fmtBadge(p.date)}<span class="row-main"><span class="row-title">${esc(p.t)}</span><span class="row-desc">${esc(p.d)}</span></span><span class="host">${esc(host(p.href))}</span></a></li>`).join('')
    return { html: `<ul class="list ul-reset" aria-label="Articles">${html}</ul>`, mid: 'Writing on vercel.com' }
  },
  about() {
    const first = ITEMS.filter((x) => x.kind === 'post').at(-1)
    return {
      html: `<div class="about"><div class="about-art"><canvas id="palCanvas" aria-hidden="true"></canvas></div>
      <div class="about-text"><p class="hello">Hi, I'm Max.</p><p class="blurb">${esc(DATA.site.blurb)}</p>
      <ul class="facts ul-reset"><li><b>${DATA.posts.length}</b> <span>posts</span></li><li><b>${DATA.notes.length}</b> <span>notes</span></li><li><b>${parseDate(first.date).getFullYear()}</b> <span>writing since</span></li></ul>
      <div class="btnrow"><a class="pill" data-nav href="${DATA.site.github}" target="_blank" rel="noopener">GitHub</a><a class="pill" data-nav href="${DATA.site.x}" target="_blank" rel="noopener">X / Twitter</a><button class="pill primary" data-nav data-go="blog">Read the blog</button></div></div></div>`,
      mid: 'maxleiter.com',
      after() {
        const s = surface($('#palCanvas'), (c, w, h, t) => {
          c.clearRect(0, 0, w, h)
          const g = c.createRadialGradient(w / 2, h * 0.55, 10, w / 2, h * 0.55, w * 0.6)
          g.addColorStop(0, '#e3f4ff'); g.addColorStop(1, 'rgba(227,244,255,0)')
          c.fillStyle = g; c.fillRect(0, 0, w, h)
          c.fillStyle = 'rgba(40,90,140,.12)'; c.beginPath(); c.ellipse(w / 2, h * 0.93, w * 0.3, h * 0.04, 0, 0, TAU); c.fill()
          pal(c, w / 2, h * 0.92, Math.min(h * 0.4, w * 0.36), t)
        })
        extra.push(s)
      },
    }
  },
  links() {
    const L = [
      ['GitHub', 'Code, dotfiles and half-finished ideas', DATA.site.github, '</>'],
      ['X / Twitter', 'Short posts, mostly about the web', DATA.site.x, '@'],
      ['RSS feed', 'Every post and note, in your reader', SITE + '/feed.xml', 'rss'],
      ['maxleiter.com', 'The real site, no bezels', SITE, 'www'],
    ]
    const html = L.map(([t, d, h, g]) => `<li><a class="link-card" data-nav href="${h}" target="_blank" rel="noopener"><span class="lc-ico${g === 'rss' ? ' rss' : ''}" aria-hidden="true">${g === 'rss' ? '<i></i><i></i><i></i>' : esc(g)}</span><span class="lc-main"><b>${esc(t)}</b><span>${esc(d)}</span></span><span class="chev" aria-hidden="true"></span></a></li>`).join('')
    return { html: `<ul class="link-grid ul-reset" aria-label="Links">${html}</ul>`, mid: 'Opens in a new tab' }
  },
  forecast() {
    const byYear = {}
    ITEMS.forEach((x) => { if (x.when && x.kind !== 'work') byYear[x.when.getFullYear()] = (byYear[x.when.getFullYear()] || 0) + 1 })
    const years = Object.keys(byYear).sort().slice(-6)
    const icon = (n) => (n >= 5 ? 'sun' : n >= 3 ? 'part' : n >= 2 ? 'cloud' : 'drizzle')
    const word = { sun: 'Sunny', part: 'Partly sunny', cloud: 'Cloudy', drizzle: 'Light drizzle' }
    const days = years.map((y) => `<li class="fc-day"><span class="fc-y">${y}</span><span class="wx ${icon(byYear[y])}" aria-hidden="true"><i></i><i></i></span><b>${byYear[y]}</b><span class="fc-w">${word[icon(byYear[y])]}</span></li>`).join('')
    const stats = [['350', 'ms', 'full build'], ['78', '', 'routes'], ['4', '', 'islands'], ['~1', 'KB', 'JS per article'], ['17', 'KB', 'homepage JS'], ['0', '', 'servers']]
      .map(([v, u, l]) => `<li class="stat"><b>${v}<small>${u}</small></b><span>${l}</span></li>`).join('')
    return {
      html: `<div class="fc"><div class="fc-now"><canvas id="fcCanvas" aria-hidden="true"></canvas></div><ul class="stats ul-reset" aria-label="Build stats">${stats}</ul></div>
      <h2 class="sec">Writing outlook <span>posts and notes per year</span></h2><ul class="fc-days ul-reset" aria-label="Posts and notes per year">${days}</ul>
      <p class="fine">Figures are from the real site's architecture notes: a bespoke static generator, every route rendered to a file at build time.</p>`,
      mid: 'Conditions as of the last build',
      after() { extra.push(surface($('#fcCanvas'), R.forecast)) },
    }
  },
  jukebox() {
    return {
      html: `<div class="jb"><div class="jb-screen"><canvas id="rollCanvas" role="img" aria-label="Piano roll of the eight-bar loop: melody notes over the chord names listed below"></canvas></div>
      <div class="btnrow center"><button class="pill primary" data-nav id="jbPlay">${Jingle.playing ? 'Stop' : 'Play'}</button><button class="pill" data-nav id="jbRemix">Remix</button><button class="pill" data-nav id="jbHouse">House tune</button></div>
      <p class="jb-info" id="jbInfo"></p>
      <p class="fine">Nothing here is a recording. An FM electric piano, a mallet lead, a triangle bass and brushed noise are synthesized live with WebAudio over eight fixed chords. The melody grows from a seed, and bars five and six repeat the rhythm of one and two so it sounds like a tune rather than dice.</p></div>`,
      mid: 'Sound starts muted until you press Play',
      after() {
        const info = () => ($('#jbInfo').innerHTML = `Seed <b>${Jingle.seed}</b> &middot; 94 bpm swing &middot; ${Jingle.CHORDS.map((c) => c[2]).join(' &rarr; ')}`)
        info()
        $('#jbPlay').onclick = () => {
          if (Jingle.playing) Jingle.stop()
          else { if (!Sound.on) Sound.setOn(true); Jingle.wanted = true; Jingle.start() }
          syncSound()
        }
        $('#jbRemix').onclick = () => { Jingle.remix(); info(); Sound.tick() }
        $('#jbHouse').onclick = () => { Jingle.reset(); info(); Sound.tick() }
        extra.push(surface($('#rollCanvas'), drawRoll))
      },
    }
  },
}

function drawRoll(c, w, h, t) {
  c.fillStyle = vgrad(c, h, '#2a2533', '#1a1720'); c.fillRect(0, 0, w, h)
  const pad = 14, gw = w - pad * 2, gh = h - pad * 2 - 18, lo = 69, hi = 87
  const bar = gw / 8, sl = bar / 8
  for (let b = 0; b < 8; b++) {
    c.fillStyle = b % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'
    c.fillRect(pad + b * bar, pad, bar, gh)
    font(c, 11, 800); c.fillStyle = 'rgba(255,190,225,.65)'; c.textAlign = 'left'; c.textBaseline = 'top'
    c.fillText(Jingle.CHORDS[b][2], pad + b * bar + 6, pad + gh + 5)
  }
  c.strokeStyle = 'rgba(255,255,255,.05)'
  for (let m = lo; m <= hi; m++) { const y = pad + gh - ((m - lo) / (hi - lo)) * gh; c.beginPath(); c.moveTo(pad, y); c.lineTo(pad + gw, y); c.stroke() }
  const pos = Jingle.position()
  for (const n of Jingle.notes) {
    const x = pad + n.bar * bar + n.at * sl, nw = n.len * sl - 3
    const y = pad + gh - ((n.midi - lo) / (hi - lo)) * gh
    const startBars = n.bar + n.at / 8, active = pos >= startBars && pos < startBars + n.len / 8
    c.save()
    if (active) { c.shadowColor = '#ff79c0'; c.shadowBlur = 16 }
    rr(c, x + 1, y - 5, nw, 10, 5)
    c.fillStyle = active ? '#ffd1ea' : '#ff5fa8'; c.fill(); c.restore()
  }
  if (pos >= 0) {
    const x = pad + (pos / 8) * gw
    c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(x - 1, pad, 2, gh)
  }
}

function showList(fresh) {
  const L = LIST[cur.id]()
  clearExtra()
  chBody.innerHTML = `<div class="ch-inner ch-${cur.id}">${L.html}</div>`
  $('#chFootMid').textContent = L.mid || ''
  chState = 'list'
  L.after?.()
  chBody.scrollTop = fresh ? 0 : listScroll
  setHash(cur.id)
  setTitle(cur.name)
  const first = chBody.querySelector('[data-art], .card, .link-card, .row, #jbPlay, .about .pill')
  if (fresh) (first || chBody).focus({ preventScroll: true })
}

function articleHTML(item, kind) {
  const label = kind === 'note' ? 'Note' : 'Blog post'
  return `<article class="article"><div class="art-meta"><span class="tag ${kind}">${label}</span><span>${esc(item.date)}</span></div>
    <h2 class="art-title" tabindex="-1">${esc(item.t)}</h2>${item.d ? `<p class="art-desc">${esc(item.d)}</p>` : ''}
    <div class="prose">${md(item.ex, item.ex.length >= 1190)}</div>
    <div class="art-cta"><a class="pill primary" href="${abs(item.href)}" target="_blank" rel="noopener">Read it all on maxleiter.com</a></div></article>`
}

let articleOpener = null
function openArticle(kind, i, fromList = true) {
  articleOpener = kind + ':' + i
  const item = (kind === 'note' ? DATA.notes : DATA.posts)[i]
  if (!item) return
  if (fromList) listScroll = chBody.scrollTop
  Sound.select()
  clearExtra()
  chBody.innerHTML = `<div class="ch-inner">${articleHTML(item, kind)}</div>`
  chBody.scrollTop = 0
  $('#chFootMid').textContent = `Reading · ${item.date}`
  chState = 'article'
  setHash(`${cur.id}/${slugOf(item.href)}`)
  setTitle(item.t)
  chBody.querySelector('.art-title').focus({ preventScroll: true })
}

chBody.addEventListener('click', (e) => {
  const a = e.target.closest('[data-art]')
  if (a) { const [k, i] = a.dataset.art.split(':'); return openArticle(k, +i) }
  const y = e.target.closest('[data-year]')
  if (y) { filterYear = y.dataset.year; Sound.tick(); showList(false); chBody.querySelector(`[data-year="${filterYear}"]`)?.focus(); return }
  const g = e.target.closest('[data-go]')
  if (g) { const id = g.dataset.go; cur = byId[id]; channel.style.setProperty('--cc', cur.color); $('#chTitle').textContent = cur.name; $('#chSub').textContent = cur.sub; Sound.whoosh(true); showList(true) }
})
chBody.addEventListener('pointerover', (e) => { const n = e.target.closest('[data-nav]'); if (n && n !== chBody.__last) { chBody.__last = n; Sound.tick() } })

$('#splashStart').onclick = startChannel
$('#splashMenu').onclick = closeChannel
$('#chMenu').onclick = closeChannel
$('#chBack').onclick = () => back()

/* ---------------------------------------------------------------- message board */
const board = $('#board')
const MONTHLY = new Map()
for (const it of ITEMS) {
  if (!it.when) continue
  const k = it.when.getFullYear() + '-' + it.when.getMonth()
  if (!MONTHLY.has(k)) MONTHLY.set(k, [])
  MONTHLY.get(k).push(it)
}
const MKEYS = [...MONTHLY.keys()].sort((a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return y1 - y2 || m1 - m2 })
let bdKey = MKEYS.at(-1), bdSel = null

function renderBoard(focusDay) {
  const [Y, M] = bdKey.split('-').map(Number)
  const items = MONTHLY.get(bdKey) || []
  $('#bdMonth').textContent = `${MONTH_NAMES[M]} ${Y}`
  const first = new Date(Y, M, 1).getDay(), days = new Date(Y, M + 1, 0).getDate()
  const prevDays = new Date(Y, M, 0).getDate()
  const today = new Date()
  let html = DAY_NAMES.map((d, i) => `<div class="cal-h${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}" aria-hidden="true">${d}</div>`).join('')
  for (let i = 0; i < 42; i++) {
    const day = i - first + 1
    if (day < 1 || day > days) {
      if (i >= 35 && day > days && (first + days) <= 35) continue
      html += `<div class="cell out" aria-hidden="true"><span class="dn">${day < 1 ? prevDays + day : day - days}</span></div>`
      continue
    }
    const its = items.filter((x) => x.when.getDate() === day)
    const isToday = today.getFullYear() === Y && today.getMonth() === M && today.getDate() === day
    const icons = its.slice(0, 3).map((x) => `<i class="env ${x.kind}"></i>`).join('') + (its.length > 3 ? `<em>+${its.length - 3}</em>` : '')
    const lbl = `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i % 7]}, ${MONTH_NAMES[M]} ${day}: ${its.length ? its.length + (its.length === 1 ? ' message: ' : ' messages: ') + its.map((x) => x.t).join('; ') : 'no messages'}`
    html += `<button class="cell${its.length ? ' has' : ''}${isToday ? ' today' : ''}${bdSel === day ? ' sel' : ''}${(i % 7 === 0) ? ' sun' : (i % 7 === 6) ? ' sat' : ''}" data-day="${day}" aria-pressed="${bdSel === day}"${isToday ? ' aria-current="date"' : ''} tabindex="${(bdSel || (its.length ? day : 0)) === day ? 0 : -1}" aria-label="${esc(lbl)}"><span class="dn" aria-hidden="true">${day}</span><span class="envs" aria-hidden="true">${icons}</span>${its.length ? `<span class="peek" aria-hidden="true">${esc(its[0].t)}</span>` : ''}</button>`
  }
  $('#cal').innerHTML = html
  if (!$('#cal [tabindex="0"]')) $('#cal .cell[data-day]')?.setAttribute('tabindex', '0')
  // side panel
  const list = bdSel ? items.filter((x) => x.when.getDate() === bdSel) : items
  const head = bdSel ? `${MONTH_NAMES[M]} ${bdSel}` : `All of ${MONTH_NAMES[M]}`
  $('#bdDay').innerHTML = `<h2>${head}<span>${list.length} ${list.length === 1 ? 'message' : 'messages'}</span></h2>` + (list.length ? '<ul>' + list.map((x) => {
    const idx = x.kind === 'post' ? DATA.posts.findIndex((p) => p.href === x.href) : x.kind === 'note' ? DATA.notes.findIndex((p) => p.href === x.href) : -1
    const inner = `<i class="env ${x.kind}" aria-hidden="true"></i><span><b>${esc(x.t)}</b><small>${x.kind === 'post' ? 'Blog post' : x.kind === 'note' ? 'Note' : 'Work · ' + esc(host(x.href))} &middot; ${esc(x.date)}</small></span>`
    return `<li>${x.kind === 'work' ? `<a class="msg" href="${abs(x.href)}" target="_blank" rel="noopener">${inner}</a>` : `<button class="msg" data-letter="${x.kind}:${idx}">${inner}</button>`}</li>`
  }).join('') + '</ul>' : '<p class="empty-day">No messages on this day. Pick a day with an envelope.</p>')
  // year strip
  const y0 = +MKEYS[0].split('-')[0], y1 = Math.max(+MKEYS.at(-1).split('-')[0], today.getFullYear())
  let strip = ''
  for (let y = y0; y <= y1; y++) {
    // one 44px button per year; the month pips inside are a picture of activity
    const keys = MKEYS.filter((k) => +k.split('-')[0] === y)
    const total = keys.reduce((a, k) => a + MONTHLY.get(k).length, 0)
    const target = keys.includes(bdKey) ? bdKey : keys.at(-1)
    let pips = ''
    for (let m = 0; m < 12; m++) {
      const k = y + '-' + m, n = (MONTHLY.get(k) || []).length
      pips += `<i class="pip${n ? ' has' : ''}${k === bdKey ? ' cur' : ''}" style="--n:${Math.min(n, 4)}"></i>`
    }
    strip += `<button class="yr" ${target ? `data-key="${target}"` : 'disabled'} aria-current="${+Y === y}" aria-label="${y}: ${total} ${total === 1 ? 'message' : 'messages'}"><span aria-hidden="true">${y}</span><span class="pips" aria-hidden="true">${pips}</span></button>`
  }
  $('#bdStrip').innerHTML = strip
  const sp = $('#bdStrip'), cp = sp.querySelector('.cur')
  if (cp && sp.scrollWidth > sp.clientWidth) sp.scrollLeft = cp.offsetLeft - sp.clientWidth / 2
  const ki = MKEYS.indexOf(bdKey)
  $('#bdPrev').disabled = ki <= 0
  $('#bdNext').disabled = ki >= MKEYS.length - 1
  if (focusDay) $(`#cal [data-day="${focusDay}"]`)?.focus()
}

function bdMonth(delta) {
  const i = MKEYS.indexOf(bdKey) + delta
  if (i < 0 || i >= MKEYS.length) return
  const hadFocus = $('#cal').contains(document.activeElement) || document.activeElement === document.body
  bdKey = MKEYS[i]; bdSel = null; Sound.tick(); renderBoard()
  if (hadFocus) $('#cal [tabindex="0"]')?.focus()
  const [y, m] = bdKey.split('-').map(Number), n = (MONTHLY.get(bdKey) || []).length
  announce(`${MONTH_NAMES[m]} ${y}, ${n} ${n === 1 ? 'message' : 'messages'}`)
}
$('#bdPrev').onclick = () => bdMonth(-1)
$('#bdNext').onclick = () => bdMonth(1)
$('#cal').addEventListener('click', (e) => {
  const c = e.target.closest('[data-day]'); if (!c) return
  const d = +c.dataset.day
  bdSel = bdSel === d ? null : d; Sound.bloop(d % 7); renderBoard(d)
  if (bdSel && (MONTHLY.get(bdKey) || []).filter((x) => x.when.getDate() === d).length === 1 && e.detail > 1) $('#bdDay .msg')?.click()
})
$('#cal').addEventListener('keydown', (e) => {
  const c = e.target.closest('[data-day]'); if (!c) return
  const d = +c.dataset.day, [Y, M] = bdKey.split('-').map(Number), days = new Date(Y, M + 1, 0).getDate()
  const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
  if (delta) {
    e.preventDefault(); e.stopPropagation()
    const n = d + delta
    if (n >= 1 && n <= days) { $$('#cal [data-day]').forEach((x) => x.tabIndex = -1); const el = $(`#cal [data-day="${n}"]`); el.tabIndex = 0; el.focus(); Sound.tick() }
    else if (delta === 7 || delta === 1) $('#bdDay .msg')?.focus()
  }
  if (e.key === 'PageUp') { e.preventDefault(); bdMonth(-1) }
  if (e.key === 'PageDown') { e.preventDefault(); bdMonth(1) }
})
$('#bdStrip').addEventListener('click', (e) => {
  const p = e.target.closest('[data-key]'); if (!p) return
  bdKey = p.dataset.key; bdSel = null; Sound.tick(); renderBoard()
  $(`#bdStrip [data-key="${bdKey}"]`)?.focus()
  const [y, m] = bdKey.split('-').map(Number); announce(`${MONTH_NAMES[m]} ${y}`)
})
$('#bdDay').addEventListener('click', (e) => {
  const b = e.target.closest('[data-letter]'); if (!b) return
  const [k, i] = b.dataset.letter.split(':')
  openLetter(k, +i)
})

let letterOpener = null
const boardParts = () => [...board.children].filter((c) => c.id !== 'letterWrap')
function openLetter(kind, i) {
  const item = (kind === 'note' ? DATA.notes : DATA.posts)[i]
  if (!item) return
  letterOpener = document.activeElement
  boardParts().forEach((c) => (c.inert = true))
  setTitle(item.t)
  Sound.select()
  $('#letter').innerHTML = `<div class="letter-top"><span class="stamp ${kind}" aria-hidden="true"></span><span>From <b>Max Leiter</b> &middot; ${esc(item.date)}</span><button class="x" id="letterClose" aria-label="Close letter">&times;</button></div>` + articleHTML(item, kind)
  $('#letterWrap').hidden = false
  $('#letterClose').onclick = closeLetter
  $('#letter').focus({ preventScroll: true })
  $('#letter').scrollTop = 0
}
function closeLetter() {
  $('#letterWrap').hidden = true; boardParts().forEach((c) => (c.inert = false)); Sound.back(); setTitle('Message Board')
  ;(letterOpener && document.contains(letterOpener) ? letterOpener : $('#bdDay .msg'))?.focus()
}
$('#letterWrap').addEventListener('click', (e) => { if (e.target.id === 'letterWrap') closeLetter() })

async function openBoard(instant) {
  if (busy) return
  busy = true
  Sound.select(); setTimeout(() => Sound.whoosh(true), 60)
  bdSel = +(MONTHLY.get(bdKey) || [])[0]?.when.getDate() || null
  renderBoard()
  setTitle('Message Board')
  await zoom(instant ? null : $('#orbMail'), board, () => { setInert(true); board.hidden = false; view = 'board'; setHash('board') })
  announce('Message board. ' + $('#bdMonth').textContent)
  $(`#cal [tabindex="0"]`)?.focus({ preventScroll: true })
  busy = false
}
async function closeBoard() {
  if (busy) return
  busy = true
  Sound.back(); Sound.whoosh(false)
  await zoom(board, $('#orbMail'), () => { board.hidden = true; $('#letterWrap').hidden = true; boardParts().forEach((c) => (c.inert = false)); setInert(false); view = 'menu'; setHash(''); setTitle('') }, true)
  $('#orbMail').focus({ preventScroll: true })
  busy = false
}
$('#orbMail').onclick = () => openBoard()
$('#bdBack').onclick = () => back()
$('#bdMenu').onclick = closeBoard

/* ---------------------------------------------------------------- settings */
const settings = $('#settings')
let settingsReturn = null
function openSettings() {
  settingsReturn = document.activeElement
  Sound.select(); settings.hidden = false; syncSound()
  for (const el of [$('#menu'), channel, board]) el.inert = true
  $('#stTiltRow').hidden = !('DeviceOrientationEvent' in window) || !COARSE
  $('#stSound').focus()
}
function closeSettings() {
  settings.hidden = true; Sound.back()
  $('#menu').inert = view !== 'menu'; channel.inert = false; board.inert = false
  settingsReturn?.focus?.()
}
$('#stMotion').onclick = () => { motionChoice = !RM; setRM(motionChoice); toast(RM ? 'Reduced motion on.' : 'Full motion on.') }
$('#orbMenu').onclick = openSettings
$('#stClose').onclick = closeSettings
$('#stIntro').onclick = () => { closeSettings(); showBoot() }
settings.addEventListener('click', (e) => { if (e.target === settings) closeSettings() })

/* ---------------------------------------------------------------- back / esc */
function back() {
  if (view === 'boot') return dismissBoot()
  if (!settings.hidden) return closeSettings()
  if (view === 'board') { if (!$('#letterWrap').hidden) return closeLetter(); return closeBoard() }
  if (view === 'channel') {
    if (chState === 'article') { Sound.back(); showList(false); chBody.querySelector(`[data-art="${articleOpener}"]`)?.focus({ preventScroll: true }); return }
    return closeChannel()
  }
}

/* ---------------------------------------------------------------- spatial navigation */
function visibleFocusables(scope) {
  return $$('button:not([disabled]), a[href], [data-nav]', scope).filter((el) => {
    if (el.closest('[hidden]') || el.tabIndex < 0 && !el.matches('[data-day]')) return false
    const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0
  })
}
function spatial(dir, cands, from) {
  const fr = from.getBoundingClientRect(), fx = fr.left + fr.width / 2, fy = fr.top + fr.height / 2
  let best = null, bs = Infinity
  for (const el of cands) {
    if (el === from) continue
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2
    const dx = cx - fx, dy = cy - fy
    const p = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy
    if (p <= 4) continue
    const s = p + (dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx)) * 2.4
    if (s < bs) { bs = s; best = el }
  }
  return best
}
function nav(dir, via = 'key') {
  if (view === 'menu') {
    const live = tiles.filter((t) => !t.__ch.empty && [...track.children].indexOf(t.parentElement) === curPage || t === document.activeElement)
    const all = tiles.filter((t) => !t.__ch.empty)
    const dockBtns = $$('#dock button').filter((b) => !b.hidden)
    const ae = document.activeElement
    if (dockBtns.includes(ae)) {
      const next = dir === 'up' ? spatial('up', live, ae) || live[0] : dir === 'down' ? null : spatial(dir, dockBtns, ae)
      if (next) { next.focus({ preventScroll: true }); Sound.tick(); announce(next.getAttribute('aria-label') || next.textContent.trim()) }
      return
    }
    const from = ae?.classList?.contains('tile') ? ae : null
    let next
    if (!from) next = hot && !hot.__ch.empty ? hot : live[0] || all[0]
    else next = spatial(dir, all, from)
    if (!next && from && dir === 'down') { const d = spatial('down', dockBtns, from); if (d) { d.focus({ preventScroll: true }); Sound.tick(); return } }
    if (next) {
      const pg = [...track.children].indexOf(next.parentElement)
      if (pg >= 0 && pg !== curPage) goPage(pg)
      next.focus({ preventScroll: true })
      if (via === 'pad') setHot(next, 'pad')
      announce(`${next.__ch.name} channel`)
    } else if (from && pageCount > 1 && (dir === 'left' || dir === 'right')) goPage(curPage + (dir === 'right' ? 1 : -1))
    return
  }
  const scope = !settings.hidden ? settings : view === 'board' ? (!$('#letterWrap').hidden ? $('#letterWrap') : board) : view === 'channel' ? channel : null
  if (!scope) return
  if (view === 'channel' && chState === 'article' && (dir === 'up' || dir === 'down')) { chBody.scrollBy({ top: dir === 'down' ? 120 : -120, behavior: RM ? 'auto' : 'smooth' }); return }
  const from = scope.contains(document.activeElement) && document.activeElement !== chBody ? document.activeElement : null
  const cands = visibleFocusables(scope)
  const next = from ? spatial(dir, cands, from) : cands[0]
  if (next) {
    next.focus({ preventScroll: true }); next.scrollIntoView({ block: 'nearest', behavior: RM ? 'auto' : 'smooth' }); Sound.tick()
    announce((next.getAttribute('aria-label') || next.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120))
  }
}

/* Tab stays inside whichever modal layer is on top */
function topModal() {
  if (!settings.hidden) return $('#settingsDlg')
  if (view === 'boot') return boot
  if (view === 'board') return $('#letterWrap').hidden ? board : $('#letterWrap')
  if (view === 'channel') return channel
  return null
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return
  const m = topModal(); if (!m) return
  const f = visibleFocusables(m).filter((el) => el.tabIndex >= 0)
  if (!f.length) { e.preventDefault(); m.focus?.(); return }
  const i = f.indexOf(document.activeElement)
  if (i === -1 || (e.shiftKey && i === 0) || (!e.shiftKey && i === f.length - 1)) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus() }
}, true)
document.addEventListener('keydown', (e) => {
  if (hand.on && e.key !== 'Shift') { hand.on = false; root.classList.remove('hand-on') }
  if (view === 'boot') { if (!e.metaKey && !e.ctrlKey && e.key !== 'Tab') { e.preventDefault(); dismissBoot(true) } return }
  const inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)
  if (e.key === 'Escape' || (e.key === 'Backspace' && !inField)) { e.preventDefault(); back(); return }
  const dir = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key]
  if (dir && !inField) {
    if (view === 'channel' && chState === 'article') return
    e.preventDefault(); nav(dir)
  }
})

/* ---------------------------------------------------------------- the hand */
const handEl = $('#hand')
const hand = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, tx: innerWidth / 2, ty: innerHeight / 2, rot: -6, down: false, on: false }
if (FINE) {
  root.classList.add('hand-ok')
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return
    hand.tx = e.clientX; hand.ty = e.clientY
    if (!hand.on) { hand.on = true; hand.x = hand.tx; hand.y = hand.ty; root.classList.add('hand-on') }
  }, { passive: true })
  addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') hand.down = true })
  addEventListener('pointerup', () => (hand.down = false))
  document.addEventListener('pointerleave', () => { hand.on = false; root.classList.remove('hand-on') })
  document.documentElement.addEventListener('mouseleave', () => { hand.on = false; root.classList.remove('hand-on') })
}
function updateHand(dt) {
  if (!hand.on) return
  if (RM) { hand.x = hand.tx; hand.y = hand.ty; hand.vx = hand.vy = 0 }
  else {
    // a lightly under-damped spring: smooths the jumps, keeps the lag ~50 ms
    const Kk = 900, D = 2 * Math.sqrt(Kk) * 0.82, n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n
    for (let i = 0; i < n; i++) {
      hand.vx += ((hand.tx - hand.x) * Kk - hand.vx * D) * h
      hand.vy += ((hand.ty - hand.y) * Kk - hand.vy * D) * h
      hand.x += hand.vx * h; hand.y += hand.vy * h
    }
  }
  const jx = RM ? 0 : Math.sin(T * 11.3) * 0.45 + Math.sin(T * 17.9 + 1.3) * 0.3 + Math.sin(T * 5.1 + 0.4) * 0.35
  const jy = RM ? 0 : Math.sin(T * 9.7 + 2) * 0.45 + Math.sin(T * 19.3) * 0.25 + Math.sin(T * 4.3 + 1) * 0.35
  const target = RM ? -6 : clamp(-6 + hand.vx * 0.012, -24, 14)
  hand.rot += (target - hand.rot) * Math.min(1, dt * 9)
  handEl.style.transform = `translate3d(${(hand.x + jx - 15).toFixed(2)}px, ${(hand.y + jy - 2).toFixed(2)}px, 0) rotate(${hand.rot.toFixed(2)}deg) scale(${hand.down ? 0.9 : 1})`
}

/* ---------------------------------------------------------------- tilt */
const tilt = { on: false, x: 0, y: 0, tx: 0, ty: 0 }
function onOrient(e) {
  if (e.gamma == null) return
  tilt.tx = clamp(e.gamma / 25, -1, 1)
  tilt.ty = clamp((e.beta - 45) / 25, -1, 1)
}
async function enableTilt() {
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const r = await DeviceOrientationEvent.requestPermission()
      if (r !== 'granted') { toast('Tilt permission was declined.'); return false }
    }
    addEventListener('deviceorientation', onOrient)
    tilt.on = true; toast('Tilt on. Lean your phone.')
    return true
  } catch (e) { toast('Tilt is not available here.'); return false }
}
function disableTilt() { removeEventListener('deviceorientation', onOrient); tilt.on = false; tilt.tx = tilt.ty = 0 }
function syncTilt() { $('#tiltBtn').setAttribute('aria-pressed', tilt.on); $('#tiltBtn').classList.toggle('on', tilt.on); $('#stTilt').setAttribute('aria-checked', tilt.on) }
const toggleTilt = async () => { if (tilt.on) disableTilt(); else await enableTilt(); syncTilt() }
$('#tiltBtn').onclick = toggleTilt
$('#stTilt').onclick = toggleTilt
if (COARSE && 'DeviceOrientationEvent' in window) $('#tiltBtn').hidden = false
function updateTilt(dt) {
  if (!tilt.on && Math.abs(tilt.x) < 0.001 && Math.abs(tilt.y) < 0.001) return
  const a = Math.min(1, dt * 6)
  tilt.x += (tilt.tx - tilt.x) * a; tilt.y += (tilt.ty - tilt.y) * a
  if (RM) return
  root.style.setProperty('--px', tilt.x.toFixed(3)); root.style.setProperty('--py', tilt.y.toFixed(3))
}

/* ---------------------------------------------------------------- gamepad */
const pad = { dir: null, rep: 0, prev: [], active: null }
addEventListener('gamepadconnected', (e) => { pad.active = e.gamepad.index; toast('Controller connected: stick to move, bottom button to open, right button to go back.', 4200) })
addEventListener('gamepaddisconnected', () => { pad.active = null })
function padRumble(m) {
  const g = pad.active != null && navigator.getGamepads?.()[pad.active]
  g?.vibrationActuator?.playEffect?.('dual-rumble', { duration: 45, strongMagnitude: 0, weakMagnitude: m }).catch?.(() => {})
}
function pollPad(dt) {
  if (pad.active == null || !navigator.getGamepads) return
  const g = navigator.getGamepads()[pad.active]
  if (!g) return
  const b = (i) => !!g.buttons[i]?.pressed
  const ax = g.axes[0] || 0, ay = g.axes[1] || 0
  let dir = b(14) || ax < -0.55 ? 'left' : b(15) || ax > 0.55 ? 'right' : b(12) || ay < -0.55 ? 'up' : b(13) || ay > 0.55 ? 'down' : null
  if (view === 'boot') { if (g.buttons.some((x) => x.pressed)) dismissBoot(true); return }
  if (dir) {
    pad.rep -= dt
    if (dir !== pad.dir) { nav(dir, 'pad'); pad.rep = 0.38 } else if (pad.rep <= 0) { nav(dir, 'pad'); pad.rep = 0.13 }
  }
  pad.dir = dir
  const edge = (i) => b(i) && !pad.prev[i]
  if (edge(0)) { const el = document.activeElement; if (el && el !== document.body) el.click() }
  if (edge(1)) back()
  if (edge(9)) settings.hidden ? openSettings() : closeSettings()
  if (edge(4) && view === 'menu') goPage(curPage - 1)
  if (edge(5) && view === 'menu') goPage(curPage + 1)
  // right stick nudges the hand, like waving a remote
  const rx = g.axes[2] || 0, ry = g.axes[3] || 0
  if (Math.abs(rx) > 0.2 || Math.abs(ry) > 0.2) {
    if (!hand.on) { hand.on = true; root.classList.add('hand-on') }
    hand.tx = clamp(hand.tx + rx * 900 * dt, 0, innerWidth); hand.ty = clamp(hand.ty + ry * 900 * dt, 0, innerHeight)
    const el = document.elementFromPoint(hand.tx, hand.ty)?.closest('.tile:not(.empty)')
    if (el && view === 'menu' && document.activeElement !== el) el.focus({ preventScroll: true })
  }
  pad.prev = g.buttons.map((x) => x.pressed)
}

/* ---------------------------------------------------------------- boot */
const boot = $('#boot')
function showBoot() {
  view = 'boot'; boot.hidden = false; boot.classList.remove('out'); setInert(true)
  requestAnimationFrame(() => boot.focus({ preventScroll: true }))
}
let bootDone = false
function dismissBoot(viaKey) {
  if (view !== 'boot' || bootDone) return
  bootDone = true
  Sound.tick()
  boot.classList.add('out')
  setTimeout(() => {
    boot.hidden = true; bootDone = false
    view = 'menu'; setInert(false)
    const m = $('#menu'); m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter')
    if (viaKey) tiles[0].focus({ preventScroll: true })
  }, RM ? 0 : 520)
}
boot.addEventListener('pointerup', () => dismissBoot(false))

/* ---------------------------------------------------------------- main loop */
let T = 0, last = performance.now(), frameN = 0
tiles.forEach((t, i) => { t.__s = surface(t.querySelector('canvas'), t.__ch.empty ? R.empty : t.__ch.r, { cull: true, off: i * 1.37, st: { phase: i * 0.31 } }) })
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; T += dt; frameN++
  pollPad(dt)
  updateHand(dt)
  updateTilt(dt)
  const t = RM ? 3.1 : T
  if (view === 'menu' || view === 'boot') {
    for (const tl of tiles) {
      const s = tl.__s
      if (!s.visible) continue
      if (RM && !s.dirty) continue
      if (tl.__ch.empty && frameN % 2 && !s.dirty) continue
      paint(s, t)
    }
  }
  if (view === 'channel') {
    if (!splash.hidden && (!RM || splashS.dirty)) paint(splashS, t)
    for (const s of extra) if (!RM || s.dirty || s.canvas.id === 'rollCanvas') paint(s, t)
  }
  requestAnimationFrame(frame)
}

/* ---------------------------------------------------------------- start */
addEventListener('resize', () => { layout(); if (hot && view === 'menu') showBubble(hot) })
layout()
document.fonts?.ready.then(() => { wrapCache.clear(); surfaces.forEach((s) => (s.dirty = true)) })
const newest = ITEMS[0]?.when
if (newest && Date.now() - newest < 1000 * 60 * 60 * 24 * 30) $('#orbMail').classList.add('new')

async function route() {
  const h = location.hash.replace(/^#\/?/, '')
  if (!h) return showBoot()
  boot.hidden = true; view = 'menu'; setInert(false)
  const [a, b] = h.split('/')
  if (a === 'board') return openBoard(true)
  const ch = byId[a]
  if (!ch || ch.empty) return
  await openChannel(ch, { instant: true, skipSplash: !!b || h.endsWith('list') })
  if (b && b !== 'list') {
    const pi = DATA.posts.findIndex((p) => slugOf(p.href) === b)
    const ni = DATA.notes.findIndex((p) => slugOf(p.href) === b)
    if (pi >= 0) openArticle('post', pi); else if (ni >= 0) openArticle('note', ni)
  }
}
setRM(RM)
$('#skip').addEventListener('click', (e) => {
  e.preventDefault()
  const scope = !settings.hidden ? settings : view === 'board' ? board : view === 'channel' ? (chView.hidden ? splash : chBody) : view === 'boot' ? boot : track
  const t = scope.querySelector('button:not([disabled]):not([tabindex="-1"]), a[href], [tabindex="0"]') || scope
  t.focus()
})
root.classList.add('app-ready')
route()
syncSound()
requestAnimationFrame(frame)
