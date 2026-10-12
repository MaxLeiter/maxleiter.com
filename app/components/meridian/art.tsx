import type { ReactElement } from 'react'
import { hashStr, rng, type ForgeCategory } from '@lib/meridian'

/**
 * MERIDIAN's procedural pictures, painted as SVG at build time from a seed.
 *
 * The prototype painted these into canvases on the client. Here they are
 * markup: a slug always yields the same plate, they cost no request and no
 * script, and they render with JavaScript off. Every one is decorative --
 * the text beside it carries the same information -- so each is
 * `aria-hidden`.
 *
 * Gradient ids are derived from the seed, so two plates on one page never
 * collide, and the same plate rendered twice (the home island hydrating over
 * its own markup) produces the same ids.
 */

type Rgb = [number, number, number]

const hex = (value: string): Rgb => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16),
]
const mix = (a: Rgb, b: Rgb, t: number): Rgb =>
  a.map((x, i) => Math.round(x + (b[i] - x) * t)) as Rgb
const rgb = (c: Rgb, alpha = 1) => `rgba(${c[0]},${c[1]},${c[2]},${alpha})`
const n1 = (value: number) => Math.round(value * 10) / 10
const n0 = Math.round

interface Palette {
  name: string
  sky: [string, string, string]
  sun: string
  fog: string
  land: [string, string, string]
  acc: string
}

const PALETTES: Palette[] = [
  {
    name: 'dawn',
    sky: ['#0b1630', '#3d4a78', '#e7a06c'],
    sun: '#ffe6bc',
    fog: '#e9ad83',
    land: ['#7c6476', '#4a3a52', '#1d1624'],
    acc: '#ffd39a',
  },
  {
    name: 'day',
    sky: ['#15406a', '#3f86b8', '#bfe2ee'],
    sun: '#ffffff',
    fog: '#c6e6ef',
    land: ['#6f909a', '#3c5e68', '#142730'],
    acc: '#e9f8ff',
  },
  {
    name: 'dusk',
    sky: ['#120a24', '#4d2653', '#d0718a'],
    sun: '#ffd0c0',
    fog: '#cf8399',
    land: ['#5d3d62', '#30213e', '#120c19'],
    acc: '#ffb3c2',
  },
  {
    name: 'storm',
    sky: ['#11181f', '#34434e', '#7d929c'],
    sun: '#dfeaf0',
    fog: '#92a6b0',
    land: ['#4f5d64', '#2b3439', '#101416'],
    acc: '#c9e3f0',
  },
  {
    name: 'night',
    sky: ['#01040b', '#06142a', '#123045'],
    sun: '#bfe8ff',
    fog: '#1f4258',
    land: ['#13212b', '#0a141b', '#030609'],
    acc: '#7dffcf',
  },
  {
    name: 'desert',
    sky: ['#2d5579', '#6f9fc4', '#efd5a2'],
    sun: '#fff6e0',
    fog: '#f0d9aa',
    land: ['#b38c5c', '#7b5a39', '#33261a'],
    acc: '#fff0c8',
  },
]

/** Midpoint displacement: a ridge line of `n + 1` heights. */
function ridge(r: () => number, n: number, rough: number): number[] {
  const pts = Array.from({ length: n + 1 }, () => 0)
  pts[0] = r()
  pts[n] = r()
  let step = n
  let amp = 1
  while (step > 1) {
    const half = step >> 1
    for (let i = half; i < n; i += step) {
      pts[i] = (pts[i - half] + pts[i + half]) / 2 + (r() - 0.5) * amp
    }
    amp *= rough
    step = half
  }
  return pts
}

