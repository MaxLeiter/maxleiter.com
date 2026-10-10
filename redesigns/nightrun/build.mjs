// Build: derive the "game" data from ../content.json, render static (no-JS
// readable) markup for every screen, and inline CSS/JS into index.html.
//   node build.mjs
import { readFileSync, writeFileSync } from 'node:fs'
const here = (p) => new URL(p, import.meta.url)
const C = JSON.parse(readFileSync(here('../content.json'), 'utf8'))
const SITE = 'https://maxleiter.com'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const abs = (h) => (/^https?:/.test(h) ? h : SITE + '/' + String(h).replace(/^\//, ''))
const year = (d) => +(String(d).match(/\d{4}/) || [0])[0]
const pad = (n, w = 2) => String(n).padStart(w, '0')
const plain = (md) => md.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim()
const firstSentence = (md) => { const t = plain(md); const m = t.match(/^(.{40,180}?[.!?])(\s|$)/); return m ? m[1] : t.slice(0, 150) + '…' }

// --- tiny markdown -> HTML for excerpts (escape first, then a few inline rules)
function md(src) {
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+|\/[^)\s]*)\)/g, (_, a, u) => `<a href="${u.startsWith('/') ? SITE + u : u}" rel="noopener">${a}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_]+)_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    .replace(/\\`/g, '`')
  const blocks = src.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\r/g, '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  const out = blocks.map((b) => {
    if (/^#{1,6}\s/.test(b)) return `<h3>${inline(b.replace(/^#+\s*/, ''))}</h3>`
    const lines = b.split('\n')
    if (lines.every((l) => /^\s*([-*]|\d+\.)\s+/.test(l))) {
      const ol = /^\s*\d+\./.test(lines[0])
      return `<${ol ? 'ol' : 'ul'}>${lines.map((l) => `<li>${inline(l.replace(/^\s*([-*]|\d+\.)\s+/, ''))}</li>`).join('')}</${ol ? 'ol' : 'ul'}>`
    }
    if (/^Click to expand$/i.test(b)) return ''
    return `<p>${inline(b.replace(/\n/g, ' '))}</p>`
  }).filter(Boolean)
  if (out.length) out[out.length - 1] = out[out.length - 1].replace(/<\/(p|li)>(<\/[ou]l>)?$/, '…</$1>$2')
  return out.join('\n')
}

