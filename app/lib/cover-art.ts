/**
 * Generative box art: one deterministic cover per seed.
 *
 * The seed is an item's kind and slug -- `blog:xios`, `note:swr-state`,
 * `project:drift` -- so the homepage tile, the WebGL scene's texture and the
 * article header all show the same picture. It has two halves:
 *
 * - `coverSvg(seed)` is the motif: shapes and gradients, no text. The build
 *   writes it to a hashed `/_assets/cover.*.svg`. No text, because an SVG
 *   loaded as an image cannot reach the page's web fonts.
 * - `coverLayout(...)` is the type on top -- the big keyword, the chip, the
 *   title lines and the meta line -- in the cover's 640x400 units. The server
 *   draws it as inline SVG text and the channels island draws the same numbers
 *   with Canvas2D, so the two agree without either measuring text at runtime.
 *   Widths come from a table of Geist's advances rather than `measureText`,
 *   which the server does not have.
 *
 * A leaf module: the build and the client bundle both import it, so it may
 * import nothing at all.
 */

export const COVER_W = 640
export const COVER_H = 400

/** FNV-1a. Stable across runtimes, which `Math.random` seeding is not. */
export function hash(text: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32: a seeded generator in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/* ------------------------------------------------------------- colour -- */

/** `#rrggbb`, or `#rrggbb/0.35` when translucent; see `paint` and `stop`. */
type Colour = string

function hslRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)) as [
    number,
    number,
    number,
  ]
}

export function hslHex(h: number, s: number, l: number): string {
  return `#${hslRgb(h, s, l)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`
}

function hsl(h: number, s: number, l: number, a = 1): Colour {
  const hex = hslHex(h, s, l)
  return a >= 1 ? hex : `${hex}/${num(a, 3)}`
}

function rgba(hex: string, a: number): Colour {
  return a >= 1 ? hex : `${hex}/${num(a, 3)}`
}

function split(c: Colour): [string, number] {
  const [hex, a] = c.split('/')
  return [hex, a === undefined ? 1 : Number(a)]
}

function paint(attr: 'fill' | 'stroke', c: Colour): string {
  const [hex, a] = split(c)
  return a >= 1
    ? `${attr}="${hex}"`
    : `${attr}="${hex}" ${attr}-opacity="${num(a, 3)}"`
}

function num(x: number, digits = 1): string {
  const p = 10 ** digits
  return String(Math.round(x * p) / p)
}

/* ------------------------------------------------------------ palette -- */

export interface Palette {
  hue: number
  h2: number
  h3: number
  bg0: Colour
  bg1: Colour
  a: Colour
  b: Colour
  c: Colour
  hi: Colour
  dk: Colour
}

export function coverHue(seed: string): number {
  return hash(`${seed}h`) % 360
}

function paletteFor(seed: string, R: () => number): Palette {
  const hue = coverHue(seed)
  const scheme = Math.floor(R() * 4)
  const h2 = hue + [32, 180, 120, -42][scheme]
  const h3 = hue + (R() < 0.5 ? -64 : 64)
  return {
    hue,
    h2,
    h3,
    bg0: hsl(hue, 60, 8),
    bg1: hsl(h2, 62, 20),
    a: hsl(hue, 85, 56),
    b: hsl(h2, 90, 62),
    c: hsl(h3, 80, 70),
    hi: hsl(hue, 100, 90),
    dk: hsl(hue, 70, 14),
  }
}

export const MOTIFS = [
  'shards',
  'orb',
  'ribbons',
  'stripes',
  'horizon',
  'blocks',
  'burst',
  'contours',
  'panels',
] as const
export type Motif = (typeof MOTIFS)[number]

export function motifFor(seed: string): Motif {
  return MOTIFS[hash(`${seed}m`) % MOTIFS.length]
}

/* --------------------------------------------------------- svg writer -- */

class Doc {
  defs: string[] = []
  body: string[] = []
  private next = 0

  id(): string {
    return `d${(this.next++).toString(36)}`
  }

  private stops(stops: [number, Colour][]): string {
    return stops
      .map(([offset, c]) => {
        const [hex, a] = split(c)
        const opacity = a >= 1 ? '' : ` stop-opacity="${num(a, 3)}"`
        return `<stop offset="${num(offset, 3)}" stop-color="${hex}"${opacity}/>`
      })
      .join('')
  }