/** An elliptical arc from angle `a0` to `a1`, as path data. */
function arc(rx: number, ry: number, a0: number, a1: number): string {
  const x0 = n1(Math.cos(a0) * rx)
  const y0 = n1(Math.sin(a0) * ry)
  const x1 = n1(Math.cos(a1) * rx)
  const y1 = n1(Math.sin(a1) * ry)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M${x0} ${y0}A${n1(rx)} ${n1(ry)} 0 ${large} 1 ${x1} ${y1}`
}

const W = 480
const H = 270

/** A landscape on the ring's inner surface, the band arcing overhead. */
function Landscape({ seed, id }: { seed: number; id: string }) {
  const r = rng(seed)
  const P = PALETTES[Math.floor(r() * PALETTES.length)]
  const hz = H * (0.52 + r() * 0.14)
  const night = P.name === 'night' || P.name === 'dusk'
  const stars: ReactElement[] = []
  if (night) {
    for (let i = 0; i < 24; i++) {
      stars.push(
        <rect
          key={i}
          x={n0(r() * W)}
          y={n0(r() * hz * 0.9)}
          width="1"
          height="1"
          fill="#e6f0ff"
          opacity={n1(Math.pow(r(), 3) * 0.9)}
        />,
      )
    }
  }
  const cx = W * (0.2 + r() * 0.6)
  const rx = W * (0.9 + r() * 0.8)
  const ry = hz * (0.75 + r() * 0.5)
  const tilt = (r() - 0.5) * 0.35
  const band = Math.max(3, H * 0.022)
  const sx = W * (0.15 + r() * 0.7)
  const sy = hz * (0.35 + r() * 0.5)
  const layers: ReactElement[] = []
  for (let L = 0; L < 3; L++) {
    const t = L / 2
    const col = mix(mix(hex(P.fog), hex(P.land[0]), 0.35), hex(P.land[2]), t)
    const base = hz + (H - hz) * (t * 0.85) - H * 0.02
    const amp = H * (0.22 - t * 0.1) * (0.6 + r() * 0.6)
    const pts = ridge(r, 16, 0.55)
    const line = pts
      .map((p, i) => `${n0((i / 16) * W)},${n0(base - p * amp)}`)
      .join(' ')
    layers.push(
      <polygon key={L} points={`0,${H} ${line} ${W},${H}`} fill={rgb(col)} />,
    )
    if (L < 2) {
      layers.push(
        <rect
          key={`f${L}`}
          y={n0(base - amp)}
          width={W}
          height={n0(H - base + amp)}
          fill={`url(#${id}f)`}
          opacity={L ? 0.5 : 1}
        />,
      )
    }
    if (L === 1 && r() > 0.25) {
      const count = 1 + Math.floor(r() * 3)
      const x0 = r() * W
      for (let k = 0; k < count; k++) {
        const px = (x0 + k * W * 0.07) % W
        const ph = H * (0.16 + r() * 0.22)
        const pw = Math.max(4, W * 0.012)
        const yb = base - pts[Math.round((px / W) * 16)] * amp + 4
        layers.push(
          <g key={`s${k}`}>
            <polygon
              points={`${n1(px - pw)},${n1(yb)} ${n1(px - pw * 0.35)},${n1(yb - ph)} ${n1(px + pw * 0.35)},${n1(yb - ph)} ${n1(px + pw)},${n1(yb)}`}
              fill={rgb(mix(col, [0, 0, 0], 0.25))}
            />
            <rect
              x={n1(px - 0.6)}
              y={n1(yb - ph * 0.95)}
              width="1.2"
              height={n1(ph * 0.8)}
              fill={rgb(hex(P.acc), 0.5)}
            />
            <circle cx={n1(px)} cy={n1(yb - ph)} r="9" fill={`url(#${id}b)`} />
          </g>,
        )
      }
    }
  }
  return (
    <>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.sky[0]} />
          <stop offset={n1((0.55 * hz) / H)} stopColor={P.sky[1]} />
          <stop offset={n1(hz / H)} stopColor={P.sky[2]} />
        </linearGradient>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.sky[2]} stopOpacity="0" />
          <stop offset="1" stopColor={P.sky[2]} stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={`${id}u`}>
          <stop offset="0" stopColor={P.sun} />
          <stop offset="0.04" stopColor={P.sun} stopOpacity="0.9" />
          <stop offset="0.2" stopColor={P.sun} stopOpacity="0.25" />
          <stop offset="1" stopColor={P.sun} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}b`}>
          <stop offset="0" stopColor={P.acc} stopOpacity="0.55" />
          <stop offset="1" stopColor={P.acc} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}v`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.35" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.fog} stopOpacity="0" />
          <stop offset="1" stopColor={P.fog} stopOpacity=".22" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}s)`} />
      {stars}
      <g
        transform={`translate(${n1(cx)} ${n1(hz + ry * 0.12)}) rotate(${n1((tilt * 180) / Math.PI)})`}
        fill="none"
      >
        <path
          d={arc(rx, ry, Math.PI * 1.04, Math.PI * 1.96)}
          stroke={rgb(mix(hex(P.sky[2]), hex(P.sun), 0.5), 0.7)}
          strokeWidth={n1(band)}
        />
        <path
          d={arc(
            rx + band * 0.5,
            ry + band * 0.5,
            Math.PI * 1.04,
            Math.PI * 1.96,
          )}
          stroke={rgb(hex(P.land[2]), 0.5)}
          strokeWidth={n1(band * 0.35)}
        />
      </g>
      <rect
        y={n1(hz - H * 0.25)}
        width={W}
        height={n1(H * 0.25)}
        fill={`url(#${id}h)`}
      />
      <circle
        cx={n1(sx)}
        cy={n1(sy)}
        r={n1(H * 0.6)}
        fill={`url(#${id}u)`}
        style={{ mixBlendMode: 'screen' }}
      />
      {layers}
      <rect width={W} height={H} fill={`url(#${id}v)`} />
    </>
  )
}