// --- CAREER: posts as races
const DISTRICTS = [
  { id: 'old', name: 'OLD TOWN', years: [2019, 2020], box: [40, 40, 330, 270] },
  { id: 'docks', name: 'THE DOCKS', years: [2021, 2022], box: [40, 300, 330, 540] },
  { id: 'mid', name: 'MIDTOWN', years: [2023], box: [370, 290, 630, 440] },
  { id: 'harbor', name: 'HARBOR', years: [2024], box: [670, 310, 960, 540] },
  { id: 'up', name: 'UPTOWN', years: [2025], box: [670, 40, 960, 280] },
  { id: 'down', name: 'DOWNTOWN', years: [2026], box: [370, 40, 630, 260] },
]
const TYPES = ['SPRINT', 'CIRCUIT', 'DRAG', 'DRIFT', 'KNOCKOUT', 'TIME TRIAL']
const HQ = [500, 560]
const used = new Set()
const posts = C.posts.map((p, i) => {
  const y = year(p.date)
  const d = DISTRICTS.find((d) => d.years.includes(y)) || DISTRICTS[0]
  const h = hash(p.slug)
  const [x0, y0, x1, y1] = d.box
  const cols = Math.floor((x1 - x0 - 40) / 40), rows = Math.floor((y1 - y0 - 50) / 40)
  let k = h % (cols * rows), mx, my
  for (let tries = 0; tries < cols * rows; tries++) {
    mx = x0 + 20 + ((k % cols) + 0.5) * 40; my = y0 + 40 + (Math.floor(k / cols) + 0.5) * 40
    if (!used.has(mx + ',' + my)) break
    k = (k + 7) % (cols * rows)
  }
  used.add(mx + ',' + my)
  const ex = p.excerpt || ''
  const links = (ex.match(/\]\(/g) || []).length, code = (ex.match(/`[^`]+`/g) || []).length, heads = (ex.match(/^#+\s/gm) || []).length
  const density = links + code * 0.7 + heads * 0.5
  const ym = Math.round((HQ[1] + my) / 2 / 40) * 40
  return {
    i, slug: p.slug, title: p.title, date: p.date, year: y, href: SITE + p.href, district: d.name, did: d.id,
    type: TYPES[h % TYPES.length], intel: p.description ? p.description.replace(/"$/, '') : firstSentence(ex),
    density, x: mx, y: my, route: `M${HQ[0]} ${HQ[1]} V${ym} H${mx} V${my}`, html: md(ex),
  }
})
// difficulty: quantile of how link/code-dense the excerpt is (1-5 stars)
const dens = posts.map((p) => p.density).sort((a, b) => a - b)
for (const p of posts) p.stars = 1 + Math.min(4, Math.floor((dens.indexOf(p.density) / posts.length) * 5))

// --- QUICK RACE: notes
const notes = C.notes.map((n, i) => {
  const h = hash(n.slug), secs = 18 + (n.excerpt || '').length / 18
  const lap = `${Math.floor(secs / 60)}:${pad(Math.floor(secs % 60))}.${pad(h % 1000, 3)}`
  return { i, slug: n.slug, title: n.title, date: n.date, href: SITE + n.href, intel: n.description || firstSentence(n.excerpt || ''), lap, secs, html: md(n.excerpt || ''), spark: Array.from({ length: 9 }, (_, k) => (hash(n.slug + k) % 18)) }
})

// --- GARAGE: projects as parts, CREW: Vercel posts
const items = C.projectsAndExternal.filter((x) => x.href)
const crewSrc = items.filter((x) => /vercel\.com\//.test(x.href))
const partSrc = items.filter((x) => !/vercel\.com\//.test(x.href))
const PAINTS = [
  ['CANDY RED', [0.62, 0.015, 0.025], [0.02, 0.02, 0.025], [1.0, 0.12, 0.3]],
  ['ELECTRIC BLUE', [0.015, 0.12, 0.7], [0.85, 0.88, 0.92], [0.1, 0.75, 1.0]],
  ['ACID LIME', [0.3, 0.7, 0.01], [0.02, 0.02, 0.025], [0.5, 1.0, 0.1]],
  ['PEARL WHITE', [0.78, 0.8, 0.84], [0.7, 0.02, 0.06], [0.2, 0.6, 1.0]],
  ['SUNSET ORANGE', [0.85, 0.2, 0.01], [0.02, 0.02, 0.025], [1.0, 0.45, 0.05]],
  ['ULTRAVIOLET', [0.25, 0.03, 0.6], [0.9, 0.85, 0.95], [0.7, 0.2, 1.0]],
  ['CHROME YELLOW', [0.85, 0.55, 0.01], [0.02, 0.02, 0.025], [1.0, 0.75, 0.1]],
  ['MIDNIGHT', [0.02, 0.022, 0.03], [0.1, 0.6, 0.9], [0.1, 0.75, 1.0]],
  ['TEAL FLASH', [0.01, 0.42, 0.45], [0.9, 0.92, 0.95], [0.1, 1.0, 0.85]],
  ['GUNMETAL', [0.16, 0.18, 0.21], [0.85, 0.3, 0.01], [1.0, 0.4, 0.1]],
  ['HOT MAGENTA', [0.72, 0.02, 0.3], [0.02, 0.02, 0.025], [1.0, 0.15, 0.6]],
]
const PART_RULES = [
  [/kernel|driver/i, 'ECU CHIP'], [/operating system|z80|asm/i, 'ENGINE BLOCK'], [/co-created v0|v0\.app/i, 'NITROUS'],
  [/AI SDK|SDK/i, 'TURBO'], [/IRC/i, 'AUDIO SYSTEM'], [/Gist|Pastebin/i, 'INTAKE'], [/Sortable/i, 'SUSPENSION'],
  [/iOS|X11/i, 'TRANSMISSION'], [/first open-source/i, 'EXHAUST'], [/visitors|video game/i, 'BODY KIT'], [/retinal|glaucoma|medical/i, 'BRAKES'],
]
const TECH = /kernel|driver|asm|z80|libc|linux|compiled|patched|typescript|java\b|node|vue|ios|x11|sdk|model|program|operating system|self-host/gi
const HYPE = /co-created|\d{2,3},\d{3}|visitors|v0|ai\b|great|significant|first/gi
const parts = partSrc.map((p, i) => {
  const desc = p.description || ''
  const t = (p.title + ' ' + desc)
  const type = (PART_RULES.find(([re]) => re.test(t)) || [0, 'SPOILER'])[1]
  const words = desc.split(/\s+/).filter(Boolean).length
  const tech = Math.min(98, 34 + (t.match(TECH) || []).length * 15)
  const hype = Math.min(98, 28 + (t.match(HYPE) || []).length * 17)
  const power = Math.min(96, 30 + words * 2.6)
  const handling = Math.max(30, Math.min(96, 100 - words * 1.4))
  const stars = Math.max(1, Math.min(5, Math.round((tech + hype + power + handling) / 4 / 18)))
  const [pname, paint, vinyl, glow] = PAINTS[i % PAINTS.length]
  return { i, title: p.title, desc, href: abs(p.href), ext: !abs(p.href).startsWith(SITE), type, stats: { POWER: Math.round(power), HANDLING: Math.round(handling), TECH: tech, HYPE: hype }, stars, pname, paint, vinyl, glow }
})
const STOP = new Set('how we made an the of our introducing with support new improving effective family coding site vercel a to for and'.split(' '))
const calls = []
const crew = crewSrc.map((c, i) => {
  const w = c.title.split(/\s+/).filter((x) => !STOP.has(x.toLowerCase()))
  let cs = w[0].length > 8 ? w[0] : w.slice(0, 2).join(' ')
  if (calls.includes(cs.toUpperCase())) cs += ` '${String(year(c.date)).slice(2)}`
  cs = cs.toUpperCase(); calls.push(cs)
  const h = hash(c.title)
  const y = year(c.date)
  return { i, callsign: cs, title: c.title, desc: c.description, date: c.date, year: y, href: c.href, hue: h % 360, status: y >= 2025 ? 'ACTIVE' : y >= 2023 ? 'VETERAN' : 'LEGEND', rep: Math.min(100, 40 + (2027 - y) * 9) }
})

// --- PROFILE stats, computed
const years = posts.map((p) => p.year)
const perYear = years.reduce((m, y) => ((m[y] = (m[y] || 0) + 1), m), {})
const best = Object.entries(perYear).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]
const stats = [
  ['EVENTS RUN', pad(posts.length, 3), 'blog posts'],
  ['QUICK RACES', pad(notes.length, 3), 'notes'],
  ['PARTS INSTALLED', pad(parts.length, 3), 'projects'],
  ['CREW JOBS', pad(crew.length, 3), 'posts on vercel.com'],
  ['CAREER SPAN', `${Math.min(...years)}–${Math.max(...years)}`, `${Math.max(...years) - Math.min(...years) + 1} seasons`],
  ['BEST SEASON', best[0], `${best[1]} events`],
  ['ACTIVE SEASONS', pad(Object.keys(perYear).length, 2), 'years with a post'],
  ['LATEST EVENT', posts[0].date.toUpperCase(), posts[0].title],
]
const tipRe = /^(pin|ship|you should|how to|easy ways|implementing|building|formatting|why your|live updating|vibe-coding|never|set your|updating|sending|swr|loading)/i
const tips = [...posts, ...notes].filter((p) => tipRe.test(p.title)).map((p) => p.title)