  linear(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stops: [number, Colour][],
  ): string {
    const id = this.id()
    this.defs.push(
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}">${this.stops(stops)}</linearGradient>`,
    )
    return `url(#${id})`
  }

  radial(
    cx: number,
    cy: number,
    r: number,
    stops: [number, Colour][],
    focus?: { x: number; y: number; r: number },
  ): string {
    const id = this.id()
    const f = focus
      ? ` fx="${num(focus.x)}" fy="${num(focus.y)}" fr="${num(focus.r)}"`
      : ''
    this.defs.push(
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}"${f}>${this.stops(stops)}</radialGradient>`,
    )
    return `url(#${id})`
  }

  /** A blur that keeps the source on top: canvas `shadowBlur` in one filter. */
  glow(deviation: number): string {
    const id = this.id()
    this.defs.push(
      `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${deviation}"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
    )
    return `url(#${id})`
  }

  rect(fill: string, x = 0, y = 0, w = COVER_W, h = COVER_H, extra = ''): void {
    const at = `${x ? ` x="${num(x)}"` : ''}${y ? ` y="${num(y)}"` : ''}`
    const pos = `${at} width="${num(w)}" height="${num(h)}"`
    this.body.push(`<rect${pos} ${fillOf(fill)}${extra}/>`)
  }

  toString(): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${COVER_W} ${COVER_H}" width="${COVER_W}" height="${COVER_H}">` +
      `<defs>${this.defs.join('')}</defs>${this.body.join('')}</svg>`
    )
  }
}

/** A `url(#...)` reference or a colour, as a fill attribute. */
function fillOf(value: string): string {
  return value.startsWith('url(') ? `fill="${value}"` : paint('fill', value)
}

const pt = (x: number, y: number) => `${num(x)} ${num(y)}`

function poly(points: [number, number][]): string {
  return `M${points.map(([x, y]) => pt(x, y)).join('L')}Z`
}

function circle(cx: number, cy: number, r: number, attrs: string): string {
  return `<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" ${attrs}/>`
}

/** Half an ellipse, as the arc path the ring's front and back halves need. */
function halfEllipse(rx: number, ry: number, front: boolean): string {
  // Canvas draws the front half from 0 to PI (the lower half on screen).
  return front
    ? `M${pt(rx, 0)}A${num(rx)} ${num(ry)} 0 0 1 ${pt(-rx, 0)}`
    : `M${pt(-rx, 0)}A${num(rx)} ${num(ry)} 0 0 1 ${pt(rx, 0)}`
}

/* -------------------------------------------------------------- motifs -- */

type Draw = (doc: Doc, R: () => number, P: Palette) => void
const W = COVER_W
const H = COVER_H

const shards: Draw = (doc, R, P) => {
  const cols = 8
  const rows = 5
  const pts: [number, number, number][] = []
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const edge = i === 0 || j === 0 || i === cols || j === rows
      pts.push([
        (i / cols) * W + (edge ? 0 : (R() - 0.5) * (W / cols) * 0.9),
        (j / rows) * H + (edge ? 0 : (R() - 0.5) * (H / rows) * 0.9),
        R() * 70,
      ])
    }
  }
  doc.rect(hsl(lerp(P.hue, P.h2, 0.5), 72, 22))
  const L = [-0.45, -0.6, 0.66]
  const paths: string[] = []
  const tri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
  ) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    let nx = u[1] * v[2] - u[2] * v[1]
    let ny = u[2] * v[0] - u[0] * v[2]
    let nz = u[0] * v[1] - u[1] * v[0]
    const nl = Math.hypot(nx, ny, nz) || 1
    if (nz < 0) {
      nx = -nx
      ny = -ny
      nz = -nz
    }
    const shade = clamp((nx * L[0] + ny * L[1] + nz * L[2]) / nl, 0, 1)
    const cx = (a[0] + b[0] + c[0]) / 3
    const cy = (a[1] + b[1] + c[1]) / 3
    const t = clamp((cx / W) * 0.7 + (cy / H) * 0.3 + (R() - 0.5) * 0.12, 0, 1)
    const fill = hsl(
      lerp(P.hue, P.h2, t),
      72,
      10 + shade * 46 * (1 - (cy / H) * 0.5),
    )
    paths.push(
      `<path d="${poly([
        [a[0], a[1]],
        [b[0], b[1]],
        [c[0], c[1]],
      ])}" ${paint('fill', fill)} ${paint('stroke', fill)}/>`,
    )
  }
  const p = (x: number, y: number) => pts[y * (cols + 1) + x]
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if ((i + j) % 2) {
        tri(p(i, j), p(i + 1, j), p(i + 1, j + 1))
        tri(p(i, j), p(i + 1, j + 1), p(i, j + 1))
      } else {
        tri(p(i, j), p(i + 1, j), p(i, j + 1))
        tri(p(i + 1, j), p(i + 1, j + 1), p(i, j + 1))
      }
    }
  }
  doc.body.push(
    `<g stroke-width="1" stroke-linejoin="round">${paths.join('')}</g>`,
  )
  const glow = doc.radial(W * 0.3, H * 0.1, W * 0.7, [
    [0, hsl(P.h2, 90, 60, 0.35)],
    [1, hsl(P.h2, 90, 60, 0)],
  ])
  doc.rect(glow, 0, 0, W, H, ' style="mix-blend-mode:screen"')
}