/** A corridor receding to a lit doorway: the theater's film stills. */
function Interior({ seed, id }: { seed: number; id: string }) {
  const r = rng(seed)
  const tint: Rgb = r() > 0.5 ? [90, 200, 255] : [255, 170, 80]
  const tint2: Rgb = r() > 0.5 ? [255, 120, 90] : [120, 255, 200]
  const vx = W * (0.38 + r() * 0.24)
  const vy = H * (0.42 + r() * 0.16)
  const frames: ReactElement[] = []
  const depth = 12
  for (let i = depth; i >= 0; i--) {
    const t = i / depth
    const s = Math.pow(1 - t, 1.6) * 1.15 + 0.05
    const x0 = vx - vx * s * 1.2
    const x1 = vx + (W - vx) * s * 1.2
    const y0 = vy - vy * s * 1.1
    const y1 = vy + (H - vy) * s * 1.1
    const lum = 0.06 + (1 - t) * 0.05
    frames.push(
      <rect
        key={i}
        x={n1(x0)}
        y={n1(y0)}
        width={n1(x1 - x0)}
        height={n1(y1 - y0)}
        fill="none"
        stroke={rgb(mix([20, 30, 40], tint, lum), 0.9)}
        strokeWidth={n1(1 + (1 - t) * 3)}
      />,
    )
    if (i % 3 === 0) {
      frames.push(
        <rect
          key={`l${i}`}
          x={n1(x0 + (x1 - x0) * 0.3)}
          y={n1(y0 + 1)}
          width={n1((x1 - x0) * 0.4)}
          height={n1(Math.max(1, 3 * (1 - t)))}
          fill={rgb(tint, n1((0.25 + 0.4 * (1 - t)) * 10) / 10)}
        />,
      )
    }
  }
  const lights: ReactElement[] = []
  for (let i = 0; i < 6; i++) {
    const side = r() > 0.5 ? 1 : -1
    const t = r()
    const x = vx + side * (W * 0.08 + t * W * 0.45)
    const y = vy + (r() - 0.5) * H * 0.5 * (0.3 + t)
    const size = n1(2 + t * 4)
    lights.push(
      <rect
        key={i}
        x={n1(x)}
        y={n1(y)}
        width={size}
        height={size}
        fill={rgb(tint2, 0.8)}
      />,
    )
  }
  const figure = r() > 0.4
  const fx = vx + (r() - 0.5) * W * 0.12
  const fh = H * 0.22
  const fy = vy + fh * 0.4
  return (
    <>
      <defs>
        <radialGradient id={`${id}d`} cx={n1(vx / W)} cy={n1(vy / H)} r="0.45">
          <stop offset="0" stopColor={rgb(mix(tint, [255, 255, 255], 0.6))} />
          <stop offset="0.15" stopColor={rgb(tint, 0.35)} />
          <stop offset="1" stopColor={rgb(tint, 0)} />
        </radialGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={rgb(tint, 0.2)} />
          <stop offset="1" stopColor={rgb(tint, 0)} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="#030609" />
      {frames}
      <rect width={W} height={H} fill={`url(#${id}d)`} />
      <polygon
        points={`${n1(vx - 6)},${n1(vy)} ${n1(vx + 6)},${n1(vy)} ${n1(vx + W * 0.16)},${H} ${n1(vx - W * 0.16)},${H}`}
        fill={`url(#${id}r)`}
      />
      {lights}
      {figure && (
        <g fill="#020305">
          <ellipse
            cx={n1(fx)}
            cy={n1(fy - fh * 0.88)}
            rx={n1(fh * 0.07)}
            ry={n1(fh * 0.09)}
          />
          <polygon
            points={[
              [fx - fh * 0.14, fy - fh * 0.75],
              [fx + fh * 0.14, fy - fh * 0.75],
              [fx + fh * 0.1, fy - fh * 0.3],
              [fx + fh * 0.08, fy],
              [fx - fh * 0.08, fy],
              [fx - fh * 0.1, fy - fh * 0.3],
            ]
              .map(([x, y]) => `${n1(x)},${n1(y)}`)
              .join(' ')}
          />
        </g>
      )}
    </>
  )
}

