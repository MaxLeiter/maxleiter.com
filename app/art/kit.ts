/**
 * The style kit every card's art is drawn with.
 *
 * One art direction: late-2000s console key art. Each card is a lit stage --
 * a deep two-tone backdrop, a spotlight bloom behind the subject, soft rays
 * and bokeh, a glossy floor that mirrors whatever stands on it -- with one
 * hero subject drawn as chunky, glossy vector: a lit face gradient, a darker
 * extruded side, a rim of light and a specular band across the top. The
 * title band covers the bottom left, so subjects sit centre-right and above
 * the floor line.
 *
 * The art is SVG source, 640x400 user units, with no text in it (the card's
 * type is drawn over it in the page's own font). `scripts/bake-art.ts` bakes
 * each piece to a committed WebP; the build only checks it is current.
 */

export const W = 640
export const H = 400
/** The floor line. Things stand on it and are mirrored below it. */
export const FLOOR = 304

export type Pt = [number, number]

/** `hsla()` with the hue wrapped, the form every fill here uses. */
export function hsl(h: number, s: number, l: number, a = 1): string {
  const hue = ((h % 360) + 360) % 360
  return `hsla(${Math.round(hue)},${s}%,${l}%,${a})`
}

const n = (x: number) => String(Math.round(x * 10) / 10)

/** A tiny deterministic generator, so scatterings are stable per piece. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Stop = [number, string]

export interface Look {
  /** The stage's key hue. */
  hue: number
  /** The backdrop's top hue; defaults to a cool shift of `hue`. */
  hue2?: number
  /** Where the spotlight blooms, in user units. */
  spot?: Pt
  /** 0 for a flat backdrop with no floor (space, water, an open sky). */
  floor?: boolean
  /** Brightness of the bloom behind the subject. */
  bloom?: number
  seed?: number
}

export class Kit {
  readonly hue: number
  readonly hue2: number
  readonly rand: () => number
  private defs: string[] = []
  private layers: string[] = []
  private next = 0
  private blurs = new Map<number, string>()

  constructor(readonly look: Look) {
    this.hue = look.hue
    this.hue2 = look.hue2 ?? look.hue + 40
    this.rand = seeded(look.seed ?? look.hue * 7919 + 17)
  }

  /* -------------------------------------------------------- defs -- */

  id(): string {
    return `k${(this.next++).toString(36)}`
  }

  private stops(stops: Stop[]): string {
    return stops
      .map(([o, c]) => `<stop offset="${n(o)}" stop-color="${c}"/>`)
      .join('')
  }