// --- markup
const stars = (n, label = 'Difficulty') => `<span class="stars" role="img" aria-label="${label} ${n} of 5">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(5 - n)}</span>`
const careerList = posts.map((p) => `<li><a class="row ev" href="${esc(p.href)}" data-i="${p.i}" aria-describedby="ev-card"><span class="row-n" aria-hidden="true">${pad(p.i + 1)}</span><span class="row-t">${esc(p.title)}</span><span class="row-d"><span class="sr-only">, </span>${esc(p.date)}</span></a></li>`).join('\n')
const quickList = notes.map((n) => `<li><a class="row qr" href="${esc(n.href)}" data-i="${n.i}" aria-describedby="qr-card"><span class="row-n" aria-hidden="true">P${n.i + 1}</span><span class="row-t">${esc(n.title)}</span><span class="row-lap"><span class="sr-only">, best lap </span>${n.lap}</span><span class="row-d"><span class="sr-only">, </span>${esc(n.date)}</span><svg class="spark" viewBox="0 0 80 20" aria-hidden="true"><polyline points="${n.spark.map((v, k) => `${k * 10},${v + 1}`).join(' ')}"/></svg></a></li>`).join('\n')
const PART_ICON = {
  'ECU CHIP': '<rect x="7" y="7" width="18" height="18" rx="2"/><path d="M11 3v4M16 3v4M21 3v4M11 25v4M16 25v4M21 25v4M3 11h4M3 16h4M3 21h4M25 11h4M25 16h4M25 21h4"/>',
  'ENGINE BLOCK': '<path d="M5 12h4l3-3h8l2 3h5v10h-5l-2 3h-8l-3-3H5z"/><path d="M12 9V5h8v4"/>',
  NITROUS: '<rect x="10" y="7" width="12" height="22" rx="5"/><path d="M13 7V3h6v4M16 12v8"/>',
  TURBO: '<circle cx="16" cy="16" r="10"/><path d="M16 6c4 4 4 6 0 10s-4 6 0 10M6 16c4-4 6-4 10 0s6 4 10 0"/>',
  'AUDIO SYSTEM': '<rect x="6" y="4" width="20" height="24" rx="2"/><circle cx="16" cy="19" r="5"/><circle cx="16" cy="9" r="2"/>',
  INTAKE: '<path d="M4 10h14l8 6-8 6H4z"/><path d="M8 13h8M8 19h8"/>',
  SUSPENSION: '<path d="M16 3v4M11 7h10M12 10l8 3-8 3 8 3-8 3M11 25h10M16 25v4"/>',
  TRANSMISSION: '<circle cx="10" cy="10" r="3"/><circle cx="22" cy="10" r="3"/><circle cx="10" cy="22" r="3"/><circle cx="22" cy="22" r="3"/><path d="M10 13v6M22 13v6M10 16h12"/>',
  EXHAUST: '<path d="M3 18h16l4-4h6v8h-6l-4-4"/><circle cx="26" cy="18" r="2"/>',
  'BODY KIT': '<path d="M3 20l5-7h12l6 4h3v5H3z"/><circle cx="9" cy="22" r="3"/><circle cx="23" cy="22" r="3"/>',
  BRAKES: '<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="4"/><path d="M24 8a11 11 0 0 1 2 6h-5"/>',
  SPOILER: '<path d="M3 10h26v4H3zM9 14v8M23 14v8"/>',
}
const icon = (t) => `<svg class="ico" viewBox="0 0 32 32" aria-hidden="true">${PART_ICON[t] || PART_ICON.SPOILER}</svg>`
const garageList = parts.map((p) => `<li><a class="row pt" href="${esc(p.href)}"${p.ext ? ' rel="noopener" target="_blank"' : ''} data-i="${p.i}" aria-describedby="pt-card">${icon(p.type)}<span class="row-k">${p.type}</span><span class="row-t">${esc(p.title)}</span>${p.ext ? '<span class="sr-only"> (opens in a new tab)</span>' : ''}</a></li>`).join('\n')
const helmet = (hue) => `<svg class="helm" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="hg${hue}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 90% 70%)"/><stop offset=".5" stop-color="hsl(${hue} 85% 42%)"/><stop offset="1" stop-color="hsl(${hue} 80% 18%)"/></linearGradient></defs><path d="M8 38C8 20 20 8 34 8c13 0 22 10 22 24v8c0 6-4 10-10 10H20l-6-6H8z" fill="url(#hg${hue})" stroke="#dfe8f5" stroke-width="2"/><path d="M26 26h28v10c0 2-2 4-4 4H30c-3 0-4-2-4-4z" fill="#05070c" stroke="#9fb2c8" stroke-width="1.5"/><path d="M30 29h20" stroke="hsl(${(hue + 180) % 360} 100% 70%)" stroke-width="2"/><path d="M12 30c6-12 14-16 22-17" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none"/></svg>`
const crewList = crew.map((c) => `<li><a class="card crew-c" href="${esc(c.href)}" rel="noopener" target="_blank" data-i="${c.i}" style="--h:${c.hue}">${helmet(c.hue)}<span class="cc-call">${esc(c.callsign)}</span><span class="cc-t">${esc(c.title)}</span><span class="cc-meta"><span class="cc-st">${c.status}</span> <span class="sr-only">, </span>${esc(c.date)}</span><span class="cc-rep" aria-hidden="true"><i style="width:${c.rep}%"></i></span><span class="sr-only"> (opens in a new tab)</span></a></li>`).join('\n')
const statRows = stats.map(([k, v, s]) => `<div class="st-row"><dt>${k}</dt><dd><b>${esc(v)}</b><small>${esc(s)}</small></dd></div>`).join('\n')
const bar = Array.from({ length: 34 }, (_, k) => { const h = hash('ml' + k); return `<rect x="${k * 6}" y="0" width="${1 + (h % 4)}" height="40"/>` }).join('')

