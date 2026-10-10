/* Channel previews. Each renderer is (ctx, w, h, t, state) and draws a whole
   frame in CSS pixels; the caller has already scaled for devicePixelRatio.
   The same function draws the tiny tile and the full-screen splash. */
const FONT = '"M PLUS Rounded 1c", "Nunito", "Varela Round", ui-rounded, system-ui, sans-serif'
const TAU = Math.PI * 2
const R = {}

function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2))
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}
const font = (c, px, wt = 800) => (c.font = `${wt} ${px.toFixed(1)}px ${FONT}`)
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/** Channel label: white, fat coloured outline, soft drop. */
function label(c, text, x, y, px, color) {
  font(c, px, 800)
  c.textBaseline = 'alphabetic'
  c.textAlign = 'left'
  c.lineJoin = 'round'
  c.lineWidth = px * 0.3
  c.strokeStyle = 'rgba(0,0,0,.12)'
  c.strokeText(text, x, y + px * 0.07)
  c.strokeStyle = color
  c.strokeText(text, x, y)
  const g = c.createLinearGradient(0, y - px, 0, y)
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#f1f4f7')
  c.fillStyle = g
  c.fillText(text, x, y)
}

const wrapCache = new Map()
function wrap(c, text, maxW, maxLines = 3) {
  const key = c.font + '|' + Math.round(maxW) + '|' + maxLines + '|' + text
  let lines = wrapCache.get(key)
  if (lines) return lines
  lines = []
  let cur = ''
  for (const word of text.split(/\s+/)) {
    const next = cur ? cur + ' ' + word : word
    if (c.measureText(next).width > maxW && cur) { lines.push(cur); cur = word } else cur = next
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines)
    let l = lines[maxLines - 1]
    while (l.length > 1 && c.measureText(l + '…').width > maxW) l = l.slice(0, -1)
    lines[maxLines - 1] = l.replace(/\s+\S*$/, '') + '…'
  }
  if (wrapCache.size > 600) wrapCache.clear()
  wrapCache.set(key, lines)
  return lines
}

function vgrad(c, h, a, b, y0 = 0) {
  const g = c.createLinearGradient(0, y0, 0, h)
  g.addColorStop(0, a); g.addColorStop(1, b)
  return g
}
const K = (w, h) => Math.min(h / 140, w / 250)

/* ------------------------------------------------------------- Blog */
R.blog = (c, w, h, t) => {
  const k = K(w, h), P = DATA.posts
  c.fillStyle = vgrad(c, h, '#fffaf1', '#ffe6c4'); c.fillRect(0, 0, w, h)
  c.fillStyle = 'rgba(240,138,36,.09)'
  const sp = 14 * k, off = (t * 3 * k) % sp
  for (let y = -sp; y < h + sp; y += sp) for (let x = -sp; x < w + sp; x += sp) {
    c.beginPath(); c.arc(x + off + ((y / sp) & 1 ? sp / 2 : 0), y + off, 1.6 * k, 0, TAU); c.fill()
  }
  const bw = Math.min(w * 0.58, h * 1.2), bh = bw * 0.62, pw = bw / 2
  const cx = w - bw / 2 - 16 * k, cy = h * 0.6, top = cy - bh / 2
  // cover + shadow
  c.save(); c.shadowColor = 'rgba(120,70,20,.28)'; c.shadowBlur = 10 * k; c.shadowOffsetY = 4 * k
  rr(c, cx - pw - 5 * k, top - 4 * k, bw + 10 * k, bh + 10 * k, 7 * k)
  c.fillStyle = vgrad(c, top + bh + 6 * k, '#4b95e6', '#2f6fc0', top); c.fill(); c.restore()

  const period = 3.4, ph = t / period, n = Math.floor(ph), p = ph - n
  const f = p > 0.5 ? ease((p - 0.5) / 0.5) : 0
  const post = (j) => P[(((n * 2 + j) % P.length) + P.length) % P.length]
  function page(x, item, side, shade) {
    c.save()
    rr(c, x, top, pw, bh, 3 * k)
    const g = c.createLinearGradient(x, 0, x + pw, 0)
    if (side < 0) { g.addColorStop(0, '#fffefb'); g.addColorStop(0.85, '#fbf6ec'); g.addColorStop(1, '#e9e0cf') }
    else { g.addColorStop(0, '#e9e0cf'); g.addColorStop(0.15, '#fbf6ec'); g.addColorStop(1, '#fffefb') }
    c.fillStyle = g; c.fill(); c.clip()
    const px = x + 9 * k, iw = pw - 18 * k
    font(c, 6.4 * k, 700); c.fillStyle = '#f08a24'; c.textBaseline = 'top'; c.textAlign = 'left'
    c.fillText(item.date.toUpperCase(), px, top + 8 * k)
    font(c, 8.6 * k, 800); c.fillStyle = '#3b3f46'
    const lines = wrap(c, item.t, iw, 3)
    lines.forEach((l, i) => c.fillText(l, px, top + 17 * k + i * 10.5 * k))
    c.fillStyle = 'rgba(80,90,100,.16)'
    let ly = top + 22 * k + lines.length * 10.5 * k
    for (let i = 0; ly < top + bh - 8 * k; i++, ly += 6.5 * k) rr(c, px, ly, iw * (i % 3 === 2 ? 0.6 : 0.95), 2.4 * k, 1.2 * k), c.fill()
    if (shade) { c.fillStyle = `rgba(60,40,10,${shade})`; c.fillRect(x, top, pw, bh) }
    c.restore()
  }
  page(cx - pw, post(0), -1, 0)
  page(cx, f > 0 ? post(3) : post(1), 1, 0)
  if (f > 0) {
    const sx = Math.cos(f * Math.PI)
    c.save(); c.translate(cx, 0)
    if (sx > 0) { c.scale(sx, 1); page(0, post(1), 1, (1 - sx) * 0.25) }
    else { c.scale(-sx, 1); page(-pw, post(2), -1, (1 + sx) * 0.25) }
    c.restore()
    c.save(); c.globalAlpha = Math.sin(f * Math.PI) * 0.25
    c.fillStyle = '#000'; c.filter = 'none'
    c.fillRect(cx - 1 * k, top, 2 * k, bh); c.restore()
  }
  const sg = c.createLinearGradient(cx - 8 * k, 0, cx + 8 * k, 0)
  sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.5, 'rgba(90,60,20,.22)'); sg.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = sg; c.fillRect(cx - 8 * k, top, 16 * k, bh)
  label(c, 'Blog', 12 * k, 30 * k, 24 * k, '#f08a24')
  font(c, 8.5 * k, 700); c.fillStyle = 'rgba(150,90,30,.75)'; c.textBaseline = 'alphabetic'
  c.fillText(P.length + ' posts', 14 * k, 43 * k)
}