  /** A linear gradient in user space; returns `url(#id)`. */
  lin(x1: number, y1: number, x2: number, y2: number, stops: Stop[]): string {
    const id = this.id()
    this.defs.push(
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}">${this.stops(stops)}</linearGradient>`,
    )
    return `url(#${id})`
  }

  /** A radial gradient in user space, optionally with a focal point. */
  rad(cx: number, cy: number, r: number, stops: Stop[], f?: Pt): string {
    const id = this.id()
    const focal = f ? ` fx="${n(f[0])}" fy="${n(f[1])}"` : ''
    this.defs.push(
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"${focal}>${this.stops(stops)}</radialGradient>`,
    )
    return `url(#${id})`
  }

  /** A Gaussian blur filter, shared per strength. */
  blur(sd: number): string {
    let id = this.blurs.get(sd)
    if (!id) {
      id = this.id()
      this.blurs.set(sd, id)
      this.defs.push(
        `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`,
      )
    }
    return `url(#${id})`
  }

  /** A clip path from markup; returns its `url(#id)`. */
  clip(shape: string): string {
    const id = this.id()
    this.defs.push(`<clipPath id="${id}">${shape}</clipPath>`)
    return `url(#${id})`
  }

  /** A soft glow: the shape again behind itself, blurred. */
  glow(shape: string, sd = 8, opacity = 0.8): string {
    return `<g filter="${this.blur(sd)}" opacity="${opacity}">${shape}</g>${shape}`
  }

  add(...markup: string[]): this {
    this.layers.push(...markup)
    return this
  }

  /* --------------------------------------------------- primitives -- */

  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
    attrs = '',
  ): string {
    return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" fill="${fill}" ${attrs}/>`
  }

  circle(cx: number, cy: number, r: number, fill: string, attrs = ''): string {
    return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}" ${attrs}/>`
  }

  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    fill: string,
    attrs = '',
  ): string {
    return `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" ${attrs}/>`
  }

  path(d: string, fill: string, attrs = ''): string {
    return `<path d="${d}" fill="${fill}" ${attrs}/>`
  }

  poly(points: Pt[], fill: string, attrs = ''): string {
    return this.path(
      `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`,
      fill,
      attrs,
    )
  }

  line(points: Pt[], stroke: string, width: number, attrs = ''): string {
    return `<path d="M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}" fill="none" stroke="${stroke}" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round" ${attrs}/>`
  }

  /** A smooth curve through points (Catmull-Rom as cubic Béziers). */
  curve(points: Pt[], stroke: string, width: number, attrs = ''): string {
    let d = `M${n(points[0][0])} ${n(points[0][1])}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]
      const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
      const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
      d += `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`
    }
    return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round" ${attrs}/>`
  }

  /* ------------------------------------------------------ the look -- */

  /** The backdrop: sky, bloom, rays, bokeh, floor, horizon, vignette. */
  stage(): this {
    const { hue, hue2 } = this
    const floor = this.look.floor !== false
    const [sx, sy] = this.look.spot ?? [400, 150]
    const bloom = this.look.bloom ?? 1
    const horizon = floor ? FLOOR : H
    this.add(
      this.rect(
        0,
        0,
        W,
        H,
        0,
        this.lin(0, 0, 0, horizon, [
          [0, hsl(hue2, 55, 7)],
          [0.65, hsl(hue, 55, 17)],
          [1, hsl(hue, 60, 27)],
        ]),
      ),
      this.rect(
        0,
        0,
        W,
        H,
        0,
        this.rad(sx, sy, 300, [
          [0, hsl(hue, 95, 66, 0.62 * bloom)],
          [0.45, hsl(hue, 90, 55, 0.22 * bloom)],
          [1, hsl(hue, 90, 50, 0)],
        ]),
      ),
    )
    // Rays from above the subject, fanning to the floor.
    let rays = ''
    for (let i = 0; i < 7; i++) {
      const top = sx - 150 + i * 50 + (this.rand() - 0.5) * 20
      const spread = 20 + this.rand() * 40
      rays += this.poly(
        [
          [top - 4, -10],
          [top + 4, -10],
          [top + (top - sx) * 0.9 + spread, horizon],
          [top + (top - sx) * 0.9 - spread, horizon],
        ],
        hsl(hue + 20, 60, 90, 0.05 + this.rand() * 0.05),
      )
    }
    this.add(`<g filter="${this.blur(7)}">${rays}</g>`)
    let bokeh = ''
    for (let i = 0; i < 14; i++) {
      const r = 4 + this.rand() * 18
      bokeh += this.circle(
        this.rand() * W,
        this.rand() * (horizon - 30),
        r,
        hsl(hue + (this.rand() - 0.5) * 80, 90, 72, 0.08 + this.rand() * 0.16),
      )
    }
    this.add(`<g filter="${this.blur(2.5)}">${bokeh}</g>`)
    if (floor) {
      this.add(
        this.rect(
          0,
          FLOOR,
          W,
          H - FLOOR,
          0,
          this.lin(0, FLOOR, 0, H, [
            [0, hsl(hue, 40, 15)],
            [1, '#040508'],
          ]),
        ),
        this.ellipse(
          sx,
          FLOOR + 22,
          260,
          46,
          this.rad(sx, FLOOR + 22, 260, [
            [0, hsl(hue, 80, 62, 0.28)],
            [1, hsl(hue, 80, 50, 0)],
          ]),
        ),
        `<rect x="0" y="${FLOOR - 1}" width="${W}" height="2" fill="${hsl(hue + 20, 70, 85, 0.35)}" filter="${this.blur(1.5)}"/>`,
      )
    }
    return this
  }

  /** Darkens the corners. Call last, after the subject. */
  vignette(strength = 0.6): this {
    return this.add(
      this.rect(
        0,
        0,
        W,
        H,
        0,
        this.rad(W / 2, H * 0.45, 440, [
          [0.55, 'rgba(0,0,0,0)'],
          [1, `rgba(0,0,0,${strength})`],
        ]),
      ),
    )
  }

  /**
   * Something standing on the floor: its contact shadow, its mirror image
   * fading into the floor, then the thing itself.
   */
  standing(markup: string, cx: number, rx: number, reflect = 0.3): this {
    const fade = this.id()
    this.add(
      `<mask id="${fade}" maskUnits="userSpaceOnUse" x="0" y="${FLOOR}" width="${W}" height="${H - FLOOR}"><rect x="0" y="${FLOOR}" width="${W}" height="${H - FLOOR}" fill="${this.lin(
        0,
        FLOOR,
        0,
        FLOOR + 90,
        [
          [0, 'white'],
          [1, 'black'],
        ],
      )}"/></mask>`,
    )
    this.add(
      `<g mask="url(#${fade})" opacity="${reflect}"><g transform="matrix(1 0 0 -1 0 ${2 * FLOOR})" filter="${this.blur(1.2)}">${markup}</g></g>`,
      this.ellipse(
        cx,
        FLOOR + 2,
        rx,
        9,
        'rgba(0,0,0,.55)',
        `filter="${this.blur(5)}"`,
      ),
      markup,
    )
    return this
  }

  /** A four-point star with a soft halo. */
  sparkle(x: number, y: number, r: number, color = '#fff'): string {
    const k = r * 0.22
    const star = this.path(
      `M${n(x)} ${n(y - r)}Q${n(x + k)} ${n(y - k)} ${n(x + r)} ${n(y)}Q${n(x + k)} ${n(y + k)} ${n(x)} ${n(y + r)}Q${n(x - k)} ${n(y + k)} ${n(x - r)} ${n(y)}Q${n(x - k)} ${n(y - k)} ${n(x)} ${n(y - r)}Z`,
      color,
    )
    return `${this.circle(x, y, r * 0.9, color, `opacity=".35" filter="${this.blur(r * 0.35)}"`)}${star}`
  }

  sparkles(count: number, box: [number, number, number, number]): string {
    let out = ''
    for (let i = 0; i < count; i++) {
      out += this.sparkle(
        box[0] + this.rand() * box[2],
        box[1] + this.rand() * box[3],
        3 + this.rand() * 7,
        hsl(this.hue + 30, 100, 92),
      )
    }
    return out
  }

  /** A specular band across a shape's top: the "glossy" in glossy. */
  gloss(shape: string, top: number, height: number, strength = 0.45): string {
    const c = this.clip(shape)
    return `<g clip-path="${c}"><rect x="-20" y="${n(top - 10)}" width="${W + 40}" height="${n(height * 0.55 + 10)}" fill="${this.lin(
      0,
      top,
      0,
      top + height * 0.55,
      [
        [0, `rgba(255,255,255,${strength})`],
        [1, 'rgba(255,255,255,0.02)'],
      ],
    )}"/></g>`
  }

  /**
   * A glossy extruded panel: the darker side offset below and right, the lit
   * face, a rim of light and a specular band. The workhorse for devices,
   * cards, keys and boxes.
   */
  slab(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    o: { face: [string, string]; side?: string; depth?: number; rim?: string },
  ): string {
    const depth = o.depth ?? 8
    const side = o.side ?? 'rgba(0,0,0,.55)'
    const face = this.lin(x, y, x + w * 0.3, y + h, [
      [0, o.face[0]],
      [1, o.face[1]],
    ])
    const shape = this.rect(x, y, w, h, r, '#fff')
    return (
      this.rect(x + depth * 0.4, y + depth, w, h, r, side) +
      this.rect(x, y, w, h, r, face) +
      this.gloss(shape, y, h, 0.32) +
      this.rect(
        x + 0.75,
        y + 0.75,
        w - 1.5,
        h - 1.5,
        Math.max(0, r - 0.75),
        'none',
        `stroke="${o.rim ?? 'rgba(255,255,255,.5)'}" stroke-width="1.5"`,
      )
    )
  }

  /** A glossy sphere lit from the upper left. */
  orb(cx: number, cy: number, r: number, hue: number, light = 62): string {
    return (
      this.circle(
        cx,
        cy,
        r,
        this.rad(
          cx - r * 0.35,
          cy - r * 0.4,
          r * 1.45,
          [
            [0, hsl(hue, 90, Math.min(95, light + 30))],
            [0.35, hsl(hue, 85, light)],
            [0.85, hsl(hue, 80, light - 34)],
            [1, hsl(hue, 70, light - 44)],
          ],
          [cx - r * 0.4, cy - r * 0.45],
        ),
      ) +
      this.ellipse(
        cx - r * 0.25,
        cy - r * 0.5,
        r * 0.55,
        r * 0.3,
        'rgba(255,255,255,.55)',
        `filter="${this.blur(r * 0.08)}"`,
      ) +
      this.circle(
        cx,
        cy,
        r - 0.8,
        'none',
        `stroke="${hsl(hue + 30, 100, 85, 0.45)}" stroke-width="1.5"`,
      )
    )
  }

  /** An isometric cube; `top`, `left`, `right` face colours. */
  cube(
    cx: number,
    cy: number,
    s: number,
    faces: [string, string, string],
  ): string {
    const k = s * 0.87
    return (
      this.poly(
        [
          [cx - k, cy - s * 0.5],
          [cx, cy],
          [cx, cy + s],
          [cx - k, cy + s * 0.5],
        ],
        faces[1],
      ) +
      this.poly(
        [
          [cx + k, cy - s * 0.5],
          [cx, cy],
          [cx, cy + s],
          [cx + k, cy + s * 0.5],
        ],
        faces[2],
      ) +
      this.poly(
        [
          [cx, cy - s],
          [cx + k, cy - s * 0.5],
          [cx, cy],
          [cx - k, cy - s * 0.5],
        ],
        faces[0],
      )
    )
  }

  /** Rows of rounded bars that read as code or text from across a room. */
  bars(
    x: number,
    y: number,
    w: number,
    rows: number,
    o: {
      lead?: number
      height?: number
      colors?: string[]
      indent?: number[]
    } = {},
  ): string {
    const lead = o.lead ?? 12
    const height = o.height ?? 5
    const colors = o.colors ?? ['rgba(255,255,255,.55)']
    let out = ''
    for (let i = 0; i < rows; i++) {
      const indent = (o.indent?.[i % o.indent.length] ?? 0) * 14
      let at = x + indent
      const end = x + w * (0.45 + this.rand() * 0.55)
      let j = 0
      while (at < end - 6) {
        const len = Math.min(end - at, 10 + this.rand() * 34)
        out += this.rect(
          at,
          y + i * lead,
          len,
          height,
          height / 2,
          colors[(i + j) % colors.length],
        )
        at += len + 5
        j++
      }
    }
    return out
  }

  /** A screen: dark glass, its content clipped inside, a sheen across it. */
  screen(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    content: string,
  ): string {
    const shape = this.rect(x, y, w, h, r, '#fff')
    const c = this.clip(shape)
    return `${this.rect(
      x,
      y,
      w,
      h,
      r,
      this.lin(x, y, x, y + h, [
        [0, '#0d1420'],
        [1, '#05070c'],
      ]),
    )}<g clip-path="${c}">${content}${this.poly(
      [
        [x + w * 0.15, y - 5],
        [x + w * 0.62, y - 5],
        [x + w * 0.3, y + h + 5],
        [x - w * 0.2, y + h + 5],
      ],
      'rgba(255,255,255,.07)',
    )}</g>`
  }

  /** A desktop window: title bar with three dots, body fill, content. */
  window(
    x: number,
    y: number,
    w: number,
    h: number,
    o: { bar: string; body: string; content?: string; r?: number },
  ): string {
    const r = o.r ?? 6
    const shape = this.rect(x, y, w, h, r, '#fff')
    const c = this.clip(shape)
    return `${this.rect(
      x + 3,
      y + 6,
      w,
      h,
      r,
      'rgba(0,0,0,.45)',
      `filter="${this.blur(4)}"`,
    )}<g clip-path="${c}">${this.rect(x, y, w, h, 0, o.body)}${this.rect(x, y, w, 16, 0, o.bar)}${this.circle(x + 9, y + 8, 3, '#ff6b5e')}${this.circle(x + 19, y + 8, 3, '#ffc23d')}${this.circle(x + 29, y + 8, 3, '#36d26a')}${o.content ?? ''}</g>${this.rect(
      x + 0.5,
      y + 0.5,
      w - 1,
      h - 1,
      r,
      'none',
      'stroke="rgba(255,255,255,.35)" stroke-width="1"',
    )}`
  }

  /** A sheet of paper with a folded corner and lines of text. */
  sheet(
    x: number,
    y: number,
    w: number,
    h: number,
    rows = 6,
    ink = 'rgba(30,40,60,.35)',
  ): string {
    const fold = Math.min(w, h) * 0.18
    const body = `M${n(x)} ${n(y)}H${n(x + w - fold)}L${n(x + w)} ${n(y + fold)}V${n(y + h)}H${n(x)}Z`
    return (
      this.path(
        body,
        'rgba(0,0,0,.4)',
        `transform="translate(3 5)" filter="${this.blur(3)}"`,
      ) +
      this.path(
        body,
        this.lin(x, y, x + w * 0.4, y + h, [
          [0, '#ffffff'],
          [1, '#dfe4ec'],
        ]),
      ) +
      this.path(
        `M${n(x + w - fold)} ${n(y)}V${n(y + fold)}H${n(x + w)}Z`,
        '#b9c1cd',
      ) +
      this.bars(x + w * 0.12, y + h * 0.16, w * 0.72, rows, {
        colors: [ink],
        height: Math.max(3, h * 0.035),
        lead: (h * 0.72) / rows,
      })
    )
  }

  /** A rounded speech bubble with its tail at the bottom left or right. */
  bubble(
    x: number,
    y: number,
    w: number,
    h: number,
    face: [string, string],
    tail: 'left' | 'right' = 'left',
  ): string {
    const r = Math.min(h / 2, 22)
    const tx = tail === 'left' ? x + w * 0.22 : x + w * 0.78
    const dir = tail === 'left' ? -1 : 1
    const d = `M${n(x + r)} ${n(y)}H${n(x + w - r)}Q${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + r)}V${n(y + h - r)}Q${n(x + w)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)}H${n(tx + 12)}L${n(tx + dir * 14)} ${n(y + h + 18)}L${n(tx - 6)} ${n(y + h)}H${n(x + r)}Q${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - r)}V${n(y + r)}Q${n(x)} ${n(y)} ${n(x + r)} ${n(y)}Z`
    const fill = this.lin(x, y, x, y + h, [
      [0, face[0]],
      [1, face[1]],
    ])
    return (
      this.path(
        d,
        'rgba(0,0,0,.45)',
        `transform="translate(3 6)" filter="${this.blur(4)}"`,
      ) +
      this.path(d, fill) +
      this.gloss(this.path(d, '#fff'), y, h, 0.35) +
      this.path(d, 'none', 'stroke="rgba(255,255,255,.55)" stroke-width="1.5"')
    )
  }

  /** An upright cylinder: a database, a can, a drum, a tower. */
  cylinder(
    cx: number,
    top: number,
    rx: number,
    h: number,
    hue: number,
    light = 55,
  ): string {
    const ry = rx * 0.32
    const side = this.lin(cx - rx, 0, cx + rx, 0, [
      [0, hsl(hue, 70, light - 25)],
      [0.35, hsl(hue, 80, light + 12)],
      [0.6, hsl(hue, 75, light)],
      [1, hsl(hue, 70, light - 30)],
    ])
    return (
      this.path(
        `M${n(cx - rx)} ${n(top)}V${n(top + h)}A${n(rx)} ${n(ry)} 0 0 0 ${n(cx + rx)} ${n(top + h)}V${n(top)}Z`,
        side,
      ) +
      this.ellipse(
        cx,
        top,
        rx,
        ry,
        this.lin(0, top - ry, 0, top + ry, [
          [0, hsl(hue, 80, light + 28)],
          [1, hsl(hue, 75, light + 6)],
        ]),
      ) +
      this.ellipse(
        cx,
        top,
        rx - 0.75,
        ry - 0.75,
        'none',
        `stroke="${hsl(hue + 20, 100, 90, 0.7)}" stroke-width="1.5"`,
      )
    )
  }

  /** A folder icon: back flap with a tab, glossy front. */
  folder(x: number, y: number, w: number, h: number, hue: number): string {
    const tab = `M${n(x)} ${n(y + 8)}Q${n(x)} ${n(y)} ${n(x + 8)} ${n(y)}H${n(x + w * 0.36)}L${n(x + w * 0.44)} ${n(y + h * 0.12)}H${n(x + w - 8)}Q${n(x + w)} ${n(y + h * 0.12)} ${n(x + w)} ${n(y + h * 0.12 + 8)}V${n(y + h)}H${n(x)}Z`
    return (
      this.path(
        tab,
        'rgba(0,0,0,.45)',
        `transform="translate(4 7)" filter="${this.blur(4)}"`,
      ) +
      this.path(tab, hsl(hue, 70, 38)) +
      this.sheet(x + w * 0.1, y + h * 0.06, w * 0.8, h * 0.6, 3) +
      this.slab(x - w * 0.02, y + h * 0.28, w * 1.04, h * 0.72, 8, {
        face: [hsl(hue, 85, 66), hsl(hue, 80, 44)],
        side: hsl(hue, 70, 22),
        depth: 5,
      })
    )
  }

  /**
   * The SVG document. Every number is cut to two decimals: a piece computed
   * with `Math.sin` can differ in its last bit between JavaScript engines,
   * and the build (Node) must hash the same text the bake (Bun) did.
   */
  toString(): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${this.defs.join('')}</defs>${this.layers.join('')}</svg>`
    return svg.replace(/-?\d+\.\d{3,}(e-?\d+)?/g, (m) =>
      String(Math.round(Number(m) * 100) / 100),
    )
  }
}

export interface ArtPiece {
  /** Every seed this art is for: a post and the project that links it. */
  seeds: string[]
  draw(): string
}

export function art(seeds: string[], draw: () => string): ArtPiece {
  return { seeds, draw }
}