// map (decorative; the list beside it is the accessible version)
function map() {
  const blocks = []
  for (const d of DISTRICTS) {
    const [x0, y0, x1, y1] = d.box
    const rot = ((hash(d.id) % 9) - 4) * 0.6
    let g = ''
    for (let x = x0 + 20; x < x1 - 30; x += 40) for (let y = y0 + 40; y < y1 - 20; y += 40) {
      const h = hash(d.id + x + ',' + y)
      if (h % 11 === 0) continue
      const w = 32 - (h % 3) * 4, hh = 32 - ((h >> 3) % 3) * 4
      g += `<rect x="${x + 4}" y="${y + 4}" width="${w}" height="${hh}" class="${h % 7 === 0 ? 'bk park' : 'bk'}"/>`
    }
    blocks.push(`<g class="dist" data-d="${d.id}" transform="rotate(${rot} ${(x0 + x1) / 2} ${(y0 + y1) / 2})"><rect class="dzone" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="6"/>${g}<text class="dlabel" x="${x0 + 12}" y="${y0 + 26}">${d.name}</text></g>`)
  }
  const markers = posts.map((p) => `<g class="mk" data-i="${p.i}" transform="translate(${p.x} ${p.y})"><path class="mk-d" d="M0 -11 L11 0 L0 11 L-11 0Z"/><text class="mk-n" y="4">${p.i + 1}</text></g>`).join('')
  const routes = posts.map((p) => `<path class="rt" data-i="${p.i}" d="${p.route}"/>`).join('')
  return `<svg class="map-svg" viewBox="0 0 1000 600" aria-hidden="true" focusable="false">
<defs><radialGradient id="mapglow" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="#0d2a44"/><stop offset="1" stop-color="#03060c"/></radialGradient>
<filter id="mglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<pattern id="mgrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#1a3a5c" stroke-width=".6"/></pattern></defs>
<rect width="1000" height="600" fill="url(#mapglow)"/><rect width="1000" height="600" fill="url(#mgrid)" opacity=".5"/>
<path class="water" d="M0 286 C120 270 220 300 350 288 C420 282 470 300 520 286 C640 254 700 300 1000 292 L1000 304 C700 312 640 268 520 300 C470 314 420 296 350 302 C220 314 120 284 0 300Z"/>
<path class="water" d="M640 600 C700 560 820 570 1000 548 L1000 600Z"/>
${blocks.join('\n')}
<path class="hwy" d="M20 580 C200 520 300 590 500 575 S820 470 990 520"/>
<path class="hwy" d="M350 0 C360 160 330 300 350 420 S340 560 360 600"/>
<path class="hwy" d="M650 0 C660 140 640 300 652 600"/>
<g class="routes">${routes}</g>
<g class="hq" transform="translate(${HQ[0]} ${HQ[1]})"><rect x="-26" y="-12" width="52" height="24" rx="3"/><text y="5">HQ</text></g>
${markers}
<g class="compass" transform="translate(955 560)"><circle r="20"/><path d="M0 -16 L5 0 L0 16 L-5 0Z"/><text y="-24">N</text></g>
</svg>`
}

