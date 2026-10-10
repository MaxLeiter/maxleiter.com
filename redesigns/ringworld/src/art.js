// ---------------------------------------------------------------------------
// Procedural art: every image on the page is painted here from a seed.
// ---------------------------------------------------------------------------
const Art = (() => {
  const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t))
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

  const PALETTES = [
    { name: 'dawn', sky: ['#0b1630', '#3d4a78', '#e7a06c'], sun: '#ffe6bc', fog: '#e9ad83', land: ['#7c6476', '#4a3a52', '#1d1624'], acc: '#ffd39a' },
    { name: 'day', sky: ['#15406a', '#3f86b8', '#bfe2ee'], sun: '#ffffff', fog: '#c6e6ef', land: ['#6f909a', '#3c5e68', '#142730'], acc: '#e9f8ff' },
    { name: 'dusk', sky: ['#120a24', '#4d2653', '#d0718a'], sun: '#ffd0c0', fog: '#cf8399', land: ['#5d3d62', '#30213e', '#120c19'], acc: '#ffb3c2' },
    { name: 'storm', sky: ['#11181f', '#34434e', '#7d929c'], sun: '#dfeaf0', fog: '#92a6b0', land: ['#4f5d64', '#2b3439', '#101416'], acc: '#c9e3f0' },
    { name: 'night', sky: ['#01040b', '#06142a', '#123045'], sun: '#bfe8ff', fog: '#1f4258', land: ['#13212b', '#0a141b', '#030609'], acc: '#7dffcf' },
    { name: 'desert', sky: ['#2d5579', '#6f9fc4', '#efd5a2'], sun: '#fff6e0', fog: '#f0d9aa', land: ['#b38c5c', '#7b5a39', '#33261a'], acc: '#fff0c8' },
  ]

  function ridge(r, w, n, rough) {
    const pts = new Float32Array(n + 1)
    pts[0] = r(); pts[n] = r()
    let step = n
    let amp = 1
    while (step > 1) {
      const half = step >> 1
      for (let i = half; i < n; i += step) pts[i] = (pts[i - half] + pts[i + half]) / 2 + (r() - 0.5) * amp
      amp *= rough; step = half
    }
    return pts
  }

  const cache = new Map()
  function missionPlate(key, w = 480, h = 270, kind = 'land') {
    const id = key + kind + w
    if (cache.has(id)) return cache.get(id)
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const g = c.getContext('2d')
    const r = rng(hashStr(key))
    if (kind === 'film') paintInterior(g, w, h, r)
    else paintLandscape(g, w, h, r)
    // grade, vignette, grain
    const vg = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.7)
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)')
    g.fillStyle = vg; g.fillRect(0, 0, w, h)
    const img = g.getImageData(0, 0, w, h), d = img.data
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n }
    g.putImageData(img, 0, 0)
    cache.set(id, c)
    return c
  }

  function paintLandscape(g, w, h, r) {
    const P = PALETTES[Math.floor(r() * PALETTES.length)]
    const hz = h * (0.52 + r() * 0.14)
    const sky = g.createLinearGradient(0, 0, 0, hz)
    sky.addColorStop(0, P.sky[0]); sky.addColorStop(0.55, P.sky[1]); sky.addColorStop(1, P.sky[2])
    g.fillStyle = sky; g.fillRect(0, 0, w, h)
    if (P.name === 'night' || P.name === 'dusk') {
      for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(230,240,255,${Math.pow(r(), 3) * 0.9})`; g.fillRect(r() * w, r() * hz * 0.9, 1, 1) }
    }
    if (P.name === 'night') {
      for (let k = 0; k < 3; k++) {
        g.save(); g.globalCompositeOperation = 'lighter'
        const ay = hz * (0.25 + k * 0.12)
        const ag = g.createLinearGradient(0, ay - 40, 0, ay + 30)
        ag.addColorStop(0, 'rgba(60,255,180,0)'); ag.addColorStop(0.6, `rgba(60,255,180,${0.12 - k * 0.03})`); ag.addColorStop(1, 'rgba(60,255,180,0)')
        g.fillStyle = ag; g.beginPath(); g.moveTo(0, ay)
        for (let x = 0; x <= w; x += 16) g.lineTo(x, ay + Math.sin(x * 0.012 + k * 2 + r()) * 18)
        g.lineTo(w, ay + 60); g.lineTo(0, ay + 60); g.fill(); g.restore()
      }
    }
    // the ring rising out of the horizon
    const cx = w * (0.2 + r() * 0.6), rx = w * (0.9 + r() * 0.8), ry = hz * (0.75 + r() * 0.5), tilt = (r() - 0.5) * 0.35
    g.save(); g.translate(cx, hz + ry * 0.12); g.rotate(tilt)
    const bandW = Math.max(3, h * 0.022)
    g.lineCap = 'butt'
    g.strokeStyle = rgb(mix(hex(P.sky[2]), hex(P.sun), 0.5), 0.7); g.lineWidth = bandW
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, Math.PI * 1.04, Math.PI * 1.96); g.stroke()
    g.strokeStyle = rgb(hex(P.land[2]), 0.5); g.lineWidth = bandW * 0.35
    g.beginPath(); g.ellipse(0, 0, rx + bandW * 0.5, ry + bandW * 0.5, 0, Math.PI * 1.04, Math.PI * 1.96); g.stroke()
    g.restore()
    // fade ring into sky near horizon
    const hzf = g.createLinearGradient(0, hz - h * 0.25, 0, hz)
    hzf.addColorStop(0, rgb(hex(P.sky[2]), 0)); hzf.addColorStop(1, rgb(hex(P.sky[2]), 0.85))
    g.fillStyle = hzf; g.fillRect(0, hz - h * 0.25, w, h * 0.25)
    // sun
    const sx = w * (0.15 + r() * 0.7), sy = hz * (0.35 + r() * 0.5)
    const sg = g.createRadialGradient(sx, sy, 0, sx, sy, h * 0.6)
    sg.addColorStop(0, rgb(hex(P.sun), 1)); sg.addColorStop(0.025, rgb(hex(P.sun), 0.9)); sg.addColorStop(0.12, rgb(hex(P.sun), 0.25)); sg.addColorStop(1, rgb(hex(P.sun), 0))
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = sg; g.fillRect(0, 0, w, h); g.restore()
    // mountain layers
    const layers = 4
    for (let L = 0; L < layers; L++) {
      const t = L / (layers - 1)
      const col = mix(mix(hex(P.fog), hex(P.land[0]), 0.35), hex(P.land[2]), t)
      const base = hz + (h - hz) * (t * 0.85) - h * 0.02
      const amp = h * (0.22 - t * 0.1) * (0.6 + r() * 0.6)
      const pts = ridge(r, w, 64, 0.55)
      g.fillStyle = rgb(col)
      g.beginPath(); g.moveTo(0, h)
      for (let i = 0; i <= 64; i++) g.lineTo((i / 64) * w, base - pts[i] * amp)
      g.lineTo(w, h); g.closePath(); g.fill()
      // rim light along the ridge, side facing the sun
      g.strokeStyle = rgb(hex(P.acc), 0.12 * (1 - t)); g.lineWidth = 1
      g.beginPath(); for (let i = 0; i <= 64; i++) g.lineTo((i / 64) * w, base - pts[i] * amp); g.stroke()
      // structures on the second layer
      if (L === 1 && r() > 0.25) {
        const n = 1 + Math.floor(r() * 3), sx0 = r() * w
        for (let k = 0; k < n; k++) {
          const px = (sx0 + k * w * 0.07) % w, ph = h * (0.16 + r() * 0.22), pw = Math.max(4, w * 0.012)
          const yb = base - pts[Math.round((px / w) * 64)] * amp + 4
          g.fillStyle = rgb(mix(col, [0, 0, 0], 0.25))
          g.beginPath(); g.moveTo(px - pw, yb); g.lineTo(px - pw * 0.35, yb - ph); g.lineTo(px + pw * 0.35, yb - ph); g.lineTo(px + pw, yb); g.fill()
          g.save(); g.globalCompositeOperation = 'lighter'
          g.fillStyle = rgb(hex(P.acc), 0.5); g.fillRect(px - 0.6, yb - ph * 0.95, 1.2, ph * 0.8)
          const bg = g.createRadialGradient(px, yb - ph, 0, px, yb - ph, 18); bg.addColorStop(0, rgb(hex(P.acc), 0.5)); bg.addColorStop(1, rgb(hex(P.acc), 0))
          g.fillStyle = bg; g.fillRect(px - 20, yb - ph - 20, 40, 40); g.restore()
        }
      }
      // fog between layers
      const fg = g.createLinearGradient(0, base - amp, 0, base + h * 0.1)
      fg.addColorStop(0, rgb(hex(P.fog), 0)); fg.addColorStop(1, rgb(hex(P.fog), 0.22 * (1 - t)))
      g.fillStyle = fg; g.fillRect(0, base - amp, w, h)
    }
    // god rays
    g.save(); g.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2, len = h * 1.4
      g.fillStyle = rgb(hex(P.sun), 0.025)
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len); g.lineTo(sx + Math.cos(a + 0.08) * len, sy + Math.sin(a + 0.08) * len); g.fill()
    }
    g.restore()
  }

  function paintInterior(g, w, h, r) {
    const tint = r() > 0.5 ? [90, 200, 255] : [255, 170, 80]
    const tint2 = r() > 0.5 ? [255, 120, 90] : [120, 255, 200]
    g.fillStyle = '#030609'; g.fillRect(0, 0, w, h)
    const vx = w * (0.38 + r() * 0.24), vy = h * (0.42 + r() * 0.16)
    // corridor walls as nested frames receding to the vanishing point
    const depth = 14
    for (let i = depth; i >= 0; i--) {
      const t = i / depth, s = Math.pow(1 - t, 1.6) * 1.15 + 0.05
      const x0 = vx - vx * s * 1.2, x1 = vx + (w - vx) * s * 1.2, y0 = vy - vy * s * 1.1, y1 = vy + (h - vy) * s * 1.1
      const lum = 0.06 + (1 - t) * 0.05
      g.strokeStyle = rgb(mix([20, 30, 40], tint, lum), 0.9); g.lineWidth = 1 + (1 - t) * 3
      g.strokeRect(x0, y0, x1 - x0, y1 - y0)
      if (i % 3 === 0) {
        g.save(); g.globalCompositeOperation = 'lighter'
        g.shadowColor = rgb(tint, 0.9); g.shadowBlur = 12
        g.fillStyle = rgb(tint, 0.25 + 0.4 * (1 - t))
        g.fillRect(x0 + (x1 - x0) * 0.3, y0 + 1, (x1 - x0) * 0.4, Math.max(1, 3 * (1 - t)))
        g.restore()
      }
    }
    // far doorway glow
    const dg = g.createRadialGradient(vx, vy, 0, vx, vy, h * 0.4)
    dg.addColorStop(0, rgb(mix(tint, [255, 255, 255], 0.6), 0.9)); dg.addColorStop(0.1, rgb(tint, 0.35)); dg.addColorStop(1, rgb(tint, 0))
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = dg; g.fillRect(0, 0, w, h)
    // floor reflection streak
    const fl = g.createLinearGradient(0, vy, 0, h)
    fl.addColorStop(0, rgb(tint, 0.2)); fl.addColorStop(1, rgb(tint, 0))
    g.fillStyle = fl; g.beginPath(); g.moveTo(vx - 6, vy); g.lineTo(vx + 6, vy); g.lineTo(vx + w * 0.16, h); g.lineTo(vx - w * 0.16, h); g.fill()
    // accent panel lights
    for (let i = 0; i < 6; i++) {
      const side = r() > 0.5 ? 1 : -1, t = r()
      const x = vx + side * (w * 0.08 + t * w * 0.45), y = vy + (r() - 0.5) * h * 0.5 * (0.3 + t)
      g.shadowColor = rgb(tint2, 1); g.shadowBlur = 10
      g.fillStyle = rgb(tint2, 0.7); g.fillRect(x, y, 2 + t * 4, 2 + t * 4)
    }
    g.restore()
    // silhouette figure
    if (r() > 0.4) {
      const fx = vx + (r() - 0.5) * w * 0.12, fh = h * 0.22, fy = vy + fh * 0.4
      g.fillStyle = '#020305'
      g.beginPath(); g.ellipse(fx, fy - fh * 0.88, fh * 0.07, fh * 0.09, 0, 0, 7); g.fill()
      g.beginPath(); g.moveTo(fx - fh * 0.14, fy - fh * 0.75); g.lineTo(fx + fh * 0.14, fy - fh * 0.75); g.lineTo(fx + fh * 0.1, fy - fh * 0.3); g.lineTo(fx + fh * 0.08, fy); g.lineTo(fx - fh * 0.08, fy); g.lineTo(fx - fh * 0.1, fy - fh * 0.3); g.fill()
    }
  }

  function drawPlate(canvas, key, kind) {
    const p = missionPlate(key, 480, 270, kind)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const cw = Math.max(1, Math.round(canvas.clientWidth * dpr)), ch = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch }
    const g = canvas.getContext('2d')
    const s = Math.max(cw / p.width, ch / p.height)
    g.drawImage(p, (cw - p.width * s) / 2, (ch - p.height * s) / 2, p.width * s, p.height * s)
  }

  // --- emblem: hex shield, ring + four-point star, all original ---
  function emblem({ bg = '#2f6aa2', fg = '#f2bd5a', id = 'e' } = {}) {
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs>
      <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}" stop-opacity="1"/><stop offset="1" stop-color="#0b1a2c"/></linearGradient>
      <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3d2"/><stop offset=".5" stop-color="${fg}"/><stop offset="1" stop-color="#8a5a1a"/></linearGradient></defs>
      <path d="M50 4 89 26v48L50 96 11 74V26z" fill="url(#${id}b)" stroke="rgba(255,255,255,.55)" stroke-width="2"/>
      <path d="M50 12 82 30v40L50 88 18 70V30z" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>
      <ellipse cx="50" cy="54" rx="31" ry="10" fill="none" stroke="url(#${id}f)" stroke-width="4.5" transform="rotate(-18 50 54)"/>
      <path d="M50 22 55 47 76 52 55 57 50 82 45 57 24 52 45 47z" fill="url(#${id}f)" stroke="#3a2608" stroke-width="1"/>
      <path d="M50 22 55 47 50 52z" fill="rgba(255,255,255,.5)"/>
    </svg>`
  }

  function rankIcon() {
    return `<svg class="rank" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="#ffc46b" stroke-width="2"><path d="M4 9l8-5 8 5"/><path d="M4 14l8-5 8 5"/><path d="M4 19l8-5 8 5"/></g></svg>`
  }

  // difficulty shield, filled by tier
  function diffIcon(on, i) {
    const notches = ['', 'M15 9v6', 'M12 9v6M18 9v6', 'M10 9v6M15 9v6M20 9v6'][i]
    return `<svg viewBox="0 0 30 34" class="${on ? 'on' : ''}" aria-hidden="true"><path d="M15 2 27 7v10c0 7-5 12-12 15C8 29 3 24 3 17V7z" stroke-width="1.2"/>${i ? `<path d="${notches}" stroke="${on ? '#3a2608' : 'rgba(150,205,255,.3)'}" stroke-width="2" fill="none"/>` : `<circle cx="15" cy="15" r="2.5" fill="${on ? '#3a2608' : 'rgba(150,205,255,.3)'}" stroke="none"/>`}</svg>`
  }

  const MEDAL_ICONS = {
    dawn: '<circle cx="24" cy="27" r="7"/><path d="M10 34h28M13 22l-4-3M35 22l4-3M24 14v-5"/>',
    star: '<path d="M24 9l4 10 11 1-8 7 3 11-10-6-10 6 3-11-8-7 11-1z"/>',
    twin: '<circle cx="18" cy="24" r="6"/><circle cx="30" cy="24" r="6"/>',
    stack: '<path d="M12 31h24M12 25h24M12 19h24M12 13h24"/>',
    arc: '<path d="M10 32c4-14 24-14 28 0"/><path d="M24 12v8M20 16h8"/>',
    film: '<rect x="11" y="14" width="26" height="20"/><path d="M11 19h26M11 29h26M17 14v5M24 14v5M31 14v5"/>',
    cube: '<path d="M24 10l12 7v14l-12 7-12-7V17z"/><path d="M12 17l12 7 12-7M24 24v14"/>',
    bolt: '<path d="M27 8 15 27h9l-3 13 12-19h-9z"/>',
    crown: '<path d="M11 32h26l2-17-8 6-7-10-7 10-8-6z"/>',
    infinity: '<path d="M14 24c0-6 8-6 10 0s10 6 10 0-8-6-10 0-10 6-10 0z"/>',
  }
  function medal(icon, color, id) {
    const c = color
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="m${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="#0d1a28"/></linearGradient></defs>
      <path d="M24 2 43 13v22L24 46 5 35V13z" fill="url(#m${id})" stroke="rgba(255,255,255,.7)" stroke-width="1.2"/>
      <path d="M24 6 39 15v18L24 42 9 33V15z" fill="rgba(4,10,18,.55)"/>
      <g fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${MEDAL_ICONS[icon] || MEDAL_ICONS.star}</g></svg>`
  }

  // Forge object glyphs for the palette list
  const OBJ_ICONS = {
    systems: '<rect x="5" y="5" width="12" height="12"/><path d="M8 2v3M14 2v3M8 17v3M14 17v3M2 8h3M2 14h3M17 8h3M17 14h3"/>',
    ai: '<circle cx="11" cy="11" r="4"/><path d="M11 2v3M11 17v3M2 11h3M17 11h3M4.6 4.6l2.2 2.2M15.2 15.2l2.2 2.2M4.6 17.4l2.2-2.2M15.2 6.8l2.2-2.2"/>',
    web: '<rect x="3" y="4" width="16" height="14"/><path d="M3 8h16M6 6h1M9 6h1"/>',
    research: '<circle cx="9" cy="9" r="5"/><path d="M13 13l6 6"/>',
  }
  function objIcon(cat) { return `<svg class="ico" viewBox="0 0 22 22" aria-hidden="true">${OBJ_ICONS[cat] || OBJ_ICONS.web}</svg>` }

  // --- Forge: rotating wireframe object on a perspective grid ---
  const SHAPES = {
    crate() { const v = [], e = []; for (let i = 0; i < 8; i++) v.push([(i & 1 ? 1 : -1), (i & 2 ? 1 : -1), (i & 4 ? 1 : -1)]); for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const d = i ^ j; if (d === 1 || d === 2 || d === 4) e.push([i, j]) } const s = v.length; v.push([-1, 0.4, 1.001], [1, 0.4, 1.001], [-1, -0.4, 1.001], [1, -0.4, 1.001]); e.push([s, s + 1], [s + 2, s + 3]); return { v, e } },
    tower() { const v = [], e = [], n = 10, rings = 5; for (let r = 0; r < rings; r++) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, rad = 0.7 - r * 0.08; v.push([Math.cos(a) * rad, -1.2 + r * 0.6, Math.sin(a) * rad]) } for (let r = 0; r < rings; r++) for (let i = 0; i < n; i++) { e.push([r * n + i, r * n + ((i + 1) % n)]); if (r < rings - 1) e.push([r * n + i, (r + 1) * n + i]) } v.push([0, 1.6, 0]); for (let i = 0; i < n; i += 2) e.push([(rings - 1) * n + i, v.length - 1]); return { v, e } },
    ring() { const v = [], e = [], n = 28, m = 6; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const a = (i / n) * Math.PI * 2, b = (j / m) * Math.PI * 2, R = 1.15, r = 0.22; v.push([(R + r * Math.cos(b)) * Math.cos(a), r * Math.sin(b) * 1.6, (R + r * Math.cos(b)) * Math.sin(a)]) } for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { e.push([i * m + j, ((i + 1) % n) * m + j]); if (i % 2 === 0) e.push([i * m + j, i * m + ((j + 1) % m)]) } return { v, e } },
    gem() { const t = (1 + Math.sqrt(5)) / 2, v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((p) => p.map((x) => x * 0.66)), e = []; for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) { const d = Math.hypot(...v[i].map((x, k) => x - v[j][k])); if (d < 1.4) e.push([i, j]) } return { v, e } },
    dish() { const v = [], e = [], n = 16, rings = 4; for (let r = 1; r <= rings; r++) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, rad = (r / rings) * 1.2; v.push([Math.cos(a) * rad, 0.4 + rad * rad * 0.35, Math.sin(a) * rad]) } for (let r = 0; r < rings; r++) for (let i = 0; i < n; i++) { e.push([r * n + i, r * n + ((i + 1) % n)]); if (r < rings - 1) e.push([r * n + i, (r + 1) * n + i]) } const c = v.length; v.push([0, 0.4, 0], [0, -1.2, 0], [0, 1.3, 0], [-0.6, -1.2, 0.4], [0.6, -1.2, 0.4], [0, -1.2, -0.7]); e.push([c, c + 1], [c, c + 2], [c + 1, c + 3], [c + 1, c + 4], [c + 1, c + 5]); for (let i = 0; i < n; i += 4) e.push([i, c + 2]); return { v, e } },
  }
  const CAT_SHAPE = { systems: ['crate', 'tower'], ai: ['gem', 'ring'], web: ['dish', 'crate', 'tower'], research: ['gem'] }

  function wireframe(canvas, key, cat, t) {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr)
    if (!w || !h) return
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    const g = canvas.getContext('2d')
    g.clearRect(0, 0, w, h)
    const opts = CAT_SHAPE[cat] || ['crate']
    const shape = SHAPES[opts[hashStr(key) % opts.length]]()
    const cy = h * 0.5, f = h * 1.25, camZ = 4.6
    const ya = t * 0.45 + (hashStr(key) % 100) * 0.06, pitch = 0.42
    const proj = ([x, y, z]) => {
      const cx = Math.cos(ya), sx = Math.sin(ya)
      let X = x * cx - z * sx, Z = x * sx + z * cx, Y = y
      const cp = Math.cos(pitch), sp = Math.sin(pitch)
      const Y2 = Y * cp - Z * sp, Z2 = Y * sp + Z * cp
      const zz = camZ + Z2
      return [w / 2 + (X * f) / zz, cy - (Y2 * f) / zz, zz]
    }
    // ground grid
    g.lineWidth = 1 * dpr
    for (let i = -8; i <= 8; i++) {
      const a = proj([i * 0.4, -1.3, -3.2]), b = proj([i * 0.4, -1.3, 3.2])
      const c = proj([-3.2, -1.3, i * 0.4]), d = proj([3.2, -1.3, i * 0.4])
      const al = 0.16 - Math.abs(i) * 0.015
      g.strokeStyle = `rgba(120,200,255,${al})`
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.moveTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.stroke()
    }
    // gizmo
    const o = proj([0, -1.3, 0])
    const axes = [[[0.7, -1.3, 0], '#ff8a6a'], [[0, -0.6, 0], '#9dff9a'], [[0, -1.3, 0.7], '#7fc8ff']]
    for (const [p, col] of axes) { const q = proj(p); g.strokeStyle = col; g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(o[0], o[1]); g.lineTo(q[0], q[1]); g.stroke() }
    // object
    const P = shape.v.map(proj)
    g.save(); g.globalCompositeOperation = 'lighter'
    for (const pass of [[7 * dpr, 'rgba(90,180,255,0.18)'], [2.2 * dpr, 'rgba(140,215,255,0.55)'], [1 * dpr, 'rgba(230,248,255,0.95)']]) {
      g.lineWidth = pass[0]; g.strokeStyle = pass[1]; g.beginPath()
      for (const [a, b] of shape.e) { g.moveTo(P[a][0], P[a][1]); g.lineTo(P[b][0], P[b][1]) }
      g.stroke()
    }
    g.fillStyle = '#ffffff'
    for (const p of P) g.fillRect(p[0] - dpr, p[1] - dpr, 2 * dpr, 2 * dpr)
    g.restore()
    // bounding brackets
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const p of P) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]) }
    const pad = 14 * dpr, L = 12 * dpr
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad
    g.strokeStyle = 'rgba(255,196,107,0.85)'; g.lineWidth = 1.2 * dpr; g.beginPath()
    for (const [cx, cy2, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { g.moveTo(cx + dx * L, cy2); g.lineTo(cx, cy2); g.lineTo(cx, cy2 + dy * L) }
    g.stroke()
  }

  // Theater playback frame: the film plate with a slow camera push, scrub-driven
  function filmFrame(canvas, key, p) {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr)
    if (!w || !h) return
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    const g = canvas.getContext('2d')
    const plate = missionPlate(key, 640, 360, 'film')
    const s = Math.max(w / plate.width, h / plate.height) * (1.08 + p * 0.22)
    const dx = (w - plate.width * s) / 2 + Math.sin(p * 5) * w * 0.02, dy = (h - plate.height * s) / 2
    g.drawImage(plate, dx, dy, plate.width * s, plate.height * s)
    g.fillStyle = 'rgba(0,0,0,0.15)'
    for (let y = 0; y < h; y += 3 * dpr) g.fillRect(0, y, w, dpr)
  }

  return { drawPlate, emblem, rankIcon, diffIcon, medal, objIcon, wireframe, filmFrame, hashStr }
})()