/* ------------------------------------------------------------- Notes */
R.notes = (c, w, h, t) => {
  const k = K(w, h), N = DATA.notes
  c.fillStyle = vgrad(c, h, '#f1fbf5', '#d6f0df'); c.fillRect(0, 0, w, h)
  c.strokeStyle = 'rgba(47,174,107,.10)'; c.lineWidth = 1
  for (let x = 0; x < w; x += 12 * k) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke() }
  for (let y = 0; y < h; y += 12 * k) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke() }
  const cycle = 4.4, n = Math.floor(t / cycle), local = t - n * cycle, active = ((n % 3) + 3) % 3
  const s = Math.min(h * 0.58, w * 0.28)
  const slots = [
    [w * 0.25, h * 0.64, -0.09, '#ffe768', '#f7d93c'],
    [w * 0.53, h * 0.6, 0.05, '#ffc4d8', '#f9a9c4'],
    [w * 0.8, h * 0.64, -0.035, '#bfe5ff', '#9dd3f8'],
  ]
  slots.forEach(([x, y, rot, col, col2], j) => {
    let m = n - ((active - j + 3) % 3)
    const item = N[(((m % N.length) + N.length) % N.length)]
    const isActive = j === active
    const lift = isActive ? Math.min(1, local * 4) * (local > cycle - 0.3 ? (cycle - local) / 0.3 : 1) : 0
    c.save()
    c.translate(x, y - lift * 3 * k)
    c.rotate(rot + Math.sin(t * 1.3 + j) * 0.012)
    c.scale(1 + lift * 0.05, 1 + lift * 0.05)
    c.shadowColor = 'rgba(30,60,40,.25)'; c.shadowBlur = (6 + lift * 6) * k; c.shadowOffsetY = (3 + lift * 3) * k
    c.beginPath()
    c.moveTo(-s / 2, -s / 2); c.lineTo(s / 2, -s / 2); c.lineTo(s / 2, s / 2 - 9 * k)
    c.lineTo(s / 2 - 9 * k, s / 2); c.lineTo(-s / 2, s / 2); c.closePath()
    c.fillStyle = vgrad(c, s / 2, col, col2, -s / 2); c.fill()
    c.shadowColor = 'transparent'
    c.beginPath(); c.moveTo(s / 2, s / 2 - 9 * k); c.lineTo(s / 2 - 9 * k, s / 2 - 9 * k); c.lineTo(s / 2 - 9 * k, s / 2); c.closePath()
    c.fillStyle = 'rgba(0,0,0,.12)'; c.fill()
    c.save(); c.rotate(0.05 - rot * 0.6)
    c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-s * 0.2, -s / 2 - 4 * k, s * 0.4, 9 * k); c.restore()
    font(c, 7.6 * k, 700); c.fillStyle = '#4a3f2a'; c.textBaseline = 'top'; c.textAlign = 'left'
    let text = item.t
    if (isActive) text = text.slice(0, Math.floor(Math.max(0, local - 0.25) * 18))
    const lines = text ? wrap(c, isActive ? item.t : text, s - 14 * k, 5) : []
    let remaining = text.length, lastX = -s / 2 + 7 * k, lastY = -s / 2 + 9 * k
    lines.forEach((l, i) => {
      const shown = isActive ? l.slice(0, Math.max(0, remaining)) : l
      remaining -= l.length + 1
      const ly = -s / 2 + 9 * k + i * 9.6 * k
      c.fillText(shown, -s / 2 + 7 * k, ly)
      if (shown.length) { lastX = -s / 2 + 7 * k + c.measureText(shown).width; lastY = ly }
    })
    if (isActive && Math.floor(t * 2.6) % 2 === 0) { c.fillStyle = '#2fae6b'; c.fillRect(lastX + 1 * k, lastY, 1.4 * k, 8 * k) }
    c.restore()
  })
  label(c, 'Notes', 12 * k, 30 * k, 24 * k, '#2fae6b')
}