const data = {
  posts: posts.map(({ html, route, density, ...p }) => p), notes: notes.map(({ html, spark, ...n }) => n),
  parts, crew, tips, site: C.site,
}
const templates = [
  ...posts.map((p) => `<template id="ex-p${p.i}">${p.html}</template>`),
  ...notes.map((n) => `<template id="ex-n${n.i}">${n.html}</template>`),
].join('\n')

const MENU = [
  ['career', 'Career', `${posts.length} events`, `${posts.length} events across ${DISTRICTS.length} districts. Every blog post is a race; pick one on the city map.`],
  ['quick', 'Quick Race', `${notes.length} sprints`, `${notes.length} short sprints: notes, snippets and one-liners. No story, just go.`],
  ['garage', 'Garage', `${parts.length} parts`, `${parts.length} parts on the lift. Projects rated, tuned and repainted.`],
  ['crew', 'Crew', `${crew.length} jobs`, `Multiplayer: ${crew.length} jobs pulled with the crew at Vercel.`],
  ['profile', 'Profile', 'driver card', 'Driver card, career stats computed from the save file, and how to get in touch.'],
  ['options', 'Options', 'a/v · motion', 'Sound, music, motion and render quality.'],
]
const menuList = MENU.map(([id, l, s, d], i) => `<li><a class="bar" href="#s-${id}" data-go="${id}" data-i="${i}" data-desc="${esc(d)}"><span class="bar-n" aria-hidden="true">${pad(i + 1)}</span><span class="bar-l">${l}</span><span class="bar-s"><span class="sr-only">, </span>${s}</span><svg class="bar-chev" viewBox="0 0 36 20" aria-hidden="true"><path d="M0 0h6l8 10-8 10H0l8-10zM11 0h6l8 10-8 10h-6l8-10zM22 0h6l8 10-8 10h-6l8-10z"/></svg></a></li>`).join('\n')

let html = readFileSync(here('src/index.html'), 'utf8')
const R = {
  CSS: readFileSync(here('src/style.css'), 'utf8'),
  JS: ['scene.js', 'audio.js', 'app.js'].map((f) => readFileSync(here('src/' + f), 'utf8')).join('\n'),
  DATA: JSON.stringify(data).replace(/</g, '\\u003c'),
  MENU: menuList, CAREER: careerList, QUICK: quickList, GARAGE: garageList, CREW: crewList, STATS: statRows, MAP: map(),
  TEMPLATES: templates, BARCODE: bar, BLURB: esc(C.site.blurb), NPOSTS: posts.length, NNOTES: notes.length, NPARTS: parts.length, NCREW: crew.length,
  SPAN: `${Math.min(...years)}–${Math.max(...years)}`, GITHUB: esc(C.site.github), X: esc(C.site.x), TIP0: esc(tips[0] || ''),
  LIC: 'ML-' + pad(hash(C.site.name) % 100000, 5) + '-' + Math.max(...years),
}
html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in R ? String(R[k]) : m))
writeFileSync(here('index.html'), html)
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB', { posts: posts.length, notes: notes.length, parts: parts.length, crew: crew.length, tips: tips.length })