const orb: Draw = (doc, R, P) => {
  doc.rect(
    doc.radial(W * 0.7, H * 0.4, W * 0.8, [
      [0, hsl(P.h2, 60, 22)],
      [1, hsl(P.hue, 70, 4)],
    ]),
  )
  // Stars, three brightness bands in one path each.
  const bands = ['', '', '']
  for (let i = 0; i < 120; i++) {
    const s = R() < 0.08 ? 2.2 : 1.1
    const band = Math.min(2, Math.floor(R() * 3))
    bands[band] += `M${pt(R() * W, R() * H)}h${s}v${s}h-${s}z`
  }
  bands.forEach((d, i) => {
    doc.body.push(
      `<path d="${d}" fill="#fff" fill-opacity="${[0.2, 0.42, 0.7][i]}"/>`,
    )
  })
  const cx = W * (0.58 + R() * 0.16)
  const cy = H * (0.36 + R() * 0.1)
  const r = H * (0.3 + R() * 0.08)
  doc.rect(
    doc.radial(cx, cy, r * 2.2, [
      [0.36, hsl(P.h2, 90, 55, 0.5)],
      [1, hsl(P.h2, 90, 55, 0)],
    ]),
    0,
    0,
    W,
    H,
    ' style="mix-blend-mode:screen"',
  )
  const tilt = ((-0.35 + R() * 0.2) * 180) / Math.PI
  const ringStroke = doc.linear(-r * 2, 0, r * 2, 0, [
    [0, hsl(P.h3, 80, 70, 0.1)],
    [0.5, hsl(P.h3, 90, 80, 0.9)],
    [1, hsl(P.h3, 80, 70, 0.1)],
  ])
  const ring = (front: boolean) =>
    `<g transform="translate(${pt(cx, cy)}) rotate(${num(tilt)})" fill="none">` +
    `<path d="${halfEllipse(r * 1.75, r * 0.38, front)}" stroke="${ringStroke}" stroke-width="${num(r * 0.12)}"/>` +
    `<path d="${halfEllipse(r * 1.95, r * 0.43, front)}" ${paint('stroke', hsl(P.h3, 100, 90, 0.6))} stroke-width="${num(r * 0.03)}"/></g>`
  doc.body.push(ring(false))
  const body = doc.radial(
    cx,
    cy,
    r * 1.05,
    [
      [0, P.hi],
      [0.25, P.a],
      [0.75, P.dk],
      [1, hsl(P.hue, 70, 5)],
    ],
    { x: cx - r * 0.4, y: cy - r * 0.45, r: r * 0.05 },
  )
  const clip = doc.id()
  doc.defs.push(`<clipPath id="${clip}">${circle(cx, cy, r, '')}</clipPath>`)
  doc.body.push(circle(cx, cy, r, `fill="${body}"`))
  let bands2 = ''
  for (let i = 0; i < 6; i++) {
    const y = cy - r + (i * 0.33 + R() * 0.2) * r
    bands2 += `M${pt(cx - r, y)}h${num(r * 2)}v${num(r * (0.06 + R() * 0.12))}h-${num(r * 2)}z`
  }
  doc.body.push(
    `<path clip-path="url(#${clip})" d="${bands2}" ${paint('fill', hsl(P.h2, 70, 60, 0.12))}/>`,
  )
  const a0 = Math.PI * 0.1
  const a1 = Math.PI * 0.9
  const rr = r - 1.5
  doc.body.push(
    `<path d="M${pt(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr)}A${num(rr)} ${num(rr)} 0 0 1 ${pt(cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr)}" fill="none" ${paint('stroke', hsl(P.h2, 100, 80, 0.5))} stroke-width="3"/>`,
  )
  doc.body.push(ring(true))
}