/* ------------------------------------------------------------- Projects */
const SHAPES = (() => {
  const cube = { v: [], f: [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]] }
  for (let i = 0; i < 8; i++) cube.v.push([i & 4 ? 1 : -1, i & 2 ? 1 : -1, i & 1 ? 1 : -1])
  const oct = { v: [[1.35, 0, 0], [-1.35, 0, 0], [0, 1.35, 0], [0, -1.35, 0], [0, 0, 1.35], [0, 0, -1.35]], f: [] }
  for (const a of [0, 1]) for (const b of [2, 3]) for (const cc of [4, 5]) oct.f.push([a, b, cc])
  const prism = { v: [], f: [] }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; prism.v.push([Math.cos(a) * 1.15, -0.8, Math.sin(a) * 1.15]) }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; prism.v.push([Math.cos(a) * 1.15, 0.8, Math.sin(a) * 1.15]) }
  prism.f.push([0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11])
  for (let i = 0; i < 6; i++) prism.f.push([i, (i + 1) % 6, 6 + ((i + 1) % 6), 6 + i])
  return [cube, oct, prism]
})()
const LIGHT = (() => { const l = [-0.45, -0.75, -0.5], m = Math.hypot(...l); return l.map((x) => x / m) })()

function solid(c, shape, cx, cy, size, ax, ay, rgb) {
  const ca = Math.cos(ay), sa = Math.sin(ay), cb = Math.cos(ax), sb = Math.sin(ax)
  const pts = shape.v.map(([x, y, z]) => {
    let x1 = x * ca + z * sa, z1 = -x * sa + z * ca
    let y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb
    const p = 4.2 / (z2 + 5)
    return { x: cx + x1 * size * p, y: cy + y1 * size * p, X: x1, Y: y1, Z: z2 }
  })
  const faces = shape.f.map((f) => {
    const a = pts[f[0]], b = pts[f[1]], d = pts[f[2]]
    let nx = (b.Y - a.Y) * (d.Z - a.Z) - (b.Z - a.Z) * (d.Y - a.Y)
    let ny = (b.Z - a.Z) * (d.X - a.X) - (b.X - a.X) * (d.Z - a.Z)
    let nz = (b.X - a.X) * (d.Y - a.Y) - (b.Y - a.Y) * (d.X - a.X)
    let mx = 0, my = 0, mz = 0
    for (const i of f) { mx += pts[i].X; my += pts[i].Y; mz += pts[i].Z }
    if (nx * mx + ny * my + nz * mz < 0) { nx = -nx; ny = -ny; nz = -nz }
    const nm = Math.hypot(nx, ny, nz) || 1
    const lam = Math.max(0, (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / nm)
    return { f, z: mz / f.length, s: 0.62 + lam * 0.62 }
  }).sort((a, b) => b.z - a.z)
  for (const fc of faces) {
    c.beginPath()
    fc.f.forEach((i, j) => (j ? c.lineTo(pts[i].x, pts[i].y) : c.moveTo(pts[i].x, pts[i].y)))
    c.closePath()
    const s = fc.s
    const col = s <= 1 ? rgb.map((v) => v * s) : rgb.map((v) => v + (255 - v) * (s - 1) * 1.4)
    c.fillStyle = `rgb(${col.map((v) => clamp(v, 0, 255) | 0).join(',')})`
    c.fill()
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.8; c.lineJoin = 'round'; c.stroke()
  }
}

R.projects = (c, w, h, t) => {
  const k = K(w, h), P = DATA.projects
  c.fillStyle = vgrad(c, h, '#e4efff', '#fbfdff'); c.fillRect(0, 0, w, h)
  const fl = c.createLinearGradient(0, h * 0.7, 0, h)
  fl.addColorStop(0, 'rgba(138,90,214,0)'); fl.addColorStop(1, 'rgba(138,90,214,.12)')
  c.fillStyle = fl; c.fillRect(0, h * 0.7, w, h * 0.3)
  const sz = Math.min(h * 0.17, w * 0.1)
  const items = [[w * 0.24, '#4f9ef0', [79, 158, 240], 0], [w * 0.52, '#ff9b42', [255, 155, 66], 1], [w * 0.8, '#5fcf86', [95, 207, 134], 2]]
  items.forEach(([x, _, rgb, i]) => {
    const bob = Math.sin(t * 1.7 + i * 2) * 4 * k, y = h * 0.53 + bob
    c.fillStyle = `rgba(60,40,110,${0.16 - bob / k * 0.008})`
    c.beginPath(); c.ellipse(x, h * 0.53 + sz * 1.55, sz * (1.05 - bob / k * 0.02), sz * 0.24, 0, 0, TAU); c.fill()
    solid(c, SHAPES[i], x, y, sz, 0.45 + Math.sin(t * 0.6 + i) * 0.3, t * (0.8 + i * 0.25) + i, rgb)
  })
  const cyc = 2.6, idx = Math.floor(t / cyc) % P.length, lt = (t % cyc) / cyc
  const a = Math.min(1, lt * 8, (1 - lt) * 8)
  font(c, 9 * k, 800)
  const name = P[idx].t.length > 28 ? P[idx].t.slice(0, 26) + '…' : P[idx].t
  const tw = c.measureText(name).width + 22 * k
  c.save(); c.globalAlpha = a
  rr(c, w / 2 - tw / 2, h - 23 * k + (1 - a) * 4 * k, tw, 16 * k, 8 * k)
  c.fillStyle = 'rgba(255,255,255,.92)'; c.fill(); c.strokeStyle = 'rgba(138,90,214,.45)'; c.lineWidth = 1.2 * k; c.stroke()
  c.fillStyle = '#6b44b8'; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.fillText(name, w / 2, h - 15 * k + (1 - a) * 4 * k); c.restore()
  label(c, 'Projects', 12 * k, 30 * k, 24 * k, '#8a5ad6')
}

/* ------------------------------------------------------------- Work */
R.work = (c, w, h, t) => {
  const k = K(w, h), W = DATA.work
  c.fillStyle = vgrad(c, h, '#f5f8fc', '#e3ebf5'); c.fillRect(0, 0, w, h)
  const hb = 30 * k, tk = 17 * k
  c.fillStyle = vgrad(c, hb, '#3a82e0', '#1e52a3'); c.fillRect(0, 0, w, hb)
  c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, 0, w, hb * 0.45)
  font(c, 17 * k, 800); c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.textAlign = 'left'
  c.fillText('Work', 11 * k, hb / 2 + 1 * k)
  const ww = c.measureText('Work').width
  font(c, 7.5 * k, 700); c.fillStyle = 'rgba(255,255,255,.78)'
  c.fillText('writing & launches', 17 * k + ww, hb / 2 + 2 * k)
  // live pill
  font(c, 7.5 * k, 800)
  const lw = 34 * k, lx = w - lw - 9 * k
  rr(c, lx, hb / 2 - 7 * k, lw, 14 * k, 7 * k); c.fillStyle = 'rgba(255,255,255,.95)'; c.fill()
  c.fillStyle = Math.sin(t * 5) > -0.3 ? '#ff4d4d' : '#ffb3b3'
  c.beginPath(); c.arc(lx + 8 * k, hb / 2, 3 * k, 0, TAU); c.fill()
  c.fillStyle = '#1e52a3'; c.fillText('LIVE', lx + 13 * k, hb / 2 + 0.5 * k)
  // cards
  const ch = 38 * k, gap = 6 * k, step = ch + gap, total = step * W.length
  const off = (t * 9 * k) % total
  c.save(); c.beginPath(); c.rect(0, hb, w, h - hb - tk); c.clip()
  for (let rep = 0; rep < 2; rep++) W.forEach((it, i) => {
    const y = hb + 7 * k + i * step + rep * total - off
    if (y > h || y + ch < hb) return
    c.save(); c.shadowColor = 'rgba(20,50,100,.15)'; c.shadowBlur = 4 * k; c.shadowOffsetY = 1.5 * k
    rr(c, 9 * k, y, w - 18 * k, ch, 7 * k); c.fillStyle = '#fff'; c.fill(); c.restore()
    rr(c, 9 * k, y, 4 * k, ch, 2 * k); c.fillStyle = '#3a82e0'; c.fill()
    font(c, 6.5 * k, 800); c.fillStyle = '#3a82e0'; c.textBaseline = 'top'
    c.fillText(it.date.toUpperCase(), 19 * k, y + 6 * k)
    font(c, 8.8 * k, 800); c.fillStyle = '#29313c'
    wrap(c, it.t, w - 40 * k, 2).forEach((l, j) => c.fillText(l, 19 * k, y + 15 * k + j * 10 * k))
  })
  c.restore()
  const fade = c.createLinearGradient(0, hb, 0, hb + 10 * k)
  fade.addColorStop(0, 'rgba(0,0,0,.18)'); fade.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = fade; c.fillRect(0, hb, w, 10 * k)
  // ticker
  c.fillStyle = vgrad(c, h, '#22324d', '#141f33', h - tk); c.fillRect(0, h - tk, w, tk)
  font(c, 8 * k, 700); c.fillStyle = '#e8f1ff'; c.textBaseline = 'middle'
  const tick = W.map((x) => x.t).join('   •   ') + '   •   '
  const tw = c.measureText(tick).width, tx = -((t * 28 * k) % tw)
  c.fillText(tick, tx, h - tk / 2 + 0.5 * k); c.fillText(tick, tx + tw, h - tk / 2 + 0.5 * k)
}