/**
 * A mission plate (`land`) or a film still (`film`), cover-fitted to its box
 * the way the prototype's canvases were.
 */
export function Plate({
  seed,
  kind,
  className,
}: {
  seed: string
  kind: 'land' | 'film'
  className?: string
}) {
  const hash = hashStr(seed)
  // Short on purpose: an id is repeated in every `url(#...)` that uses it.
  const id = `p${(hash % 46656).toString(36)}${kind[0]}`
  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {kind === 'film' ? (
        <Interior seed={hash} id={id} />
      ) : (
        <Landscape seed={hash} id={id} />
      )}
    </svg>
  )
}

/* ----------------------------------------------------------- emblems -- */

/** The hex-shield service emblem: a ring and a four-point star. */
export function Emblem({ id }: { id: string }) {
  return (
    <svg className="mx-emblem" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f6aa2" />
          <stop offset="1" stopColor="#0b1a2c" />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3d2" />
          <stop offset=".5" stopColor="#f2bd5a" />
          <stop offset="1" stopColor="#8a5a1a" />
        </linearGradient>
      </defs>
      <path
        d="M50 4 89 26v48L50 96 11 74V26z"
        fill={`url(#${id}b)`}
        stroke="rgba(255,255,255,.55)"
        strokeWidth="2"
      />
      <path
        d="M50 12 82 30v40L50 88 18 70V30z"
        fill="none"
        stroke="rgba(0,0,0,.35)"
        strokeWidth="1.5"
      />
      <ellipse
        cx="50"
        cy="54"
        rx="31"
        ry="10"
        fill="none"
        stroke={`url(#${id}f)`}
        strokeWidth="4.5"
        transform="rotate(-18 50 54)"
      />
      <path
        d="M50 22 55 47 76 52 55 57 50 82 45 57 24 52 45 47z"
        fill={`url(#${id}f)`}
        stroke="#3a2608"
        strokeWidth="1"
      />
      <path d="M50 22 55 47 50 52z" fill="rgba(255,255,255,.5)" />
    </svg>
  )
}

export function RankIcon() {
  return (
    <svg className="mx-rank" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 9l8-5 8 5" />
        <path d="M4 14l8-5 8 5" />
        <path d="M4 19l8-5 8 5" />
      </g>
    </svg>
  )
}

const NOTCHES = ['', 'M15 9v6', 'M12 9v6M18 9v6', 'M10 9v6M15 9v6M20 9v6']