const ribbons: Draw = (doc, R, P) => {
  doc.rect(
    doc.linear(0, 0, 0, H, [
      [0, hsl(P.hue, 60, 6)],
      [1, hsl(P.h2, 60, 16)],
    ]),
  )
  const wide: string[] = []
  const core: string[] = []
  for (let i = 0; i < 9; i++) {
    const y0 = H * (0.2 + R() * 0.6)
    const y1 = H * (0.1 + R() * 0.8)
    const width = 6 + R() * 60
    const hue = lerp(P.hue, P.h2, R())
    const c1 = y0 - H * (R() - 0.2)
    const c2 = y1 + H * (R() - 0.5)
    const d = `M${pt(-40, y0)}C${pt(W * 0.3, c1)} ${pt(W * 0.65, c2)} ${pt(W + 40, y1)}`
    const stroke = doc.linear(0, 0, W, 0, [
      [0, hsl(hue, 90, 60, 0)],
      [0.4, hsl(hue, 90, 62, 0.32)],
      [1, hsl(hue, 90, 70, 0.05)],
    ])
    wide.push(
      `<path d="${d}" stroke="${stroke}" stroke-width="${num(width)}"/>`,
    )
    core.push(`<path d="${d}" ${paint('stroke', hsl(hue, 100, 85, 0.7))}/>`)
  }
  doc.body.push(
    `<g fill="none" stroke-linecap="round" style="mix-blend-mode:screen" filter="${doc.glow(14)}">${wide.join('')}</g>`,
    `<g fill="none" stroke-width="1.5" style="mix-blend-mode:screen">${core.join('')}</g>`,
  )
}

const stripes: Draw = (doc, R, P) => {
  doc.rect(P.a)
  const angle = ((-0.42 + R() * 0.2) * 180) / Math.PI
  const colours = [P.dk, P.b, P.hi, P.bg0, P.c]
  let x = -W
  let bars = ''
  while (x < W) {
    const w = 14 + R() * 90
    const c = colours[Math.floor(R() * colours.length)]
    bars += `<rect x="${num(x)}" y="${num(-H * 1.2)}" width="${num(w)}" height="${num(H * 2.4)}" ${paint('fill', c)}/>`
    x += w + R() * 30
  }
  let dashes = ''
  for (let i = 0; i < 26; i++) {
    const at = pt(-W + R() * W * 2, -H + R() * H * 2)
    const w = num(40 + R() * 160)
    dashes += `M${at}h${w}v2h-${w}z`
  }
  doc.body.push(
    `<g transform="translate(${pt(W / 2, H / 2)}) rotate(${num(angle)})">${bars}<path d="${dashes}" fill="#fff" fill-opacity=".49"/></g>`,
  )
  doc.rect(
    doc.linear(0, 0, 0, H, [
      [0, rgba('#000000', 0.05)],
      [1, rgba('#000000', 0.55)],
    ]),
  )
  doc.body.push(
    circle(
      W * 0.78,
      H * 0.38,
      H * 0.26,
      `${paint('fill', hsl(P.hue, 80, 8, 0.9))} ${paint('stroke', P.hi)} stroke-width="6"`,
    ),
  )
}

const horizon: Draw = (doc, R, P) => {
  const hz = H * 0.6
  doc.rect(
    doc.linear(0, 0, 0, hz, [
      [0, hsl(P.hue, 70, 8)],
      [0.7, hsl(P.h2, 70, 30)],
      [1, hsl(P.h3, 90, 62)],
    ]),
    0,
    0,
    W,
    hz,
  )
  const sx = W * (0.6 + R() * 0.2)
  const sr = H * 0.24
  const clip = doc.id()
  doc.defs.push(
    `<clipPath id="${clip}"><rect width="${W}" height="${num(hz)}"/></clipPath>`,
  )
  const sun = doc.linear(0, hz - sr * 2, 0, hz, [
    [0, hsl(P.h3, 100, 80)],
    [1, hsl(P.hue, 100, 55)],
  ])
  let cuts = ''
  for (let i = 0; i < 6; i++) {
    const y = hz - sr * 0.25 - i * sr * 0.16 + sr * 0.1
    cuts += `M${pt(sx - sr, y)}h${num(sr * 2)}v${num(2 + i * 1.6)}h-${num(sr * 2)}z`
  }
  const ridge: [number, number][] = [[0, hz]]
  let mx = 0
  while (mx <= W) {
    ridge.push([mx, hz - 12 - R() * H * 0.14])
    mx += 30 + R() * 40
  }
  ridge.push([W, hz])
  doc.body.push(
    `<g clip-path="url(#${clip})">${circle(sx, hz - sr * 0.25, sr, `fill="${sun}"`)}` +
      `<path d="${cuts}" ${paint('fill', hsl(P.h2, 70, 22))}/>` +
      `<path d="${poly(ridge)}" ${paint('fill', hsl(P.hue, 50, 7))}/></g>`,
  )
  doc.rect(
    doc.linear(0, hz, 0, H, [
      [0, hsl(P.hue, 60, 10)],
      [1, '#020204'],
    ]),
    0,
    hz,
    W,
    H - hz,
  )
  let rays = ''
  for (let i = -14; i <= 14; i++) {
    rays += `M${pt(W / 2 + i * 14, hz)}L${pt(W / 2 + i * 150, H)}`
  }
  let rungs = ''
  for (let j = 1; j < 10; j++) {
    const y = hz + Math.pow(j / 9, 2.2) * (H - hz)
    rungs += `<path d="M0 ${num(y)}H${W}" stroke-opacity="${num(j / 10 + 0.1, 2)}"/>`
  }
  doc.body.push(
    `<g fill="none" ${paint('stroke', hsl(P.h3, 100, 70, 0.75))} stroke-width="1.5" filter="${doc.glow(4)}"><path d="${rays}"/>${rungs}</g>`,
  )
}