/* ------------------------------------------------------------- About: an original little "pal" */
function pal(c, cx, base, s, t, opts = {}) {
  const wave = opts.wave !== false
  const headR = s * 0.5, hy = base - s * 1.32
  const tilt = wave ? Math.sin(t * 3.4) * 0.05 : 0
  // body
  c.save()
  const bw = s * 1.15
  c.beginPath()
  c.moveTo(cx - bw / 2, base + s * 0.2)
  c.bezierCurveTo(cx - bw / 2, base - s * 0.55, cx - bw * 0.36, base - s * 0.8, cx, base - s * 0.8)
  c.bezierCurveTo(cx + bw * 0.36, base - s * 0.8, cx + bw / 2, base - s * 0.55, cx + bw / 2, base + s * 0.2)
  c.closePath()
  const bg = c.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0)
  bg.addColorStop(0, '#ff9a52'); bg.addColorStop(0.6, '#ff7f33'); bg.addColorStop(1, '#ec6a20')
  c.fillStyle = bg; c.fill()
  // hood rim + strings
  c.strokeStyle = '#e8661f'; c.lineWidth = s * 0.08; c.lineCap = 'round'
  c.beginPath(); c.arc(cx, base - s * 0.86, s * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke()
  c.strokeStyle = '#fff6ec'; c.lineWidth = s * 0.035
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(cx + d * s * 0.1, base - s * 0.62); c.lineTo(cx + d * s * 0.12, base - s * 0.36); c.stroke() }
  c.restore()
  // waving arm (character's left, viewer's right)
  const sx = cx + bw * 0.4, sy = base - s * 0.55
  const ang = wave ? -0.8 + Math.sin(t * 7.5) * 0.1 : 1.25
  const ex = sx + Math.cos(ang) * s * 0.4, ey = sy + Math.sin(ang) * s * 0.4
  const ang2 = wave ? -1.45 + Math.sin(t * 7.5 + 0.7) * 0.42 : 1.45
  const hx = ex + Math.cos(ang2) * s * 0.36, hyy = ey + Math.sin(ang2) * s * 0.36
  c.strokeStyle = '#f57a2f'; c.lineWidth = s * 0.24; c.lineCap = 'round'; c.lineJoin = 'round'
  c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(hx, hyy); c.stroke()
  c.fillStyle = '#ffd6b0'; c.beginPath(); c.arc(hx, hyy, s * 0.15, 0, TAU); c.fill()
  c.fillStyle = '#ffd6b0'; c.beginPath(); c.ellipse(hx + Math.cos(ang2 - 1.2) * s * 0.13, hyy + Math.sin(ang2 - 1.2) * s * 0.13, s * 0.05, s * 0.08, ang2, 0, TAU); c.fill()
  // head
  c.save(); c.translate(cx, hy); c.rotate(tilt)
  c.fillStyle = '#ffd6b0'
  for (const d of [-1, 1]) { c.beginPath(); c.arc(d * headR * 0.95, headR * 0.12, headR * 0.17, 0, TAU); c.fill() }
  const hg = c.createRadialGradient(-headR * 0.3, -headR * 0.35, headR * 0.2, 0, 0, headR * 1.05)
  hg.addColorStop(0, '#ffe4c8'); hg.addColorStop(1, '#f9c79c')
  c.fillStyle = hg; c.beginPath(); c.ellipse(0, 0, headR * 0.98, headR, 0, 0, TAU); c.fill()
  // hair: a soft cap with a swoop and a cowlick
  c.fillStyle = '#4a2f23'
  c.beginPath()
  c.moveTo(-headR * 1.0, headR * 0.05)
  c.bezierCurveTo(-headR * 1.12, -headR * 0.95, -headR * 0.3, -headR * 1.22, headR * 0.25, -headR * 1.1)
  c.bezierCurveTo(headR * 0.9, -headR * 1.0, headR * 1.12, -headR * 0.45, headR * 1.0, headR * 0.05)
  c.bezierCurveTo(headR * 0.9, -headR * 0.35, headR * 0.6, -headR * 0.55, headR * 0.15, -headR * 0.5)
  c.bezierCurveTo(-headR * 0.25, -headR * 0.42, -headR * 0.55, -headR * 0.62, -headR * 0.7, -headR * 0.3)
  c.bezierCurveTo(-headR * 0.82, -headR * 0.1, -headR * 0.9, 0, -headR * 1.0, headR * 0.05)
  c.fill()
  c.strokeStyle = '#4a2f23'; c.lineWidth = headR * 0.13; c.lineCap = 'round'
  c.beginPath(); c.moveTo(headR * 0.05, -headR * 1.08); c.quadraticCurveTo(headR * 0.1, -headR * 1.45, headR * 0.42, -headR * 1.38); c.stroke()
  c.fillStyle = 'rgba(255,255,255,.18)'
  c.beginPath(); c.ellipse(-headR * 0.35, -headR * 0.85, headR * 0.28, headR * 0.09, -0.35, 0, TAU); c.fill()
  // glasses + eyes
  const blink = (t % 3.7) < 0.12 ? 0.12 : 1
  for (const d of [-1, 1]) {
    c.fillStyle = '#2b2730'
    c.beginPath(); c.ellipse(d * headR * 0.36, headR * 0.02, headR * 0.075, headR * 0.11 * blink, 0, 0, TAU); c.fill()
    c.fillStyle = '#fff'; c.beginPath(); c.arc(d * headR * 0.36 + headR * 0.025, -headR * 0.03, headR * 0.025 * blink, 0, TAU); c.fill()
    c.strokeStyle = '#33303a'; c.lineWidth = headR * 0.07
    c.beginPath(); c.arc(d * headR * 0.36, headR * 0.02, headR * 0.24, 0, TAU); c.stroke()
    c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.arc(d * headR * 0.36 - headR * 0.08, -headR * 0.06, headR * 0.07, 0, TAU); c.fill()
  }
  c.beginPath(); c.moveTo(-headR * 0.13, -headR * 0.0); c.quadraticCurveTo(0, -headR * 0.08, headR * 0.13, 0); c.stroke()
  c.fillStyle = 'rgba(255,120,120,.32)'
  for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * headR * 0.6, headR * 0.38, headR * 0.15, headR * 0.09, 0, 0, TAU); c.fill() }
  // mouth
  const open = wave ? 0.5 + 0.5 * Math.sin(t * 3.4) : 0
  c.fillStyle = '#b5413b'
  c.beginPath(); c.moveTo(-headR * 0.2, headR * 0.45)
  c.quadraticCurveTo(0, headR * (0.62 + open * 0.14), headR * 0.2, headR * 0.45)
  c.quadraticCurveTo(0, headR * (0.5 + open * 0.03), -headR * 0.2, headR * 0.45); c.fill()
  c.restore()
}