/** The four difficulty shields, the first `tier + 1` lit. */
export function DifficultyShields({ tier }: { tier: number }) {
  return (
    <span className="mx-diff" aria-hidden="true">
      {[0, 1, 2, 3].map((k) => {
        const on = k <= tier
        const mark = on ? '#3a2608' : 'var(--mx-line-hi)'
        return (
          <svg
            key={k}
            viewBox="0 0 30 34"
            className={on ? 'mx-shield mx-on' : 'mx-shield'}
          >
            <path
              d="M15 2 27 7v10c0 7-5 12-12 15C8 29 3 24 3 17V7z"
              strokeWidth="1.2"
            />
            {k ? (
              <path d={NOTCHES[k]} stroke={mark} strokeWidth="2" fill="none" />
            ) : (
              <circle cx="15" cy="15" r="2.5" fill={mark} />
            )}
          </svg>
        )
      })}
    </span>
  )
}

/** The flat pips a list row uses instead of four shields. */
export function TierPips({ tier }: { tier: number }) {
  return (
    <span className="mx-pips" aria-hidden="true">
      {[0, 1, 2, 3].map((k) => (
        <i key={k} className={k <= tier ? 'mx-on' : undefined} />
      ))}
    </span>
  )
}

const MEDAL_ICONS: Record<string, string> = {
  dawn: 'M17 27a7 7 0 1 0 14 0a7 7 0 1 0-14 0M10 34h28M13 22l-4-3M35 22l4-3M24 14v-5',
  star: 'M24 9l4 10 11 1-8 7 3 11-10-6-10 6 3-11-8-7 11-1z',
  twin: 'M12 24a6 6 0 1 0 12 0a6 6 0 1 0-12 0M24 24a6 6 0 1 0 12 0a6 6 0 1 0-12 0',
  stack: 'M12 31h24M12 25h24M12 19h24M12 13h24',
  arc: 'M10 32c4-14 24-14 28 0M24 12v8M20 16h8',
  film: 'M11 14h26v20H11zM11 19h26M11 29h26M17 14v5M24 14v5M31 14v5',
  cube: 'M24 10l12 7v14l-12 7-12-7V17zM12 17l12 7 12-7M24 24v14',
  bolt: 'M27 8 15 27h9l-3 13 12-19h-9z',
  crown: 'M11 32h26l2-17-8 6-7-10-7 10-8-6z',
  infinity: 'M14 24c0-6 8-6 10 0s10 6 10 0-8-6-10 0-10 6-10 0z',
}