const blocks: Draw = (doc, R, P) => {
  doc.rect(
    doc.linear(0, 0, 0, H, [
      [0, hsl(P.hue, 40, 12)],
      [1, hsl(P.hue, 50, 4)],
    ]),
  )
  const s = 44
  const ox = W * 0.56
  const oy = H * 0.16
  const k = s * 0.87
  const parts: string[] = []
  for (let j = 0; j < 6; j++) {
    for (let i = 0; i < 6; i++) {
      const h = 12 + Math.pow(R(), 2) * 120
      const x = ox + (i - j) * k
      const y = oy + (i + j) * s * 0.5
      const hue = lerp(P.hue, P.h2, (i + j) / 10)
      const top = R() < 0.1 ? P.hi : hsl(hue, 80, 50)
      parts.push(
        `<path d="${poly([
          [x - k, y - h + s * 0.5],
          [x, y - h + s],
          [x, y + s],
          [x - k, y + s * 0.5],
        ])}" ${paint('fill', hsl(hue, 70, 28))}/>`,
        `<path d="${poly([
          [x + k, y - h + s * 0.5],
          [x, y - h + s],
          [x, y + s],
          [x + k, y + s * 0.5],
        ])}" ${paint('fill', hsl(hue, 70, 18))}/>`,
        `<path d="${poly([
          [x, y - h],
          [x + k, y - h + s * 0.5],
          [x, y - h + s],
          [x - k, y - h + s * 0.5],
        ])}" ${paint('fill', top)}/>`,
      )
    }
  }
  doc.body.push(parts.join(''))
}

const burst: Draw = (doc, R, P) => {
  const cx = W * (0.62 + R() * 0.2)
  const cy = H * (0.3 + R() * 0.2)
  const n = 22
  doc.rect(P.dk)
  const big = W * 1.5
  const wedges = ['', '']
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI
    const a1 = ((i + 1) / n) * 2 * Math.PI
    wedges[i % 2] +=
      `M${pt(cx, cy)}L${pt(cx + Math.cos(a0) * big, cy + Math.sin(a0) * big)}` +
      `L${pt(cx + Math.cos(a1) * big, cy + Math.sin(a1) * big)}Z`
  }
  doc.body.push(
    `<path d="${wedges[0]}" ${paint('fill', hsl(P.hue, 80, 40))}/>`,
    `<path d="${wedges[1]}" ${paint('fill', P.a)}/>`,
  )
  doc.rect(
    doc.radial(cx, cy, W * 0.8, [
      [0, rgba('#ffffff', 0.5)],
      [0.3, rgba('#000000', 0)],
      [1, rgba('#000000', 0.7)],
    ]),
  )
  // Halftone: one dot pattern, faded in from the left by a mask.
  const dots = doc.id()
  const fade = doc.id()
  const ramp = doc.linear(W * 0.2, 0, W * 0.9, H * 0.4, [
    [0, '#000000'],
    [1, '#ffffff'],
  ])
  const dot = paint('fill', hsl(P.h2, 90, 60, 0.55))
  doc.defs.push(
    `<pattern id="${dots}" width="12" height="24" patternUnits="userSpaceOnUse">${circle(6, 6, 4, dot)}${circle(0, 18, 4, dot)}${circle(12, 18, 4, dot)}</pattern>`,
    `<mask id="${fade}"><rect width="${W}" height="${H}" fill="${ramp}"/></mask>`,
  )
  doc.body.push(
    `<rect width="${W}" height="${H}" mask="url(#${fade})" fill="url(#${dots})"/>`,
  )
  doc.body.push(circle(cx, cy, H * 0.1, paint('fill', P.hi)))
}