function cloud(c, x, y, s) {
  c.beginPath()
  c.arc(x, y, s, 0, TAU); c.arc(x + s * 1.1, y - s * 0.35, s * 1.15, 0, TAU)
  c.arc(x + s * 2.2, y, s * 0.9, 0, TAU); c.rect(x, y, s * 2.2, s * 0.9)
  c.fill()
}

R.about = (c, w, h, t) => {
  const k = K(w, h)
  c.fillStyle = vgrad(c, h, '#9fd8ff', '#eaf8ff'); c.fillRect(0, 0, w, h)
  c.fillStyle = 'rgba(255,255,255,.85)'
  cloud(c, ((t * 6 * k) % (w + 80 * k)) - 50 * k, h * 0.3, 9 * k)
  cloud(c, ((t * 4 * k + w * 0.6) % (w + 80 * k)) - 50 * k, h * 0.16, 6 * k)
  const hill = c.createLinearGradient(0, h * 0.72, 0, h)
  hill.addColorStop(0, '#a9e27c'); hill.addColorStop(1, '#6cbf4b')
  c.fillStyle = hill
  c.beginPath(); c.ellipse(w * 0.55, h * 1.18, w * 0.85, h * 0.45, 0, 0, TAU); c.fill()
  c.fillStyle = '#fff'
  for (let i = 0; i < 9; i++) { const fx = ((i * 97) % 100) / 100 * w, fy = h * 0.86 + ((i * 37) % 10) * k; c.beginPath(); c.arc(fx, fy, 1.4 * k, 0, TAU); c.fill() }
  const s = h * 0.36
  pal(c, w * 0.68, h * 0.98, s, t)
  // speech bubble
  const ph = t % 6.5
  if (ph < 4) {
    const a = Math.min(1, ph * 5), sc = 0.8 + 0.2 * (ph < 0.25 ? ease(ph / 0.25) : 1)
    c.save(); c.globalAlpha = a * Math.min(1, (4 - ph) * 3)
    const bx = w * 0.42, by = h * 0.42
    c.translate(bx, by); c.scale(sc, sc)
    font(c, 9.5 * k, 800)
    const txt = "hi! I'm Max", tw = c.measureText(txt).width + 18 * k
    c.shadowColor = 'rgba(30,80,120,.2)'; c.shadowBlur = 5 * k; c.shadowOffsetY = 2 * k
    rr(c, -tw / 2, -11 * k, tw, 22 * k, 11 * k); c.fillStyle = '#fff'; c.fill()
    c.beginPath(); c.moveTo(tw / 2 - 12 * k, 6 * k); c.lineTo(tw / 2 + 4 * k, 15 * k); c.lineTo(tw / 2 - 2 * k, 3 * k); c.fill()
    c.shadowColor = 'transparent'
    c.fillStyle = '#2a76b8'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 0, 0.5 * k)
    c.restore()
  }
  label(c, 'About', 12 * k, 30 * k, 24 * k, '#3a9be0')
}