export function MedalIcon({
  icon,
  color,
  id,
}: {
  icon: string
  color: string
  id: string
}) {
  return (
    <svg className="mx-medal-icon" viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".35" stopColor={color} />
          <stop offset="1" stopColor="#0d1a28" />
        </linearGradient>
      </defs>
      <path
        d="M24 2 43 13v22L24 46 5 35V13z"
        fill={`url(#${id})`}
        stroke="rgba(255,255,255,.7)"
        strokeWidth="1.2"
      />
      <path d="M24 6 39 15v18L24 42 9 33V15z" fill="rgba(4,10,18,.55)" />
      <path
        d={MEDAL_ICONS[icon] ?? MEDAL_ICONS.star}
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

const OBJECT_ICONS: Record<ForgeCategory, string> = {
  systems:
    'M5 5h12v12H5zM8 2v3M14 2v3M8 17v3M14 17v3M2 8h3M2 14h3M17 8h3M17 14h3',
  ai: 'M7 11a4 4 0 1 0 8 0a4 4 0 1 0-8 0M11 2v3M11 17v3M2 11h3M17 11h3M4.6 4.6l2.2 2.2M15.2 15.2l2.2 2.2M4.6 17.4l2.2-2.2M15.2 6.8l2.2-2.2',
  web: 'M3 4h16v14H3zM3 8h16M6 6h1M9 6h1',
  research: 'M4 9a5 5 0 1 0 10 0a5 5 0 1 0-10 0M13 13l6 6',
}

export function ObjectIcon({ cat }: { cat: ForgeCategory }) {
  return (
    <svg className="mx-ico" viewBox="0 0 22 22" aria-hidden="true">
      <path d={OBJECT_ICONS[cat]} />
    </svg>
  )
}

/* -------------------------------------------------------- wireframes -- */

type Vec = [number, number, number]
interface Shape {
  v: Vec[]
  e: [number, number][]
}

const SHAPES: Record<string, () => Shape> = {
  crate() {
    const v: Vec[] = []
    const e: [number, number][] = []
    for (let i = 0; i < 8; i++) {
      v.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1])
    }
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        const d = i ^ j
        if (d === 1 || d === 2 || d === 4) e.push([i, j])
      }
    }
    v.push(
      [-1, 0.4, 1.001],
      [1, 0.4, 1.001],
      [-1, -0.4, 1.001],
      [1, -0.4, 1.001],
    )
    e.push([8, 9], [10, 11])
    return { v, e }
  },
  tower() {
    const v: Vec[] = []
    const e: [number, number][] = []
    const n = 10
    const rings = 5
    for (let r = 0; r < rings; r++) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const rad = 0.7 - r * 0.08
        v.push([Math.cos(a) * rad, -1.2 + r * 0.6, Math.sin(a) * rad])
      }
    }
    for (let r = 0; r < rings; r++) {
      for (let i = 0; i < n; i++) {
        e.push([r * n + i, r * n + ((i + 1) % n)])
        if (r < rings - 1) e.push([r * n + i, (r + 1) * n + i])
      }
    }
    v.push([0, 1.6, 0])
    for (let i = 0; i < n; i += 2) e.push([(rings - 1) * n + i, v.length - 1])
    return { v, e }
  },
  ring() {
    const v: Vec[] = []
    const e: [number, number][] = []
    const n = 28
    const m = 6
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        const a = (i / n) * Math.PI * 2
        const b = (j / m) * Math.PI * 2
        v.push([
          (1.15 + 0.22 * Math.cos(b)) * Math.cos(a),
          0.22 * Math.sin(b) * 1.6,
          (1.15 + 0.22 * Math.cos(b)) * Math.sin(a),
        ])
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        e.push([i * m + j, ((i + 1) % n) * m + j])
        if (i % 2 === 0) e.push([i * m + j, i * m + ((j + 1) % m)])
      }
    }
    return { v, e }
  },
  gem() {
    const t = (1 + Math.sqrt(5)) / 2
    const v = (
      [
        [-1, t, 0],
        [1, t, 0],
        [-1, -t, 0],
        [1, -t, 0],
        [0, -1, t],
        [0, 1, t],
        [0, -1, -t],
        [0, 1, -t],
        [t, 0, -1],
        [t, 0, 1],
        [-t, 0, -1],
        [-t, 0, 1],
      ] as Vec[]
    ).map((p) => p.map((x) => x * 0.66) as Vec)
    const e: [number, number][] = []
    for (let i = 0; i < 12; i++) {
      for (let j = i + 1; j < 12; j++) {
        const d = Math.hypot(...v[i].map((x, k) => x - v[j][k]))
        if (d < 1.4) e.push([i, j])
      }
    }
    return { v, e }
  },
  dish() {
    const v: Vec[] = []
    const e: [number, number][] = []
    const n = 16
    const rings = 4
    for (let r = 1; r <= rings; r++) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const rad = (r / rings) * 1.2
        v.push([Math.cos(a) * rad, 0.4 + rad * rad * 0.35, Math.sin(a) * rad])
      }
    }
    for (let r = 0; r < rings; r++) {
      for (let i = 0; i < n; i++) {
        e.push([r * n + i, r * n + ((i + 1) % n)])
        if (r < rings - 1) e.push([r * n + i, (r + 1) * n + i])
      }
    }
    const c = v.length
    v.push(
      [0, 0.4, 0],
      [0, -1.2, 0],
      [0, 1.3, 0],
      [-0.6, -1.2, 0.4],
      [0.6, -1.2, 0.4],
      [0, -1.2, -0.7],
    )
    e.push(
      [c, c + 1],
      [c, c + 2],
      [c + 1, c + 3],
      [c + 1, c + 4],
      [c + 1, c + 5],
    )
    for (let i = 0; i < n; i += 4) e.push([i, c + 2])
    return { v, e }
  },
}

