// ---------------------------------------------------------------------------
// App: content model, screens, navigation and input.
// ---------------------------------------------------------------------------
;(() => {
  const Q = new URLSearchParams(location.search)
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  const pad2 = (n) => String(n).padStart(2, '0')
  const DATA = JSON.parse(document.getElementById('content').textContent)
  // some excerpts carry MDX-escaped backticks (\`); normalise before parsing
  for (const x of [...DATA.posts, ...DATA.notes]) x.excerpt = x.excerpt.replace(/\\`/g, '`')
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const parseDate = (s) => { const m = String(s).match(/([A-Za-z]+)\.?\s+(\d+),\s*(\d{4})/); return m ? new Date(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()] ?? 0, +m[2]) : new Date(0) }
  const fullUrl = (h) => (/^https?:/.test(h) ? h : 'https://maxleiter.com' + (h.startsWith('/') ? h : '/' + h))
  const DAY = 86400000

  // ---------------- content model ----------------
  const SITE = DATA.site
  const plain = (md) => md.replace(/```[\s\S]*?(```|$)/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`*_~>#]/g, '').replace(/\s+/g, ' ').trim()
  const words = (s) => (s.match(/\S+/g) || []).length
  const TIERS = ['Cadet', 'Regular', 'Veteran', 'Ironclad']
  const posts = DATA.posts.map((p) => ({ ...p, d: parseDate(p.date) })).sort((a, b) => a.d - b.d)
  posts.forEach((p, i) => {
    p.num = i + 1
    // content.json carries 1200-char excerpts only, so the real word count is unknown here.
    // A seeded estimate stands in; the real build would count the MDX body.
    p.mins = 3 + (Art.hashStr(p.slug) % 14)
    p.tier = p.mins < 6 ? 0 : p.mins < 10 ? 1 : p.mins < 14 ? 2 : 3
    p.intel = p.description || plain(p.excerpt).split(/(?<=[.!?])\s/)[0]
    p.prev = i > 0 ? Math.round((p.d - posts[i - 1].d) / DAY) : null
  })
  const missions = posts.slice().reverse()
  const notes = DATA.notes.map((n) => {
    const text = n.excerpt.replace(/```[\s\S]*?(```|$)/g, (m) => m.replace(/```\w*/g, '').trim()).replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_~#>]/g, '').replace(/`/g, '').replace(/[ \t]+\n/g, '\n').replace(/([^\n])\n(?!\n|\d+\.\s|[-*]\s)/g, '$1 ').replace(/\n{3,}/g, '\n\n').trim()
    const secs = Math.max(12, Math.round(words(text) / 2.6))
    return { ...n, d: parseDate(n.date), text, secs }
  })
  const entries = DATA.projectsAndExternal.filter((x) => x.href)
  const work = entries.filter((x) => x.date).map((x) => ({ ...x, d: parseDate(x.date) }))
  const CAT = { KnightOS: 'systems', 'MSHW0184 driver for Linux kernel': 'systems', 'X11 on iOS': 'systems', v0: 'ai', 'AI SDK': 'ai' }
  const CAT_NAME = { ai: 'Artificial intelligence', systems: 'Systems & kernels', web: 'Web & tooling', research: 'Research' }
  const projects = entries.filter((x) => !x.date).map((x) => ({ ...x, cat: CAT[x.title] || (/glaucoma|accuracy/i.test(x.title) ? 'research' : 'web') }))
  const catOrder = ['ai', 'systems', 'web', 'research']
  projects.sort((a, b) => catOrder.indexOf(a.cat) - catOrder.indexOf(b.cat))
  const fmtMonth = (d) => MON[d.getMonth()] + ' ' + d.getFullYear()
  const fmtDate = (d) => MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()
  const fmtTime = (s) => pad2(Math.floor(s / 60)) + ':' + pad2(Math.floor(s % 60))

  // ---------------- service record (computed) ----------------
  const SR = (() => {
    const byYear = {}
    posts.forEach((p) => { const y = p.d.getFullYear(); byYear[y] = (byYear[y] || 0) + 1 })
    const y0 = posts[0].d.getFullYear(), y1 = posts[posts.length - 1].d.getFullYear()
    const years = []; for (let y = y0; y <= y1; y++) years.push([y, byYear[y] || 0])
    const busiest = years.reduce((a, b) => (b[1] > a[1] ? b : a))
    let streak = 0, best = 0; for (const [, n] of years) { streak = n ? streak + 1 : 0; best = Math.max(best, streak) }
    let gap = 0, gapAt = null, minGap = Infinity
    for (let i = 1; i < posts.length; i++) { const g = Math.round((posts[i].d - posts[i - 1].d) / DAY); if (g > gap) { gap = g; gapAt = posts[i] } minGap = Math.min(minGap, g) }
    const byMonth = {}; posts.forEach((p) => { const k = p.d.getFullYear() + '-' + p.d.getMonth(); byMonth[k] = (byMonth[k] || 0) + 1 })
    const maxMonth = Math.max(...Object.values(byMonth))
    const span = (posts[posts.length - 1].d - posts[0].d) / (365.25 * DAY)
    const xp = posts.length * 120 + notes.length * 45 + projects.length * 80 + work.length * 100
    const RANKS = [['Recruit', 0], ['Private', 500], ['Corporal', 1000], ['Sergeant', 1600], ['Staff Sergeant', 2200], ['Lieutenant', 3000], ['Captain', 3800], ['Major', 4800], ['Commander', 6000], ['Colonel', 7500], ['General', 10000]]
    let ri = 0; RANKS.forEach((r, i) => { if (xp >= r[1]) ri = i })
    const next = RANKS[ri + 1]
    const medals = [
      { id: 'dawn', name: 'First Light', desc: `First mission deployed: “${posts[0].title}”, ${fmtDate(posts[0].d)}.`, on: true, color: '#ffb84a' },
      { id: 'arc', name: 'Long Haul', desc: `Active for ${span.toFixed(1)} years. Awarded for five or more years in service.`, on: span >= 5, color: '#7fd2ff' },
      { id: 'twin', name: 'Twin Suns', desc: `Two missions within seven days. Closest pair: ${minGap} day${minGap === 1 ? '' : 's'} apart.`, on: minGap <= 7, color: '#ff8a6a' },
      { id: 'stack', name: 'Prolific', desc: `${busiest[1]} missions in ${busiest[0]}. Awarded for six or more in a calendar year.`, on: busiest[1] >= 6, color: '#9dff9a' },
      { id: 'bolt', name: 'Overdrive', desc: `${maxMonth} missions in a single month. Awarded for three or more.`, on: maxMonth >= 3, color: '#ffe066' },
      { id: 'infinity', name: 'Unbroken', desc: `At least one mission every year for ${best} straight years.`, on: best >= 5, color: '#c49bff' },
      { id: 'star', name: 'Return Fire', desc: `Came back after ${gap} days of radio silence (${gapAt ? fmtMonth(gapAt.d) : ''}).`, on: gap > 365, color: '#ff6ab4' },
      { id: 'film', name: 'Field Notes', desc: `${notes.length} saved films in the theater. Awarded at eight.`, on: notes.length >= 8, color: '#6affe0' },
      { id: 'cube', name: 'Architect', desc: `${projects.length} objects forged. Awarded at ten.`, on: projects.length >= 10, color: '#7fb6ff' },
      { id: 'crown', name: 'Centurion', desc: `One hundred missions deployed. Progress: ${posts.length} / 100.`, on: posts.length >= 100, color: '#ffd27f' },
    ]
    return { years, busiest, best, gap, gapAt, span, xp, rank: RANKS[ri][0], next, prevXp: RANKS[ri][1], medals }
  })()

  // ---------------- markdown-lite (for excerpts) ----------------
  function inline(s) {
    let out = esc(s)
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
    out = out.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (_, t, h) => `<a href="${fullUrl(h.replace(/&amp;/g, '&')).replace(/"/g, '&quot;')}" target="_blank" rel="noopener">${t}</a>`)
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    out = out.replace(/(^|\s)~([^~\s][^~\n]{0,30}?)~(?=[\s.,!?:;]|$)/g, '$1<del>$2</del>')
    out = out.replace(/(^|[\s(])[_*]([^_*\n]+)[_*](?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    return out
  }
  function md(src) {
    const out = []; let para = [], code = null, list = null
    const flush = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = [] } }
    const flushList = () => { if (list) { out.push(`<${list.t}>` + list.items.map((i) => '<li>' + inline(i) + '</li>').join('') + `</${list.t}>`); list = null } }
    for (const raw of src.split('\n')) {
      if (raw.trim().startsWith('```')) { if (code) { out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); code = null } else { flush(); flushList(); code = [] } continue }
      if (code) { code.push(raw); continue }
      const l = raw.trim(); let m
      if (!l) { flush(); flushList(); continue }
      if ((m = l.match(/^#{1,6}\s+(.*)/))) { flush(); flushList(); out.push('<h4>' + inline(m[1]) + '</h4>'); continue }
      if ((m = l.match(/^[-*]\s+(.*)/))) { flush(); if (!list || list.t !== 'ul') { flushList(); list = { t: 'ul', items: [] } } list.items.push(m[1]); continue }
      if ((m = l.match(/^\d+\.\s+(.*)/))) { flush(); if (!list || list.t !== 'ol') { flushList(); list = { t: 'ol', items: [] } } list.items.push(m[1]); continue }
      if (l.startsWith('>')) { flush(); flushList(); out.push('<blockquote>' + inline(l.replace(/^>\s?/, '')) + '</blockquote>'); continue }
      if (/^!\[[^\]]*\]\([^)]*\)$/.test(l)) { flush(); flushList(); out.push('<p class="img-ph">[ Image feed unavailable ]</p>'); continue }
      if (/^<\/?[A-Za-z]/.test(l)) continue
      if (list) { list.items[list.items.length - 1] += ' ' + l; continue }
      para.push(l)
    }
    if (code) out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>')
    flush(); flushList()
    return out.join('')
  }

  // ---------------- prefs ----------------
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('meridian.prefs') || '{}') } catch { return {} } },
    set(v) { try { localStorage.setItem('meridian.prefs', JSON.stringify(v)) } catch {} },
  }
  const sysReduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const DEFAULTS = { sound: false, music: 7, sfx: 8, motion: sysReduced ? 'reduced' : 'full', quality: Q.get('q') || 'auto', fps: false }
  const prefs = { ...DEFAULTS, ...store.get() }
  if (Q.get('q')) prefs.quality = Q.get('q')
  const save = () => store.set(prefs)
  document.documentElement.classList.toggle('rm', prefs.motion === 'reduced')

  // ---------------- markup ----------------
  const BAR = '<span class="bar" aria-hidden="true"><i></i><b></b><i></i></span>'
  const MENU = [
    ['campaign', 'Campaign', () => `<b>${posts.length} missions · ${posts[0].d.getFullYear()}–${posts[posts.length - 1].d.getFullYear()}</b>Seven years of field reports. Continue from mission ${posts.length}: “${esc(posts[posts.length - 1].title)}”.`],
    ['theater', 'Theater', () => `<b>${notes.length} saved films</b>Short clips from the notebook. Scrub through each one frame by frame.`],
    ['forge', 'Forge', () => `<b>${projects.length} objects in the palette</b>Things built, shipped and open-sourced, from z80 calculators to v0.`],
    ['matchmaking', 'Matchmaking', () => `<b>${work.length} playlists online</b>Work published on vercel.com. Pick a playlist and find a match.`],
    ['service', 'Service Record', () => `<b>${esc(SR.rank)} · ${SR.xp.toLocaleString()} XP</b>Career stats, medals and contact channels for ${esc(SITE.name)}.`],
    ['settings', 'Settings', () => `<b>System</b>Sound, motion and render quality. Renderer: ${esc(rendererName())}.`],
  ]
  const rendererName = () => ({ webgpu: 'WebGPU', webgl2: 'WebGL 2', '2d': 'Canvas 2D', none: 'starting…' })[Render.info.kind] || 'starting…'

  const app = document.getElementById('app')
  app.innerHTML = `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="gAmber" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0c4"/><stop offset=".5" stop-color="#ffc46b"/><stop offset="1" stop-color="#b97a22"/></linearGradient></defs></svg>
  <a class="skip" href="#screens" id="skip">Skip to content</a>
  <div id="announce" class="sr" aria-live="polite" aria-atomic="true"></div>
  <div id="shade"></div>
  <div id="sweep"></div>
  <main class="title-screen" id="title" aria-label="Title screen">
    <div class="logo-wrap">
      <svg class="logo-arc" viewBox="0 0 1000 300" aria-hidden="true"><defs><linearGradient id="arcg" x1="0" x2="1"><stop offset="0" stop-color="#7fd2ff" stop-opacity="0"/><stop offset=".45" stop-color="#c4ecff" stop-opacity=".85"/><stop offset=".7" stop-color="#ffd8a0" stop-opacity=".7"/><stop offset="1" stop-color="#7fd2ff" stop-opacity="0"/></linearGradient></defs><ellipse cx="500" cy="150" rx="480" ry="64" fill="none" stroke="url(#arcg)" stroke-width="2.2" transform="rotate(-5 500 150)"/><ellipse cx="500" cy="150" rx="480" ry="64" fill="none" stroke="rgba(196,236,255,.18)" stroke-width="9" transform="rotate(-5 500 150)"/></svg>
      <h1 class="logo" data-text="Meridian">Meridian</h1>
      <div class="logo-sub"><span>${esc(SITE.name.toUpperCase())}</span></div>
      <div class="logo-tag">Field Records ${posts[0].d.getFullYear()} — ${posts[posts.length - 1].d.getFullYear()}</div>
    </div>
    <button class="press-start" id="press-start">Press Start</button>
    <div class="title-opts"><button class="chip" id="title-snd" aria-pressed="false"><span class="eq"><i></i><i></i><i></i></span><span>Sound off</span></button></div>
    <div class="title-foot">© ${new Date().getFullYear()} ${esc(SITE.name)} · An original work · All art and audio generated in your browser</div>
  </main>
  <div id="shell" hidden>
    <header class="topbar">
      <div class="brand"><span class="brand-logo">Meridian</span><span class="brand-sep"></span><span class="crumb" id="crumb"></span></div>
      <div class="top-right"><span class="net"><span class="net-dot"></span>Online</span><button class="chip" id="snd" aria-pressed="false" title="Toggle sound (M)"><span class="eq"><i></i><i></i><i></i></span><span>Sound off</span></button></div>
    </header>
    <main id="screens" tabindex="-1"></main>
    <footer class="hints" id="hints"><div class="hints-l" id="hints-l"></div><div class="hints-r" id="hints-r"></div></footer>
  </div>
  <div class="fps" id="fps" hidden></div>`

  const screensEl = $('#screens')
  const S = {}

  // ---- MAIN ----
  S.main = {
    pose: 'main', crumb: () => '<b>Main menu</b>',
    html: () => `
      <h1 class="sr">Main menu</h1>
      <nav class="holo sheet" aria-label="Main menu">
        <ul class="menu">${MENU.map(([k, l], i) => `<li><a class="mi" data-nav href="#${k}">${BAR}<span class="num">${pad2(i + 1)}</span><span class="lbl">${l}</span></a></li>`).join('')}</ul>
        <div class="menu-desc" id="menu-desc"></div>
      </nav>
      <div class="holo lobby panel">
        <h2 class="ph">Party <small>1 / 4 · Open</small></h2>
        <div class="tag-card">${Art.emblem({ id: 'e1' })}<div><div class="gt">${esc(SITE.name)}</div><div class="gt-sub">Software engineer · Vercel</div><div class="gt-row"><span class="stag">ML26</span>${Art.rankIcon()}<span>${esc(SR.rank)}</span></div></div></div>
        <ul class="slots">${[1, 2, 3].map(() => '<li class="slot"><span class="sq"></span><span>Open slot</span><em></em></li>').join('')}</ul>
        <div class="lobby-foot"><span class="live">● Party leader</span><span>${esc(SITE.url.replace('https://', ''))}</span></div>
      </div>`,
    onSel(i) { const d = $('#menu-desc'); if (d) d.innerHTML = MENU[i][2]() },
    hints: () => [['↵', 'Select'], ['M', 'Sound']],
  }

  // ---- CAMPAIGN ----
  S.campaign = {
    pose: 'campaign', crumb: () => 'Main menu › <b>Campaign</b>', parent: 'main',
    html: () => `
      <div class="scr-head holo"><h1 class="scr-title">Campaign</h1><p class="scr-sub">Mission select · ${posts.length} missions</p></div>
      <div class="split">
        <div class="panel listp holo"><h2 class="ph">Missions <small>${posts[0].d.getFullYear()} — ${posts[posts.length - 1].d.getFullYear()}</small></h2>
          <ul class="list">${missions.map((p) => `<li><a class="li" data-nav href="#mission/${encodeURIComponent(p.slug)}">${BAR}<span class="n">${pad2(p.num)}</span><span class="t">${esc(p.title)}</span><span class="m">${fmtMonth(p.d)}</span></a></li>`).join('')}</ul>
          <div class="list-foot"><span id="mis-pos"></span><span>Newest first</span></div></div>
        <div class="panel detail holo" id="mis-detail"></div>
      </div>`,
    onSel(i) {
      const p = missions[i]; if (!p) return
      $('#mis-pos').textContent = `Mission ${pad2(p.num)} / ${posts.length}`
      $('#mis-detail').innerHTML = `
        <h2 class="ph">Mission ${pad2(p.num)} <small>${esc(p.date)}</small></h2>
        <div class="shot"><canvas aria-hidden="true"></canvas><div class="shot-tl"><span>Sector ${pad2(p.num)}</span><span>${p.d.getFullYear()}</span></div><div class="shot-cap"><small>Mission ${pad2(p.num)}</small><h3>${esc(p.title)}</h3></div></div>
        <div class="dbody">
          <div class="dmain"><span class="lab">Intel</span><p class="intel">${esc(p.intel)}</p><span class="lab">Briefing</span><p class="brief">${esc(plain(p.excerpt))}</p></div>
          <div class="dside">
            <div><span class="lab">Difficulty</span><div class="diff">${[0, 1, 2, 3].map((k) => Art.diffIcon(k <= p.tier, k)).join('')}</div><div class="kv">${TIERS[p.tier]}<small>Est. ${p.mins} min read</small></div></div>
            <div><span class="lab">Deployed</span><div class="kv">${fmtDate(p.d)}<small>${p.prev == null ? 'First deployment' : p.prev + ' days after mission ' + pad2(p.num - 1)}</small></div></div>
            <a class="go" tabindex="-1" href="#mission/${encodeURIComponent(p.slug)}"><span class="key">↵</span>Start mission</a>
          </div>
        </div>`
      Art.drawPlate($('#mis-detail canvas'), p.slug, 'land')
    },
    hints: () => [['↑↓', 'Browse'], ['↵', 'Start mission'], ['Esc', 'Back']],
  }

  // ---- MISSION (open article) ----
  S.mission = {
    pose: 'campaign', parent: 'campaign',
    crumb: (a) => `Campaign › <b>Mission ${pad2((posts.find((p) => p.slug === a) || posts[0]).num)}</b>`,
    html: (slug) => {
      const p = posts.find((x) => x.slug === slug) || posts[posts.length - 1]
      const url = fullUrl(p.href)
      return `
      <div class="scr-head holo"><h1 class="scr-title">Briefing</h1><p class="scr-sub">Mission ${pad2(p.num)} · Intel package decrypted</p></div>
      <div class="brief-wrap">
        <article class="panel article holo"><h2 class="ph">Transmission <small>${esc(p.date)}</small></h2>
          <div class="prose-scroll" id="prose" tabindex="0" data-nav role="region" aria-label="Article: ${esc(p.title)}">
            <h3>${esc(p.title)}</h3>
            <p class="prose-meta">${esc(p.date)} · <i>${TIERS[p.tier]}</i> · est. ${p.mins} min${p.description ? ' · ' + esc(p.description) : ''}</p>
            <div class="prose">${md(p.excerpt)}<p>…</p></div>
            <div class="trunc"><span>[ Transmission truncated ]</span><a class="cta" data-nav href="${esc(url)}" target="_blank" rel="noopener">Continue on maxleiter.com ›</a></div>
          </div></article>
        <div class="panel side-stack holo" role="group" aria-label="Mission summary">
          <div class="shot"><canvas aria-hidden="true"></canvas><div class="shot-cap"><small>Mission ${pad2(p.num)}</small></div></div>
          <div class="side-body">
            <div><span class="lab">Difficulty</span><div class="diff">${[0, 1, 2, 3].map((k) => Art.diffIcon(k <= p.tier, k)).join('')}</div><div class="kv">${TIERS[p.tier]}<small>Est. ${p.mins} min read</small></div></div>
            <div><span class="lab">Objective</span><p class="intel" style="margin:0;font-size:14px">${esc(p.intel)}</p></div>
            <a class="cta ghost" data-nav href="#campaign">‹ Mission select</a>
          </div>
        </div>
      </div>`
    },
    after() { const c = $('.screen.active .side-stack canvas'); const slug = decodeURIComponent(location.hash.split('/')[1] || ''); if (c) Art.drawPlate(c, slug || posts[posts.length - 1].slug, 'land') },
    activate(el) { if (el.id === 'prose') return true },
    vertical(dir) { const el = $('#prose'); if (el) { el.scrollBy({ top: dir * 90, behavior: prefs.motion === 'reduced' ? 'auto' : 'smooth' }); return true } },
    hints: () => [['↑↓', 'Read'], ['←→', 'Choose'], ['↵', 'Open'], ['Esc', 'Back']],
    horizontalMoves: true,
  }

  // ---- THEATER ----
  S.theater = {
    pose: 'theater', parent: 'main', crumb: () => 'Main menu › <b>Theater</b>',
    html: () => `
      <div class="scr-head holo"><h1 class="scr-title">Theater</h1><p class="scr-sub">Saved films · ${notes.length} clips</p></div>
      <div class="split">
        <div class="panel listp holo"><h2 class="ph">Saved films <small>Notebook</small></h2>
          <ul class="list">${notes.map((n, i) => `<li><a class="li thumb" data-nav href="#film/${encodeURIComponent(n.slug)}">${BAR}<canvas aria-hidden="true" data-plate="${esc(n.slug)}"></canvas><span class="t">${esc(n.title)}</span><span class="m">${fmtTime(n.secs)}</span></a></li>`).join('')}</ul>
          <div class="list-foot"><span>${notes.length} films</span><span>${fmtTime(notes.reduce((a, n) => a + n.secs, 0))} total</span></div></div>
        <div class="panel detail holo" id="film-detail"></div>
      </div>`,
    after() { $$('.screen.active canvas[data-plate]').forEach((c) => Art.drawPlate(c, c.dataset.plate, 'film')) },
    onSel(i) {
      const n = notes[i]; if (!n) return
      $('#film-detail').innerHTML = `
        <h2 class="ph">Film details <small>Clip ${pad2(i + 1)}</small></h2>
        <div class="shot" style="height:250px"><canvas aria-hidden="true"></canvas><div class="shot-tl"><span>● Rec</span><span>${fmtTime(n.secs)}</span></div><div class="shot-cap"><small>${esc(n.date)}</small><h3>${esc(n.title)}</h3></div></div>
        <div class="dbody"><div class="dmain"><span class="lab">Description</span><p class="brief" style="-webkit-line-clamp:5">${esc(n.text)}</p></div>
          <div class="dside"><div><span class="lab">Length</span><div class="kv">${fmtTime(n.secs)}<small>${words(n.text)} words</small></div></div><div><span class="lab">Recorded</span><div class="kv">${fmtDate(n.d)}<small>Author: ${esc(SITE.name)}</small></div></div><a class="go" tabindex="-1" href="#film/${encodeURIComponent(n.slug)}"><span class="key">↵</span>Play film</a></div></div>`
      Art.drawPlate($('#film-detail canvas'), n.slug, 'film')
    },
    hints: () => [['↑↓', 'Browse'], ['↵', 'Play film'], ['Esc', 'Back']],
  }

  // ---- FILM PLAYER ----
  const film = { n: null, t: 0, playing: false, speed: 1, last: 0, raf: 0 }
  S.film = {
    pose: 'theater', parent: 'theater',
    crumb: (a) => `Theater › <b>${esc((notes.find((n) => n.slug === a) || notes[0]).title)}</b>`,
    html: (slug) => {
      const n = notes.find((x) => x.slug === slug) || notes[0]
      film.n = n; film.t = prefs.motion === 'reduced' ? 1 : 0; film.playing = prefs.motion !== 'reduced'; film.speed = 1
      const paras = n.text.split(/\n\n+/); let acc = 0
      const ticks = paras.slice(0, -1).map((p) => { acc += p.length + 2; return acc / n.text.length })
      return `
      <div class="scr-head holo"><h1 class="scr-title">Theater</h1><p class="scr-sub">Now playing · ${esc(n.date)}</p></div>
      <div class="film panel holo">
        <div class="film-view">
          <div class="film-frame"><canvas id="film-cv" aria-hidden="true"></canvas><div class="film-hud"><span class="rec"><i></i>Playback</span><span class="tc" id="film-tc">00:00</span><span class="cam">Camera: free · ${esc(n.title)}</span></div></div>
          <div class="transcript" id="film-tx" tabindex="0" role="region" aria-label="Transcript"></div>
        </div>
        <div class="timeline">
          <button class="tbtn" data-nav data-act="play" aria-label="Play or pause"><svg viewBox="0 0 14 14" id="play-ico"></svg></button>
          <button class="tbtn" data-nav data-act="restart" aria-label="Restart"><svg viewBox="0 0 14 14"><path d="M2 2h2v10H2zM13 2v10L5 7z"/></svg></button>
          <div class="track" data-nav data-act="track" role="slider" aria-label="Timeline" aria-valuemin="0" aria-valuemax="100" tabindex="0"><div class="rail"></div>${ticks.map((t) => `<div class="tick" style="left:${(t * 100).toFixed(2)}%"></div>`).join('')}<div class="fill" id="film-fill"></div><div class="head" id="film-head"></div></div>
          <div style="display:flex;gap:14px;align-items:center"><span class="tread" id="film-read"></span><button class="speed" data-nav data-act="speed" id="film-speed" aria-label="Playback speed">1×</button><a class="cta ghost" data-nav href="${esc(fullUrl(n.href))}" target="_blank" rel="noopener" style="height:34px">Open ›</a></div>
        </div>
      </div>`
    },
    after() { filmRender(true); cancelAnimationFrame(film.raf); film.last = performance.now(); film.raf = requestAnimationFrame(filmTick); bindTrack() },
    leave() { cancelAnimationFrame(film.raf); film.playing = false },
    horizontal(dir) { film.t = Math.max(0, Math.min(1, film.t + dir * 0.05)); filmRender(); Sound.blip('tick'); return true },
    activate(el) {
      const a = el.dataset.act
      if (a === 'play') { if (film.t >= 1) film.t = 0; film.playing = !film.playing; filmRender(); return true }
      if (a === 'restart') { film.t = 0; film.playing = true; filmRender(); return true }
      if (a === 'speed') { film.speed = film.speed >= 4 ? 1 : film.speed * 2; filmRender(); return true }
      if (a === 'track') { film.playing = !film.playing; filmRender(); return true }
    },
    hints: () => [['Space', 'Play / pause'], ['←→', 'Scrub'], ['Esc', 'Back']],
  }
  function filmTick(now) {
    const dt = Math.min(0.1, (now - film.last) / 1000); film.last = now
    if (film.playing && film.n) { film.t = Math.min(1, film.t + (dt * film.speed) / film.n.secs); if (film.t >= 1) film.playing = false; filmRender() }
    film.raf = requestAnimationFrame(filmTick)
  }
  let lastFrameDraw = 0
  function filmRender(force) {
    const n = film.n; if (!n) return
    const tx = $('#film-tx'); if (!tx) return
    const k = Math.floor(film.t * n.text.length)
    tx.innerHTML = `<span class="sr">${esc(n.text)}</span><span aria-hidden="true"><span style="white-space:pre-wrap">${esc(n.text.slice(0, k))}</span><span class="caret"></span><span class="ghost" style="white-space:pre-wrap">${esc(n.text.slice(k))}</span></span>`
    const pct = (film.t * 100).toFixed(2) + '%'
    $('#film-fill').style.width = pct; $('#film-head').style.left = pct
    $('.track')?.setAttribute('aria-valuenow', Math.round(film.t * 100))
    $('#film-tc').textContent = fmtTime(film.t * n.secs) + ' / ' + fmtTime(n.secs)
    $('#film-read').textContent = fmtTime(film.t * n.secs)
    $('#film-speed').textContent = film.speed + '×'
    $('#play-ico').innerHTML = film.playing ? '<path d="M3 2h3v10H3zM8 2h3v10H8z"/>' : '<path d="M3 1.5v11L12 7z"/>'
    const now = performance.now()
    if (force || now - lastFrameDraw > 60) { lastFrameDraw = now; Art.filmFrame($('#film-cv'), n.slug, film.t) }
  }
  function bindTrack() {
    const tr = $('.screen.active .track'); if (!tr) return
    const set = (e) => { const r = tr.getBoundingClientRect(); film.t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); filmRender() }
    tr.addEventListener('pointerdown', (e) => { tr.setPointerCapture(e.pointerId); film.wasPlaying = film.playing; film.playing = false; set(e); Sound.blip('tick') })
    tr.addEventListener('pointermove', (e) => { if (tr.hasPointerCapture(e.pointerId)) set(e) })
    tr.addEventListener('pointerup', () => { film.playing = film.wasPlaying && film.t < 1; filmRender() })
  }

  // ---- FORGE ----
  let forgeRaf = 0
  S.forge = {
    pose: 'forge', parent: 'main', crumb: () => 'Main menu › <b>Forge</b>',
    html: () => {
      let last = ''
      const rows = projects.map((p, i) => {
        const head = p.cat !== last ? `<li class="cat">${CAT_NAME[p.cat]}</li>` : ''
        last = p.cat
        return head + `<li><a class="li" data-nav href="${esc(fullUrl(p.href))}" target="_blank" rel="noopener" style="grid-template-columns:30px minmax(0,1fr) auto">${BAR}${Art.objIcon(p.cat)}<span class="t">${esc(p.title)}</span><span class="m">${pad2(i + 1)}</span></a></li>`
      }).join('')
      return `
      <div class="scr-head holo"><h1 class="scr-title">Forge</h1><p class="scr-sub">Object palette · ${projects.length} items</p></div>
      <div class="split">
        <div class="panel listp holo"><h2 class="ph">Palette <small>${catOrder.filter((c) => projects.some((p) => p.cat === c)).length} categories</small></h2><ul class="list">${rows}</ul>
          <div class="list-foot"><span>Objects placed ${projects.length} / 16</span><span class="budget" style="width:120px"><span class="meter"><i style="width:${(projects.length / 16) * 100}%"></i></span></span></div></div>
        <div class="panel detail holo" id="forge-detail"></div>
      </div>`
    },
    onSel(i) {
      const p = projects[i]; if (!p) return
      const host = fullUrl(p.href).replace(/^https?:\/\//, '').replace(/\/$/, '')
      $('#forge-detail').innerHTML = `
        <h2 class="ph">Object properties <small>ID ${String(Art.hashStr(p.title) % 100000).padStart(5, '0')}</small></h2>
        <div class="forge-view"><canvas id="forge-cv" aria-hidden="true"></canvas><div class="forge-ov"><span>Edit mode · <b>Pivot</b></span><span>Snap 0.25 · Rot 15°</span></div></div>
        <div class="dmain" style="overflow:auto" tabindex="0" role="region" aria-label="Object properties"><table class="props">
          <tr><th>Name</th><td style="font:600 18px/1.2 var(--f-ui);letter-spacing:.08em;text-transform:uppercase;color:#fff">${esc(p.title)}</td></tr>
          <tr><th>Category</th><td>${CAT_NAME[p.cat]}</td></tr>
          <tr><th>Description</th><td>${esc(p.description)}</td></tr>
          <tr><th>Spawn at</th><td><a tabindex="-1" href="${esc(fullUrl(p.href))}" target="_blank" rel="noopener">${esc(host)}</a></td></tr>
        </table></div>`
      cancelAnimationFrame(forgeRaf)
      const cv = $('#forge-cv'), t0 = performance.now()
      const loop = (now) => { if (!cv.isConnected) return; Art.wireframe(cv, p.title, p.cat, prefs.motion === 'reduced' ? 0.6 : (now - t0) / 1000 + 0.6); forgeRaf = requestAnimationFrame(loop) }
      forgeRaf = requestAnimationFrame(loop)
    },
    leave() { cancelAnimationFrame(forgeRaf) },
    hints: () => [['↑↓', 'Browse'], ['↵', 'Spawn object'], ['Esc', 'Back']],
  }

  // ---- MATCHMAKING ----
  let searchTimers = []
  S.matchmaking = {
    pose: 'matchmaking', parent: 'main', crumb: () => 'Main menu › <b>Matchmaking</b>',
    html: () => `
      <div class="scr-head holo"><h1 class="scr-title">Matchmaking</h1><p class="scr-sub">Playlists · ${work.length} online</p></div>
      <div class="split">
        <div class="panel listp holo"><h2 class="ph">Playlists <small>vercel.com</small></h2>
          <ul class="list">${work.map((w, i) => `<li><button class="li" data-nav data-i="${i}">${BAR}<span class="n">${pad2(i + 1)}</span><span class="t">${esc(w.title)}</span><span class="m">${w.d.getFullYear()}</span></button></li>`).join('')}</ul>
          <div class="list-foot"><span>Ranked: off</span><span>Region: worldwide</span></div></div>
        <div class="panel detail holo" id="mm-detail"></div>
      </div>`,
    onSel(i, el) { if (!el?.matches('.list .li')) return; cancelSearch(); renderPlaylist(i) },
    activate(el) { if (el.dataset.i != null) { startSearch(+el.dataset.i); return true } if (el.dataset.act === 'cancel') { cancelSearch(); renderPlaylist(S.matchmaking.sel); return true } },
    back() { if ($('#mm-detail.searching, #mm-detail.found')) { cancelSearch(); renderPlaylist(S.matchmaking.sel); Sound.blip('back'); return true } },
    leave() { cancelSearch() },
    hints: () => [['↑↓', 'Browse'], ['↵', 'Search'], ['Esc', 'Back']],
  }
  function renderPlaylist(i) {
    const w = work[i]; if (!w) return
    const d = $('#mm-detail'); d.className = 'panel detail'
    d.innerHTML = `
      <h2 class="ph">Playlist <small>Season ${w.d.getFullYear()}</small></h2>
      <div class="mm-card">
        <div class="mm-idle" style="display:flex;flex-direction:column;gap:16px">
          <span class="lab" style="margin:0;color:var(--amber)">${fmtDate(w.d)}</span>
          <h3 class="mm-title">${esc(w.title)}</h3>
          <p class="intel" style="margin:0">${esc(w.description)}</p>
          <div class="mm-grid"><div><span class="lab">Host</span><div class="kv">vercel.com</div></div><div><span class="lab">Mode</span><div class="kv">Team</div></div><div><span class="lab">Season</span><div class="kv">${w.d.getFullYear()}</div></div></div>
          <div style="display:flex;gap:12px;align-items:center;margin-top:6px"><span class="key">↵</span><span class="lab" style="margin:0">Search for match</span></div>
        </div>
        <div class="search" aria-live="polite">
          <svg class="spinner" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" stroke="rgba(150,205,255,.15)"/><circle class="sp1" cx="60" cy="60" r="54" stroke="#c4ecff" stroke-dasharray="60 280" stroke-linecap="square"/><circle class="sp2" cx="60" cy="60" r="42" stroke="#ffc46b" stroke-dasharray="20 244" opacity=".8"/><circle cx="60" cy="60" r="4" fill="#c4ecff" stroke="none"/></svg>
          <div class="s-status" id="s-status">Searching</div>
          <div class="s-sub" id="s-sub">${esc(w.title)}</div>
          <ul class="s-log" id="s-log"></ul>
          <div id="s-act" style="display:flex;gap:12px"></div>
        </div>
      </div>`
  }
  function startSearch(i) {
    const w = work[i]; const d = $('#mm-detail'); if (!w || !d) return
    S.matchmaking.sel = i; renderPlaylist(i); d.classList.add('searching')
    if (matchMedia('(max-width: 760px)').matches) d.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const log = (t) => { const li = document.createElement('li'); li.className = 'ok'; li.textContent = t; $('#s-log')?.appendChild(li); Sound.blip('tick') }
    const sub = (t) => { const el = $('#s-sub'); if (el) el.textContent = t }
    const steps = [
      [500, () => log('Connected to vercel.com')],
      [1100, () => { sub('Expanding search…'); log(`Playlist: ${w.d.getFullYear()} season`) }],
      [1800, () => log('1 match in range')],
      [2400, () => {
        d.classList.remove('searching'); d.classList.add('searching', 'found')
        $('#s-status').textContent = 'Match found'; sub(w.title)
        $('#s-act').innerHTML = `<a class="cta" data-nav href="${esc(w.href)}" target="_blank" rel="noopener">Join game ›</a><button class="cta ghost" data-nav data-act="cancel">Leave</button>`
        Sound.blip('found'); Nav.refresh(navItems().indexOf($('#s-act .cta')))
      }],
    ]
    const speed = prefs.motion === 'reduced' ? 0.3 : 1
    searchTimers = steps.map(([t, f]) => setTimeout(f, t * speed))
  }
  function cancelSearch() { searchTimers.forEach(clearTimeout); searchTimers = [] }

  // ---- SERVICE RECORD ----
  S.service = {
    pose: 'service', parent: 'main', crumb: () => 'Main menu › <b>Service record</b>',
    html: () => {
      const maxY = Math.max(...SR.years.map((y) => y[1]))
      const W = 420, H = 150, bw = W / SR.years.length
      const bars = SR.years.map(([y, n], i) => { const h = (n / maxY) * (H - 26); const x = i * bw + bw * 0.18; const hot = y === SR.busiest[0]; return `<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${h.toFixed(1)}" fill="${hot ? 'url(#gAmber)' : 'rgba(127,210,255,.55)'}" stroke="${hot ? '#ffe2a8' : '#c4ecff'}" stroke-width="1"/><text class="v" x="${(x + bw * 0.32).toFixed(1)}" y="${(H - h - 7).toFixed(1)}" text-anchor="middle">${n}</text><text x="${(x + bw * 0.32).toFixed(1)}" y="${H + 16}" text-anchor="middle">${String(y).slice(2)}′</text>` }).join('')
      const grid = [0.25, 0.5, 0.75, 1].map((f) => `<line x1="0" x2="${W}" y1="${(H - f * (H - 26)).toFixed(1)}" y2="${(H - f * (H - 26)).toFixed(1)}" stroke="rgba(150,205,255,.1)"/>`).join('')
      const xpPct = SR.next ? ((SR.xp - SR.prevXp) / (SR.next[1] - SR.prevXp)) * 100 : 100
      const stats = [[posts.length, 'Missions'], [notes.length, 'Saved films'], [projects.length, 'Objects forged'], [work.length, 'Matches'], [SR.span.toFixed(1), 'Years in service'], [SR.busiest[0], `Best year · ${SR.busiest[1]} missions`], [SR.best, 'Year streak'], [SR.gap, 'Longest silence (days)']]
      return `
      <div class="scr-head holo"><h1 class="scr-title">Service Record</h1><p class="scr-sub">Personnel file · ${esc(SITE.name)}</p></div>
      <div class="sr-grid">
        <div class="panel sr-card holo">
          <h2 class="ph">Service tag <small>ML26</small></h2>
          <div class="sr-id">${Art.emblem({ id: 'e2' })}<div><div class="gt">${esc(SITE.name)}</div><div class="gt-row" style="margin-top:10px">${Art.rankIcon()}<span>${esc(SR.rank)}</span></div></div></div>
          <p class="sr-blurb">${esc(SITE.blurb)}</p>
          <div class="xp"><div class="xp-row"><span>${SR.xp.toLocaleString()} XP</span><span>${SR.next ? 'Next: ' + esc(SR.next[0]) + ' · ' + SR.next[1].toLocaleString() : 'Max rank'}</span></div><div class="meter"><i style="width:${xpPct.toFixed(1)}%"></i></div></div>
          <div class="links">
            <a class="li" data-nav href="${esc(SITE.github)}" target="_blank" rel="noopener">${BAR}<span class="n">GH</span><span class="t">GitHub</span><span class="m">/maxleiter</span></a>
            <a class="li" data-nav href="${esc(SITE.x)}" target="_blank" rel="noopener">${BAR}<span class="n">X</span><span class="t">X / Twitter</span><span class="m">@maxleiter</span></a>
            <a class="li" data-nav href="${esc(SITE.url)}" target="_blank" rel="noopener">${BAR}<span class="n">WWW</span><span class="t">Website</span><span class="m">maxleiter.com</span></a>
          </div>
        </div>
        <div class="sr-right">
          <div class="panel holo"><h2 class="ph">Career <small>Computed from ${posts.length + notes.length + entries.length} records</small></h2><div class="stats">${stats.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('')}</div></div>
          <div class="sr-lower">
            <div class="panel holo"><h2 class="ph">Missions per year <small>${SR.years[0][0]}–${SR.years[SR.years.length - 1][0]}</small></h2><div class="chart"><svg viewBox="0 0 ${W} ${H + 22}" role="img" aria-label="Posts per year">${grid}<line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="rgba(196,236,255,.5)"/>${bars}</svg></div></div>
            <div class="panel holo" style="display:flex;flex-direction:column"><h2 class="ph">Medals <small>${SR.medals.filter((m) => m.on).length} / ${SR.medals.length}</small></h2>
              <div class="medals">${SR.medals.map((m, i) => `<button class="medal ${m.on ? '' : 'locked'}" data-nav data-medal="${i}" aria-label="${esc(m.name)}${m.on ? '' : ' (locked)'}">${Art.medal(m.id, m.color, i)}<span>${esc(m.name)}</span></button>`).join('')}</div>
              <div class="medal-info" id="medal-info"></div></div>
          </div>
        </div>
      </div>`
    },
    onSel(i, el) {
      const m = SR.medals[el?.dataset.medal ?? -1]
      const info = $('#medal-info'); if (!info) return
      const show = m || SR.medals[0]
      info.innerHTML = `<b>${esc(show.name)}${show.on ? '' : ' · Locked'}</b>${esc(show.desc)}`
    },
    hints: () => [['↑↓←→', 'Browse'], ['↵', 'Open'], ['Esc', 'Back']],
    grid: true,
  }

  // ---- SETTINGS ----
  const QUALS = ['auto', 'low', 'medium', 'high', 'ultra']
  const OPTS = [
    { k: 'sound', label: 'Sound', vals: [false, true], show: (v) => (v ? 'On' : 'Off') },
    { k: 'music', label: 'Music volume', range: [0, 10] },
    { k: 'sfx', label: 'Effects volume', range: [0, 10] },
    { k: 'motion', label: 'Motion', vals: ['full', 'reduced'], show: (v) => (v === 'full' ? 'Full' : 'Reduced') },
    { k: 'quality', label: 'Render quality', vals: QUALS, show: (v) => v[0].toUpperCase() + v.slice(1) },
    { k: 'fps', label: 'Frame counter', vals: [false, true], show: (v) => (v ? 'On' : 'Off') },
  ]
  S.settings = {
    pose: 'settings', parent: 'main', crumb: () => 'Main menu › <b>Settings</b>',
    html: () => `
      <div class="scr-head holo"><h1 class="scr-title">Settings</h1><p class="scr-sub">Audio · video · controls</p></div>
      <div class="split">
        <div class="panel listp holo"><h2 class="ph">Options</h2><ul class="opts">${OPTS.map((o, i) => `<li><button class="opt" data-nav data-opt="${i}">${BAR}<span>${o.label}</span><span class="val" id="opt-${i}"></span></button></li>`).join('')}
          <li><button class="opt" data-nav data-act="defaults">${BAR}<span>Restore defaults</span><span class="val"></span></button></li></ul></div>
        <div class="panel detail holo"><h2 class="ph">System <small>Live</small></h2><div class="sys"><dl id="sysinfo"></dl></div></div>
      </div>`,
    after() { OPTS.forEach((_, i) => renderOpt(i)); renderSys() },
    horizontal(dir, el) { const i = el?.dataset.opt; if (i == null) return true; changeOpt(+i, dir); return true },
    activate(el) { if (el.dataset.act === 'defaults') { Object.assign(prefs, { ...DEFAULTS, sound: prefs.sound }); applyPrefs(); OPTS.forEach((_, i) => renderOpt(i)); save(); return true } if (el.dataset.opt != null) { changeOpt(+el.dataset.opt, 1); return true } },
    hints: () => [['↑↓', 'Browse'], ['←→', 'Change'], ['Esc', 'Back']],
  }
  function renderOpt(i) {
    const o = OPTS[i], v = prefs[o.k], el = $('#opt-' + i); if (!el) return
    const inner = o.range ? `<span class="pips" aria-hidden="true">${Array.from({ length: 10 }, (_, k) => `<i class="${k < v ? 'on' : ''}"></i>`).join('')}</span>` : `<span>${o.show(v)}</span>`
    el.innerHTML = `<span class="arr" aria-hidden="true">◀</span>${inner}${o.range ? `<span class="sr">${v} of 10</span>` : ''}<span class="arr" aria-hidden="true">▶</span>`
  }
  function changeOpt(i, dir) {
    const o = OPTS[i]
    if (o.range) prefs[o.k] = Math.max(o.range[0], Math.min(o.range[1], prefs[o.k] + dir))
    else { const ix = o.vals.indexOf(prefs[o.k]); prefs[o.k] = o.vals[(ix + dir + o.vals.length) % o.vals.length] }
    applyPrefs(o.k); renderOpt(i); save(); Sound.blip('tick')
  }
  function renderSys() {
    const el = $('#sysinfo'); if (!el) return
    const I = Render.info
    const rows = [
      ['Renderer', rendererName() + (I.kind === 'webgpu' ? ' · compute particles' : I.kind === 'webgl2' ? ' · vertex particles' : '')],
      ['Adapter', I.adapterInfo || '—'],
      ['Render scale', Math.round(I.scale * 100) + '%' + (prefs.quality === 'auto' ? ' · dynamic' : ' · fixed')],
      ['Frame rate', I.fps ? Math.round(I.fps) + ' fps' : '—'],
      ['Post', I.kind === '2d' ? 'None' : 'HDR · bloom · ACES · flare'],
      ['Audio', Sound.ready ? 'WebAudio · ' + (Sound.enabled ? 'playing' : 'muted') : 'Off until enabled'],
      ['Input', lastInput === 'pad' ? 'Gamepad' : lastInput === 'touch' ? 'Touch' : 'Keyboard & mouse'],
    ]
    el.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')
  }

  // build all screens
  for (const [name, s] of Object.entries(S)) {
    s.name = name; s.sel = 0
    const el = document.createElement('section')
    el.className = 'screen'; el.dataset.screen = name; el.setAttribute('aria-label', name)
    s.el = el; screensEl.appendChild(el)
    if (!['mission', 'film'].includes(name)) el.innerHTML = s.html()
  }
  S.campaign.sel = 0

  // ---------------- prefs application ----------------
  function applyPrefs(k) {
    if (!k || k === 'sound') setSound(prefs.sound, true)
    if (!k || k === 'music') Sound.setMusic(prefs.music / 10)
    if (!k || k === 'sfx') Sound.setSfx(prefs.sfx / 10)
    if (!k || k === 'motion') { const r = prefs.motion === 'reduced'; document.documentElement.classList.toggle('rm', r); Render.setReducedMotion(r) }
    if (!k || k === 'quality') Render.setQuality(prefs.quality)
    if (!k || k === 'fps') $('#fps').hidden = !prefs.fps
  }
  function setSound(on, quiet) {
    prefs.sound = on
    if (on || Sound.ready) Sound.setEnabled(on)
    for (const b of [$('#snd'), $('#title-snd')]) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.lastElementChild.textContent = on ? 'Sound on' : 'Sound off' }
    const ix = OPTS.findIndex((o) => o.k === 'sound'); if (ix >= 0) renderOpt(ix)
    if (!quiet) { save(); if (on) Sound.blip('select') }
  }

  // ---------------- navigation ----------------
  let cur = null, curArg = null, started = false, lastInput = 'key'
  const parseHash = () => { const h = decodeURIComponent(location.hash.slice(1)); const [n, ...rest] = h.split('/'); return S[n] ? [n, rest.join('/')] : ['main', ''] }
  const navItems = () => (cur ? $$('[data-nav]', cur.el).filter((e) => e.offsetParent !== null || e.getClientRects().length) : [])

  const Nav = {
    select(i, { sound = true, focus = true } = {}) {
      const items = navItems(); if (!items.length) return
      i = Math.max(0, Math.min(items.length - 1, i))
      const changed = i !== cur.sel
      items.forEach((e, k) => e.classList.toggle('sel', k === i))
      cur.sel = i
      const el = items[i]
      if (focus && document.activeElement !== el) el.focus({ preventScroll: true })
      const list = el.closest('.list, .prose-scroll, .links, .medals, .opts')
      if (list && list.classList.contains('list')) {
        const r = el.getBoundingClientRect(), lr = list.getBoundingClientRect()
        if (r.top < lr.top + 4) list.scrollTop -= lr.top + 4 - r.top
        else if (r.bottom > lr.bottom - 4) list.scrollTop += r.bottom - lr.bottom + 4
      }
      cur.onSel?.(listIndex(el), el)
      if (changed && sound) Sound.blip('move')
      if (changed) announce(el)
    },
    move(d) { Nav.select((cur.sel ?? 0) + d) },
    refresh(i) { Nav.select(i ?? cur.sel, { sound: false }) },
  }
  window.Nav = Nav
  let annT = 0
  function announce(el) {
    // focus already moves with the selection, so this only backs it up for AT that ignores programmatic focus
    clearTimeout(annT)
    annT = setTimeout(() => { const t = (el.getAttribute('aria-label') || el.textContent).replace(/\s+/g, ' ').trim(); $('#announce').textContent = t }, 300)
  }
  $('#skip').addEventListener('click', (e) => { e.preventDefault(); const el = navItems()[cur?.sel || 0]; (el || $('#screens')).focus() })
  // index among same-kind rows (for list screens the detail cares about row index, not nav index)
  function listIndex(el) {
    if (el.matches('.li, .mi, .opt')) { const sib = $$(el.matches('.mi') ? '.mi' : '.list .li, .opts .opt', cur.el); const k = sib.indexOf(el); if (k >= 0) return k }
    return navItems().indexOf(el)
  }

  function show(name, arg, dir = 1) {
    const s = S[name]
    if (cur === s && curArg === arg) return
    const prev = cur
    if (prev && prev !== s) {
      prev.leave?.()
      prev.el.classList.remove('active', 'enter'); prev.el.classList.add('leave')
      setTimeout(() => prev.el.classList.remove('leave'), 260)
    }
    if (s.html && (name === 'mission' || name === 'film')) { s.el.innerHTML = s.html(arg); s.sel = 0 }
    cur = s; curArg = arg
    document.documentElement.dataset.screen = name
    s.el.classList.remove('leave'); s.el.classList.add('active')
    if (prefs.motion !== 'reduced') { s.el.classList.remove('enter'); void s.el.offsetWidth; s.el.classList.add('enter'); setTimeout(() => s.el.classList.remove('enter'), 900) }
    const sw = $('#sweep'); sw.classList.remove('go'); void sw.offsetWidth; if (prefs.motion !== 'reduced') sw.classList.add('go')
    $('#crumb').innerHTML = s.crumb(arg)
    if (prev) $('#announce').textContent = s.crumb(arg).replace(/<[^>]+>/g, '').split('›').pop().trim() + ' screen'
    renderHints()
    Render.setPose(s.pose)
    s.after?.()
    if (name === 'mission' && arg) {
      // land on the "continue" button, but let arrows scroll the prose
      s.sel = 0
    }
    if (name === 'campaign' && prev?.name === 'mission') { const k = missions.findIndex((p) => p.slug === prev.lastArg); if (k >= 0) s.sel = k }
    s.lastArg = arg
    Nav.select(s.sel || 0, { sound: false })
    if (prev && prev !== s) Sound.blip(dir > 0 ? 'select' : 'back')
    document.title = (name === 'main' ? 'Meridian' : (s.crumb(arg).replace(/<[^>]+>/g, '').split('›').pop().trim() + ' — Meridian')) + ' · Max Leiter'
  }
  const ORDER = ['main', 'campaign', 'theater', 'forge', 'matchmaking', 'service', 'settings', 'mission', 'film']
  window.addEventListener('hashchange', () => {
    if (!started) return
    const [n, a] = parseHash()
    const depth = (x) => (x === 'main' ? 0 : x === 'mission' || x === 'film' ? 2 : 1)
    show(n, a, depth(n) >= depth(cur?.name || 'main') ? 1 : -1)
  })
  function back() {
    if (!cur) return
    if (cur.back?.()) return
    if (!cur.parent) return
    const target = cur.parent
    if (history.state?.from === target) history.back()
    else location.hash = target === 'main' ? '' : target
    if (target === 'main' && location.hash === '') show('main', '', -1)
  }
  function activate() {
    const el = navItems()[cur.sel]; if (!el) return
    if (cur.activate?.(el)) { Sound.blip('select'); return }
    el.click()
  }
  function horizontal(d) {
    const el = navItems()[cur.sel]
    if (cur.horizontal?.(d, el)) return
    if (cur.grid || cur.horizontalMoves) Nav.move(d)
  }
  function vertical(d) {
    if (cur.vertical?.(d)) return
    if (cur.grid) {
      // move to the nearest item above/below by geometry
      const items = navItems(), el = items[cur.sel]; if (!el) return Nav.move(d)
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2
      let best = -1, bd = Infinity
      items.forEach((e, k) => { const q = e.getBoundingClientRect(); const dy = (q.top + q.height / 2 - (r.top + r.height / 2)) * d; if (dy < 8) return; const dist = dy + Math.abs(q.left + q.width / 2 - cx) * 0.6; if (dist < bd) { bd = dist; best = k } })
      if (best >= 0) Nav.select(best)
      return
    }
    Nav.move(d)
  }

  // remember the screen we navigated from so Esc can use history.back()
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]')
    if (a && started) {
      const from = cur?.name
      setTimeout(() => { try { history.replaceState({ from }, '') } catch {} }, 0)
    }
  })

  // ---------------- hints ----------------
  function renderHints() {
    if (!cur) return
    const pad = lastInput === 'pad'
    const map = pad ? { '↵': '①', Esc: '②', M: '④', '↑↓': '✚', '←→': '✚', '↑↓←→': '✚', Space: '①' } : {}
    $('#hints-l').innerHTML = cur.hints().map(([k, l]) => `<span class="hint"><span class="key${pad ? ' pad' : ''}">${map[k] || k}</span>${l}</span>`).join('') + (cur.parent && !cur.hints().some((h) => h[0] === 'Esc') ? `<span class="hint"><span class="key">${pad ? '②' : 'Esc'}</span>Back</span>` : '')
    $('#hints-r').innerHTML = `<b>${posts.length}</b> missions · <b>${notes.length}</b> films · <b>${projects.length}</b> objects · <b>${work.length}</b> playlists`
  }

  // ---------------- title / start ----------------
  function start() {
    if (started) return
    started = true
    if (prefs.sound) setSound(true, true)
    Sound.blip('start')
    $('#title').classList.add('out')
    setTimeout(() => { $('#title').hidden = true }, 1300)
    $('#shell').hidden = false
    const [n, a] = parseHash()
    cur = null
    show(n, a, 1)
  }
  $('#press-start').addEventListener('click', start)
  $('#title-snd').addEventListener('click', (e) => { e.stopPropagation(); setSound(!prefs.sound) })
  $('#snd').addEventListener('click', () => setSound(!prefs.sound))
  $('#title').addEventListener('click', (e) => { if (!e.target.closest('#title-snd')) start() })
  $('#hints').addEventListener('click', (e) => { const h = e.target.closest('.hint'); if (!h) return; const k = h.querySelector('.key').textContent; if (k === 'Esc' || k === '②') back(); else if (k === 'M' || k === '④') setSound(!prefs.sound); else if (k === '↵' || k === '①') activate() })

  // ---------------- input ----------------
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    lastInputSet('key')
    if (!started) {
      if (e.key === 'm' || e.key === 'M') { setSound(!prefs.sound); return }
      if (['Enter', ' ', 'Escape'].includes(e.key) || e.key.length === 1) { e.preventDefault(); start() }
      return
    }
    const k = e.key
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); vertical(-1) }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); vertical(1) }
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); horizontal(-1) }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); horizontal(1) }
    else if (k === 'PageDown') { e.preventDefault(); Nav.move(8) }
    else if (k === 'PageUp') { e.preventDefault(); Nav.move(-8) }
    else if (k === 'Home') { e.preventDefault(); Nav.select(0) }
    else if (k === 'End') { e.preventDefault(); Nav.select(1e6) }
    else if (k === 'Enter') { e.preventDefault(); activate() }
    else if (k === ' ') { e.preventDefault(); if (cur.name === 'film') { film.playing = !film.playing; if (film.t >= 1) { film.t = 0; film.playing = true } filmRender() } else activate() }
    else if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); back() }
    else if (k === 'm' || k === 'M') setSound(!prefs.sound)
  })
  document.addEventListener('focusin', (e) => {
    if (!cur) return
    const el = e.target.closest('[data-nav]'); if (!el || !cur.el.contains(el)) return
    const i = navItems().indexOf(el); if (i >= 0 && i !== cur.sel) Nav.select(i, { focus: false })
  })
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || !cur) return
    const el = e.target.closest('[data-nav]'); if (!el || !cur.el.contains(el)) return
    const i = navItems().indexOf(el); if (i >= 0 && i !== cur.sel) Nav.select(i)
  })
  document.addEventListener('pointerdown', (e) => { lastInputSet(e.pointerType === 'touch' ? 'touch' : 'key') })
  // buttons with screen-specific actions
  document.addEventListener('click', (e) => {
    if (!cur) return
    const el = e.target.closest('button[data-nav]'); if (!el || !cur.el.contains(el)) return
    const i = navItems().indexOf(el); if (i >= 0) cur.sel = i
    if (cur.activate?.(el)) Sound.blip('select')
  })
  function lastInputSet(m) { if (lastInput !== m) { lastInput = m; document.documentElement.dataset.input = m; renderHints() } }

  // Gamepad: polled each frame; d-pad / left stick with key-repeat, ① select, ② back, ④ sound, start.
  const pad = { held: {}, next: {} }
  function pollPad(now) {
    requestAnimationFrame(pollPad)
    const gps = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []
    if (!gps.length) return
    const g = gps[0], b = (i) => !!g.buttons[i]?.pressed, ax = (i) => g.axes[i] || 0
    const st = {
      up: b(12) || ax(1) < -0.55, down: b(13) || ax(1) > 0.55, left: b(14) || ax(0) < -0.55, right: b(15) || ax(0) > 0.55,
      a: b(0), b: b(1), y: b(3), start: b(9), lb: b(4), rb: b(5),
    }
    for (const [k, v] of Object.entries(st)) {
      const was = pad.held[k]
      if (v && !was) { pad.next[k] = now + 380; fire(k) }
      else if (v && was && ['up', 'down', 'left', 'right'].includes(k) && now > pad.next[k]) { pad.next[k] = now + 110; fire(k) }
      pad.held[k] = v
    }
  }
  function fire(k) {
    lastInputSet('pad')
    if (!started) { if (k === 'a' || k === 'start') start(); if (k === 'y') setSound(!prefs.sound); return }
    if (k === 'up') vertical(-1); else if (k === 'down') vertical(1)
    else if (k === 'left') horizontal(-1); else if (k === 'right') horizontal(1)
    else if (k === 'a') activate(); else if (k === 'b') back()
    else if (k === 'y') setSound(!prefs.sound)
    else if (k === 'lb') Nav.move(-8); else if (k === 'rb') Nav.move(8)
    else if (k === 'start' && cur.name === 'film') { film.playing = !film.playing; filmRender() }
  }
  requestAnimationFrame(pollPad)
  window.addEventListener('gamepadconnected', () => lastInputSet('pad'))

  window.addEventListener('resize', () => {
    if (!cur) return
    if (cur.name === 'campaign' || cur.name === 'theater') Nav.refresh()
  })

  // ---------------- boot ----------------
  Render.onStats(({ fps, scale, kind }) => {
    $('#fps').textContent = `${Math.round(fps)} FPS · ${Math.round(scale * 100)}% · ${kind.toUpperCase()}`
    if (cur?.name === 'settings') renderSys()
  })
  if (Q.has('noui')) document.getElementById('app').style.display = 'none'
  const deep = location.hash.length > 1 || Q.has('nostart')
  Render.init(document.getElementById('bg'), { pose: Q.get('pose') || (deep ? (parseHash()[0] === 'main' ? 'main' : S[parseHash()[0]].pose) : 'title'), quality: prefs.quality, reducedMotion: prefs.motion === 'reduced' }).then(() => {
    window.__ready = true
    const d = $('#menu-desc'); if (d && cur?.name === 'main') d.innerHTML = MENU[cur.sel][2]()
  })
  applyPrefs('music'); applyPrefs('sfx'); applyPrefs('fps')
  setSound(false, true); prefs.sound = store.get().sound || false
  for (const b of [$('#snd'), $('#title-snd')]) { b.classList.toggle('on', false) }
  if (deep) { $('#title').hidden = true; start() }
  else setTimeout(() => $('#press-start').focus({ preventScroll: true }), 50)
})()