/* ------------------------------------------------------------- Links */
function plane(c, x, y, ang, s) {
  c.save(); c.translate(x, y); c.rotate(ang)
  c.fillStyle = '#fff'; c.strokeStyle = '#b28be8'; c.lineWidth = s * 0.08; c.lineJoin = 'round'
  c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * 0.8, -s * 0.62); c.lineTo(-s * 0.35, 0); c.closePath(); c.fill(); c.stroke()
  c.fillStyle = '#e9e0fb'
  c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * 0.8, s * 0.5); c.lineTo(-s * 0.35, 0); c.closePath(); c.fill(); c.stroke()
  c.restore()
}
R.links = (c, w, h, t) => {
  const k = K(w, h)
  c.fillStyle = vgrad(c, h, '#f3ecff', '#fff4fa'); c.fillRect(0, 0, w, h)
  for (let i = 0; i < 3; i++) {
    const sp = 0.09 + i * 0.025, pr = ((t * sp + i * 0.37) % 1.3) - 0.15
    const x = pr * w, base = h * (0.32 + i * 0.17)
    const y = base + Math.sin(pr * 7 + i) * 9 * k
    const dy = Math.cos(pr * 7 + i) * 9 * k * 7 / w
    c.strokeStyle = 'rgba(178,139,232,.5)'; c.lineWidth = 1.3 * k; c.setLineDash([3 * k, 4 * k])
    c.beginPath()
    for (let q = 0; q < 26; q++) { const px = x - q * 4 * k, pp = px / w; const py = base + Math.sin(pp * 7 + i) * 9 * k; q ? c.lineTo(px, py) : c.moveTo(px, py) }
    c.stroke(); c.setLineDash([])
    plane(c, x, y, Math.atan(dy * w / w), (9 + i * 2) * k)
  }
  const chips = [['GitHub', '#2b2f36'], ['X', '#2b2f36'], ['RSS', '#f08a24']]
  font(c, 9 * k, 800)
  let total = 0
  const widths = chips.map(([s]) => c.measureText(s).width + 20 * k)
  widths.forEach((x) => (total += x + 6 * k))
  let x = w / 2 - total / 2 + 3 * k
  chips.forEach(([s, col], i) => {
    const y = h - 26 * k + Math.sin(t * 2.2 + i) * 2.5 * k
    c.save(); c.shadowColor = 'rgba(90,50,140,.2)'; c.shadowBlur = 4 * k; c.shadowOffsetY = 2 * k
    rr(c, x, y, widths[i], 17 * k, 8.5 * k); c.fillStyle = '#fff'; c.fill(); c.restore()
    c.strokeStyle = 'rgba(178,139,232,.6)'; c.lineWidth = 1.2 * k; rr(c, x, y, widths[i], 17 * k, 8.5 * k); c.stroke()
    c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText(s, x + widths[i] / 2, y + 9 * k)
    x += widths[i] + 6 * k
  })
  label(c, 'Links', 12 * k, 30 * k, 24 * k, '#e0559a')
}