const CATEGORY_SHAPES: Record<ForgeCategory, string[]> = {
  systems: ['crate', 'tower'],
  ai: ['gem', 'ring'],
  web: ['dish', 'crate', 'tower'],
  research: ['gem'],
}

/**
 * An object on the forge's perspective grid, projected once at build time.
 * The prototype spun it on a canvas; a still costs nothing and the CSS gives
 * it a slow scan instead.
 */
export function Wireframe({
  seed,
  cat,
  className,
}: {
  seed: string
  cat: ForgeCategory
  className?: string
}) {
  const w = 480
  const h = 290
  const hash = hashStr(seed)
  const options = CATEGORY_SHAPES[cat]
  const shape = SHAPES[options[hash % options.length]]()
  const f = h * 1.25
  const camZ = 4.6
  const yaw = 0.6 + (hash % 100) * 0.06
  const pitch = 0.42
  const proj = ([x, y, z]: Vec): [number, number] => {
    const cy = Math.cos(yaw)
    const sy = Math.sin(yaw)
    const X = x * cy - z * sy
    const Z = x * sy + z * cy
    const cp = Math.cos(pitch)
    const sp = Math.sin(pitch)
    const Y2 = y * cp - Z * sp
    const Z2 = y * sp + Z * cp
    const zz = camZ + Z2
    return [n1(w / 2 + (X * f) / zz), n1(h / 2 - (Y2 * f) / zz)]
  }
  const grid: string[] = []
  for (let i = -8; i <= 8; i++) {
    const a = proj([i * 0.4, -1.3, -3.2])
    const b = proj([i * 0.4, -1.3, 3.2])
    const c = proj([-3.2, -1.3, i * 0.4])
    const d = proj([3.2, -1.3, i * 0.4])
    grid.push(
      `M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${c[0]} ${c[1]}L${d[0]} ${d[1]}`,
    )
  }
  const origin = proj([0, -1.3, 0])
  const axes: [Vec, string][] = [
    [[0.7, -1.3, 0], '#ff8a6a'],
    [[0, -0.6, 0], '#9dff9a'],
    [[0, -1.3, 0.7], '#7fc8ff'],
  ]
  const P = shape.v.map(proj)
  const edges = shape.e
    .map(([a, b]) => `M${P[a][0]} ${P[a][1]}L${P[b][0]} ${P[b][1]}`)
    .join('')
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [x, y] of P) {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  }
  const pad = 14
  const L = 12
  x0 -= pad
  y0 -= pad
  x1 += pad
  y1 += pad
  const brackets = [
    [x0, y0, 1, 1],
    [x1, y0, -1, 1],
    [x0, y1, 1, -1],
    [x1, y1, -1, -1],
  ]
    .map(
      ([cx, cy, dx, dy]) =>
        `M${n1(cx + dx * L)} ${n1(cy)}H${n1(cx)}V${n1(cy + dy * L)}`,
    )
    .join('')
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <path d={grid.join('')} stroke="rgba(120,200,255,.14)" fill="none" />
      {axes.map(([point, color]) => {
        const q = proj(point)
        return (
          <path
            key={color}
            d={`M${origin[0]} ${origin[1]}L${q[0]} ${q[1]}`}
            stroke={color}
            strokeWidth="2"
          />
        )
      })}
      <g fill="none" style={{ mixBlendMode: 'screen' }}>
        <path d={edges} stroke="rgba(90,180,255,.18)" strokeWidth="7" />
        <path d={edges} stroke="rgba(140,215,255,.55)" strokeWidth="2.2" />
        <path d={edges} stroke="rgba(230,248,255,.95)" strokeWidth="1" />
      </g>
      <path
        d={brackets}
        stroke="rgba(255,196,107,.85)"
        strokeWidth="1.2"
        fill="none"
      />
    </svg>
  )
}