const contours: Draw = (doc, R, P) => {
  doc.rect(hsl(P.hue, 50, 7))
  const cx = W * (0.5 + R() * 0.3)
  const cy = H * (0.4 + R() * 0.2)
  const ph = [R() * 6, R() * 6, R() * 6]
  const levels = 18
  const rings: string[] = []
  for (let k = levels; k >= 1; k--) {
    const ring: [number, number][] = []
    for (let a = 0; a < 40; a++) {
      const t = (a / 40) * 2 * Math.PI
      const r =
        k * 20 +
        Math.sin(t * 3 + ph[0] + k * 0.2) * 11 +
        Math.sin(t * 5 + ph[1]) * 6 +
        Math.sin(t * 2 + ph[2] - k * 0.1) * k * 1.5
      ring.push([cx + Math.cos(t) * r * 1.3, cy + Math.sin(t) * r])
    }
    rings.push(
      `<path d="${poly(ring)}" ${paint('fill', hsl(lerp(P.h2, P.hue, k / levels), 70, 10 + (levels - k) * 2.9))}/>`,
    )
  }
  doc.body.push(
    `<g ${paint('stroke', hsl(P.h3, 90, 75, 0.35))} stroke-width="1.2" stroke-linejoin="round">${rings.join('')}</g>`,
  )
}

const panels: Draw = (doc, R, P) => {
  const colours = [P.a, P.b, P.c, P.dk, P.bg1, P.hi]
  doc.rect('#0a0c10')
  const out: string[] = []
  const split2 = (x: number, y: number, w: number, h: number, d: number) => {
    if (d > 3 || (d > 1 && R() < 0.25) || w < 70 || h < 50) {
      out.push(
        `<rect x="${num(x + 4)}" y="${num(y + 4)}" width="${num(w - 8)}" height="${num(h - 8)}" ${paint('fill', colours[Math.floor(R() * colours.length)])}/>`,
      )
      if (R() < 0.35) {
        out.push(
          circle(
            x + w / 2,
            y + h / 2,
            Math.min(w, h) * 0.3,
            'fill="#000" fill-opacity=".25"',
          ),
        )
      }
      return
    }
    if (w > h) {
      const s = w * (0.3 + R() * 0.4)
      split2(x, y, s, h, d + 1)
      split2(x + s, y, w - s, h, d + 1)
    } else {
      const s = h * (0.3 + R() * 0.4)
      split2(x, y, w, s, d + 1)
      split2(x, y + s, w, h - s, d + 1)
    }
  }
  split2(0, 0, W, H, 0)
  doc.body.push(out.join(''))
  doc.rect(
    doc.linear(0, 0, W, H, [
      [0, rgba('#000000', 0)],
      [1, rgba('#000000', 0.45)],
    ]),
  )
}

const DRAW: Record<Motif, Draw> = {
  shards,
  orb,
  ribbons,
  stripes,
  horizon,
  blocks,
  burst,
  contours,
  panels,
}

/** Height of the darkened band the title and meta lines sit on. */
const BAND = 158

/**
 * The motif, plus the label band, the gloss and the grain every cover shares.
 * The rounded edge is not here: the tile's own border draws it.
 */
export function coverSvg(seed: string): string {
  const doc = new Doc()
  const R = rng(hash(seed))
  const P = paletteFor(seed, R)
  DRAW[motifFor(seed)](doc, R, P)
  doc.rect(
    doc.linear(0, H - BAND, 0, H, [
      [0, rgba('#030508', 0)],
      [0.35, rgba('#030508', 0.66)],
      [1, rgba('#030508', 0.9)],
    ]),
    0,
    H - BAND,
    W,
    BAND,
  )
  const gloss = doc.linear(0, 0, 0, H * 0.42, [
    [0, rgba('#ffffff', 0.2)],
    [1, rgba('#ffffff', 0.02)],
  ])
  doc.body.push(
    `<ellipse cx="${num(W * 0.3)}" cy="${num(-H * 0.55)}" rx="${num(W * 1.1)}" ry="${num(H * 0.95)}" transform="rotate(-6.9 ${pt(W * 0.3, -H * 0.55)})" fill="${gloss}"/>`,
  )
  const grain = doc.id()
  doc.defs.push(
    `<filter id="${grain}"><feTurbulence type="fractalNoise" baseFrequency=".9" seed="7" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`,
  )
  doc.rect(
    '#000000',
    0,
    0,
    W,
    H,
    ` filter="url(#${grain})" opacity=".08" style="mix-blend-mode:overlay"`,
  )
  return doc.toString()
}