/* ------------------------------------------------------------- Forecast */
R.forecast = (c, w, h, t) => {
  const k = K(w, h)
  c.fillStyle = vgrad(c, h, '#5db8f0', '#cdeeff'); c.fillRect(0, 0, w, h)
  const sx = w * 0.79, sy = h * 0.4, sr = Math.min(h * 0.17, w * 0.1)
  c.save(); c.translate(sx, sy); c.rotate(t * 0.35)
  c.fillStyle = 'rgba(255,220,90,.55)'
  for (let i = 0; i < 12; i++) {
    c.rotate(TAU / 12)
    c.beginPath(); c.moveTo(-sr * 0.18, sr * 1.18); c.lineTo(0, sr * (1.62 + 0.08 * Math.sin(t * 3 + i))); c.lineTo(sr * 0.18, sr * 1.18); c.fill()
  }
  c.restore()
  const sg = c.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, sr * 0.1, sx, sy, sr)
  sg.addColorStop(0, '#fff8c4'); sg.addColorStop(0.6, '#ffd84a'); sg.addColorStop(1, '#ffb81f')
  c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill()
  c.fillStyle = '#c47a00'
  for (const d of [-1, 1]) { c.beginPath(); c.arc(sx + d * sr * 0.32, sy - sr * 0.08, sr * 0.08, 0, TAU); c.fill() }
  c.strokeStyle = '#c47a00'; c.lineWidth = sr * 0.08; c.lineCap = 'round'
  c.beginPath(); c.arc(sx, sy + sr * 0.05, sr * 0.36, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke()
  c.fillStyle = 'rgba(255,255,255,.95)'
  cloud(c, ((t * 7 * k + w * 0.55) % (w + 90 * k)) - 60 * k, h * 0.52, 10 * k)
  label(c, 'Forecast', 12 * k, 30 * k, 22 * k, '#f29b1e')
  font(c, 40 * k, 900); c.lineJoin = 'round'; c.textBaseline = 'alphabetic'; c.textAlign = 'left'
  c.lineWidth = 7 * k; c.strokeStyle = '#2a86cc'; c.strokeText('350', 13 * k, h * 0.76); c.fillStyle = '#fff'; c.fillText('350', 13 * k, h * 0.76)
  const nw = c.measureText('350').width
  font(c, 16 * k, 900); c.lineWidth = 5 * k; c.strokeText('ms', 17 * k + nw, h * 0.76); c.fillText('ms', 17 * k + nw, h * 0.76)
  font(c, 8.5 * k, 800); c.fillStyle = '#ffffff'
  c.fillText('Build time · clear skies · 78 routes', 14 * k, h * 0.76 + 15 * k)
}