/* ---------------------------------------------------------------- type -- */

/**
 * Geist's advance widths for ASCII 32-126, in hundredths of an em, measured
 * from the subset the site ships. Anything else counts as 0.6em.
 */
const ADVANCE: Record<600 | 700, number[]> = {
  600: [
    23, 24, 38, 55, 66, 82, 68, 19, 32, 32, 43, 57, 23, 42, 23, 51, 69, 43, 64,
    64, 66, 66, 65, 59, 65, 65, 31, 31, 54, 55, 54, 58, 94, 72, 69, 72, 71, 62,
    60, 73, 72, 29, 62, 69, 59, 90, 75, 76, 66, 76, 69, 67, 61, 70, 72, 96, 69,
    67, 58, 39, 51, 39, 45, 56, 27, 60, 62, 58, 62, 59, 43, 62, 60, 27, 31, 63,
    31, 89, 60, 61, 62, 62, 41, 56, 43, 60, 58, 84, 63, 57, 58, 42, 28, 42, 52,
  ],
  700: [
    23, 25, 39, 59, 67, 83, 71, 20, 34, 34, 42, 57, 24, 42, 24, 52, 70, 45, 65,
    65, 68, 67, 66, 60, 67, 66, 31, 31, 54, 55, 54, 59, 96, 74, 70, 73, 72, 62,
    60, 74, 72, 30, 63, 70, 59, 91, 75, 77, 67, 77, 70, 68, 62, 70, 74, 99, 72,
    69, 60, 41, 52, 41, 46, 56, 28, 61, 64, 60, 64, 61, 45, 63, 61, 28, 33, 65,
    33, 90, 61, 62, 64, 64, 43, 57, 45, 61, 61, 85, 65, 59, 59, 42, 29, 42, 52,
  ],
}

export function textWidth(
  text: string,
  size: number,
  weight: 600 | 700,
  spacing = 0,
): number {
  const table = ADVANCE[weight]
  let em = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    em += code >= 32 && code < 127 ? table[code - 32] / 100 : 0.6
  }
  return em * size + spacing * [...text].length
}

/**
 * Hand-picked cover words. Anything missing gets the longest short word of
 * its title, which is usually right and occasionally very funny.
 */
const KEYWORDS: Record<string, string> = {
  'blog:embedding-emoji-search': 'EMOJI',
  'blog:thank-u-next': 'NEXT',
  'blog:xios': 'WAYLAND',
  'blog:weights': 'WEIGHTS',
  'blog:sandcastle': 'SANDBOX',
  'blog:introducing-HFSViewer': 'HFS+',
  'blog:the-new-maxleiter-com': 'NEW',
  'blog:rewrite-your-prompts': 'PROMPTS',
  'blog:seeing-the-future': 'FUTURE',
  'blog:formatting': 'FORMAT',
  'blog:vibecoding-minecraft-mods': 'MODS',
  'blog:sluggified-urls': 'SLUGS',
  'blog:ship-every-day': 'SHIP',
  'blog:mobile-browsers-resizing-font': 'FONTS',
  'blog:nintype': 'TYPE',
  'blog:build-a-blog-with-nextjs-13': 'RSC',
  'blog:node-has-tooling-problems': 'NODE',
  'blog:supabase-next-analytics': 'LIVE',
  'blog:easy-site-improvements': 'A11Y',
  'blog:hacker-sites': 'HACK',
  'blog:introducing-drift': 'DRIFT',
  'blog:contributing-to-oss': 'OSS',
  'blog:pin-dependencies': 'PIN',
  'blog:framework': 'LAPTOP',
  'blog:MSHW0184': 'LUX',
  'blog:X11': 'X11',
  'note:fish-directory-colors': 'FISH',
  'note:git-checkout-script': 'GIT',
  'note:updating-jsonb-drizzle': 'JSONB',
  'note:vscode-default-dir': 'DIR',
  'note:gemini-script': '.SH',
  'note:slack-message-fetch': 'FETCH',
  'note:swr-state': 'SWR',
  'note:wasm-edge-and-node': 'WASM',
  'project:x11-on-ios': 'X11',
  'project:drift': 'DRIFT',
  'project:the-lounge': 'IRC',
  'project:sortablejs-vue3': 'VUE 3',
  'project:knightos': 'Z80',
  'project:mshw0184-driver-for-linux-kernel': 'KERNEL',
  'project:jsontree': '{ }',
  'project:easyarty-com': 'ARTY',
  'project:v0': 'v0',
  'project:ai-sdk': 'SDK',
  'project:accuracy-of-computer-assisted-vertical-cup-to-disk-ratio-grading-for-glaucoma-screening':
    'RETINA',
  'profile:max-leiter': 'HELLO',
  'link:github': '</>',
  'link:x': '@',
  'link:rss': 'RSS',
  'index:blog': 'ARCHIVE',
  'index:notes': 'NOTES',
  'index:projects': 'ALL',
  'index:labs': 'LABS',
  'index:talks': 'TALKS',
  'work:https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent':
    'AGENT',
  'work:https://vercel.com/blog/v0-composite-model-family': 'MODELS',
  'work:https://vercel.com/blog/ai-sdk-3-generative-ui': 'GEN UI',
  'work:https://vercel.com/blog/introducing-the-vercel-ai-sdk': 'AI SDK',
  'work:https://vercel.com/blog/improving-the-accessibility-of-our-nextjs-site':
    'A11Y',
  'work:https://vercel.com/blog/new-edge-dev-infrastructure': 'EDGE',
}