/* ------------------------------------------------------------- Jukebox */
const SPECTRUM = new Uint8Array(128)
R.jukebox = (c, w, h, t) => {
  const k = K(w, h), playing = Jingle.playing
  c.fillStyle = vgrad(c, h, '#fff0f7', '#ffd9ea'); c.fillRect(0, 0, w, h)
  const dx = w * 0.3, dy = h * 0.6, dr = Math.min(h * 0.33, w * 0.2)
  c.save(); c.shadowColor = 'rgba(120,20,70,.3)'; c.shadowBlur = 8 * k; c.shadowOffsetY = 3 * k
  c.fillStyle = '#26232c'; c.beginPath(); c.arc(dx, dy, dr, 0, TAU); c.fill(); c.restore()
  c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 1
  for (let r = dr * 0.45; r < dr * 0.97; r += 2.2 * k) { c.beginPath(); c.arc(dx, dy, r, 0, TAU); c.stroke() }
  const rot = t * (playing ? 3.4 : 0.6)
  c.save(); c.translate(dx, dy); c.rotate(rot)
  const sh = c.createLinearGradient(-dr, 0, dr, 0)
  sh.addColorStop(0.3, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,.16)'); sh.addColorStop(0.7, 'rgba(255,255,255,0)')
  c.fillStyle = sh; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, dr * 0.97, -0.5, 0.5); c.closePath(); c.fill()
  c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, dr * 0.97, Math.PI - 0.5, Math.PI + 0.5); c.closePath(); c.fill()
  c.fillStyle = '#ff5fa8'; c.beginPath(); c.arc(0, 0, dr * 0.36, 0, TAU); c.fill()
  c.fillStyle = '#ffd1e6'; c.fillRect(-dr * 0.2, -dr * 0.04, dr * 0.4, dr * 0.08)
  c.fillStyle = '#26232c'; c.beginPath(); c.arc(0, 0, dr * 0.05, 0, TAU); c.fill()
  c.restore()
  // bars
  const an = playing && Sound.analyser
  if (an) an.getByteFrequencyData(SPECTRUM)
  const n = 7, x0 = w * 0.56, x1 = w * 0.93, bw = (x1 - x0) / n, seg = 5 * k, top = h * 0.3, bot = h * 0.86
  for (let i = 0; i < n; i++) {
    let v = an ? SPECTRUM[2 + i * 5] / 255 : 0.18 + 0.12 * Math.sin(t * 2.2 + i * 0.9) + 0.06 * Math.sin(t * 5.3 + i * 2)
    v = clamp(v, 0.05, 1)
    const segs = Math.round(((bot - top) / seg) * v)
    for (let s = 0; s < segs; s++) {
      const y = bot - (s + 1) * seg, f = s / ((bot - top) / seg)
      c.fillStyle = f > 0.75 ? '#ff7a59' : f > 0.45 ? '#ff5fa8' : '#d6409f'
      rr(c, x0 + i * bw + 1.5 * k, y + 0.8 * k, bw - 3 * k, seg - 1.6 * k, 1.2 * k); c.fill()
    }
  }
  font(c, 12 * k, 800); c.textAlign = 'center'; c.textBaseline = 'middle'
  for (let i = 0; i < 4; i++) {
    const p = ((t * 0.22 + i * 0.25) % 1)
    c.fillStyle = `rgba(214,64,159,${Math.sin(p * Math.PI) * 0.6})`
    c.fillText(i % 2 ? '♫' : '♪', dx + dr * 0.9 + Math.sin(p * 9 + i) * 8 * k, dy - dr * 0.6 - p * h * 0.4)
  }
  label(c, 'Jukebox', 12 * k, 30 * k, 22 * k, '#d6409f')
  font(c, 7.5 * k, 800); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = 'rgba(160,40,110,.7)'
  c.fillText(playing ? 'NOW PLAYING · ' + Jingle.CHORDS[Math.floor(Math.max(0, Jingle.position())) % 8][2] : 'AN ORIGINAL LOOP', 14 * k, 42 * k)
}

/* ------------------------------------------------------------- Empty slot */
let NOISE = null
function noiseTile() {
  if (NOISE) return NOISE
  NOISE = document.createElement('canvas'); NOISE.width = NOISE.height = 96
  const x = NOISE.getContext('2d'), d = x.createImageData(96, 96)
  for (let i = 0; i < d.data.length; i += 4) { const v = (Math.random() * 255) | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255 }
  x.putImageData(d, 0, 0)
  return NOISE
}
R.empty = (c, w, h, t, st) => {
  c.fillStyle = vgrad(c, h, '#eef0f3', '#dfe3e8'); c.fillRect(0, 0, w, h)
  c.save(); c.globalAlpha = 0.045
  const nz = noiseTile(), ox = ((t * 977) % 96) | 0, oy = ((t * 613) % 96) | 0
  for (let y = -oy; y < h; y += 96) for (let x = -ox; x < w; x += 96) c.drawImage(nz, x, y)
  c.restore()
  const p = ((t * 0.18 + (st.phase || 0)) % 1.5) - 0.25
  const bx = p * w * 1.6 - w * 0.3
  const g = c.createLinearGradient(bx - h, 0, bx + h * 0.2, h)
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = g; c.fillRect(0, 0, w, h)
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1
  for (let y = 2; y < h; y += 4) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(w, y + 0.5); c.stroke() }
}