const STOP = new Set(
  'a an the of on in to for and with your you is my why how i we our be it its are not still dont need good using via what from'.split(
    ' ',
  ),
)

export function keywordFor(seed: string, title: string): string {
  const picked = KEYWORDS[seed]
  if (picked) return picked
  const words = title
    .replace(/[^\w\s.+-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !STOP.has(word.toLowerCase()))
  let best = words[0] || title
  for (const word of words) {
    if (word.length > best.length && word.length <= 9) best = word
  }
  return best.toUpperCase()
}

export type CoverLayoutKind = 'center' | 'left' | 'huge'

export interface CoverText {
  seed: string
  title: string
  /** `BLOG · JUL 28, 2026`, already upper-cased. */
  meta: string
  /** `LATEST POST`, `NOTE`. */
  chip: string
}

export interface CoverLayout {
  kind: CoverLayoutKind
  keyword: string
  kw: { x: number; y: number; size: number; spacing: number; skew: boolean }
  lines: { text: string; x: number; y: number }[]
  meta: { text: string; x: number; y: number }
  chip: { text: string; x: number; y: number; w: number }
}

/** Font sizes and spacing in cover units, shared with the canvas drawer. */
export const TYPE = {
  title: { size: 30, weight: 600, lead: 35 },
  meta: { size: 14, weight: 700, spacing: 2.5 },
  chip: { size: 13, weight: 700, spacing: 2.5 },
} as const

function wrap(text: string, maxW: number, maxLines: number): string[] {
  const { size, weight } = TYPE.title
  const width = (t: string) => textWidth(t, size, weight)
  const lines: string[] = []
  let current = ''
  for (const word of text.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word
    if (width(next) > maxW && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (width(`${last}…`) > maxW && last.length) last = last.slice(0, -1)
  kept[maxLines - 1] = `${last.replace(/[\s,.:;]+$/, '')}…`
  return kept
}

export function coverLayout(text: CoverText): CoverLayout {
  const kind = (['center', 'left', 'huge'] as const)[hash(`${text.seed}L`) % 3]
  const keyword = keywordFor(text.seed, text.title)
  const spacing = kind === 'huge' ? -10 : -6
  let size = kind === 'huge' ? 250 : kind === 'left' ? 150 : 170
  const maxW = kind === 'huge' ? W * 1.05 : W * 0.8
  let tw = textWidth(keyword, size, 700, spacing)
  if (tw > maxW) {
    size *= maxW / tw
    tw = textWidth(keyword, size, 700, spacing)
  }
  const kw =
    kind === 'center'
      ? { x: (W - tw) / 2, y: H * 0.5 + size * 0.3 }
      : kind === 'left'
        ? { x: 30, y: 56 + size * 0.78 }
        : { x: -size * 0.06, y: 0 }

  const lines = wrap(text.title, W - 64, 2)
  const top = H - 30 - (lines.length - 1) * TYPE.title.lead - 28
  // The huge word sits low, but never on top of a two-line title.
  if (kind === 'huge') kw.y = Math.min(H * 0.73, top - 30)
  const chipText = text.chip.toUpperCase()
  return {
    kind,
    keyword,
    kw: { ...kw, size, spacing, skew: kind !== 'huge' },
    lines: lines.map((line, i) => ({
      text: line,
      x: 32,
      y: top + i * TYPE.title.lead,
    })),
    meta: { text: text.meta, x: 32, y: H - 24 },
    chip: {
      text: chipText,
      x: 24,
      y: 22,
      w:
        textWidth(
          chipText,
          TYPE.chip.size,
          TYPE.chip.weight,
          TYPE.chip.spacing,
        ) + 26,
    },
  }
}
