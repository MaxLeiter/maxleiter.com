import { clamp, PI, Spring, type Vec3 } from './math'

/**
 * Where everything stands, shared by the renderer and the HUD: tile and row
 * placement, the camera's framing per viewport, and the rectangle a tile
 * opens into.
 */

export const TILE_W = 3.2
export const TILE_H = 2.0
export const TILE_D = 0.11
export const TILE_R = 0.15
export const FLOOR_Y = -1.36
/** How far in front of the row an opened tile comes to rest, and the camera. */
export const OPEN_Z = 2.5
export const OPEN_D = 5.0

/** One tile the scene draws, read from a server-rendered link. */
export interface Item {
  chan: number
  index: number
  seed: string
  title: string
  date: string
  desc: string
  chip: string
  meta: string
  href: string
  /** Leaves the site, so it opens in the scene's own reader first. */
  external: boolean
  /** The motif's URL, from the tile's `<img>`. */
  art: string
  link: HTMLAnchorElement
}

export interface Channel {
  id: string
  name: string
  hue: number
  items: Item[]
  label: HTMLAnchorElement
}

export interface SceneState {
  chan: number
  idx: number[]
  chanS: Spring
  rowS: Spring[]
  open: Item | null
  /** 0 at rest in the row, 1 fully opened. */
  openT: number
  sweep: Map<Item, number>
  hover: number
  t: number
  lastInput: number
  mx: number
  my: number
  reduced: boolean
}

export interface Viewport {
  w: number
  h: number
  asp: number
  portrait: boolean
}

export interface ScreenRect {
  x: number
  y: number
  w: number
  h: number
}

export function viewport(): Viewport {
  const w = innerWidth
  const h = innerHeight
  return { w, h, asp: w / h, portrait: w / h < 0.9 }
}

interface TilePose {
  x: number
  z: number
  ry: number
  a: number
}

/** Tile `k` slots from the focused one: the row fans back into the room. */
export function tileLayout(k: number, portrait: boolean): TilePose {
  const ak = Math.abs(k)
  const n = Math.min(ak, 1)
  const f = Math.max(ak - 1, 0)
  if (k >= 0) {
    return portrait
      ? {
          x: n * 3.75 + f * 2.3,
          z: -(n * 2.2 + f * 1.4),
          ry: -n * 0.5,
          a: clamp(1 - f / 2.2, 0, 1),
        }
      : {
          x: n * 3.95 + f * 1.75,
          z: -(n * 1.9 + f * 1.3),
          ry: -n * 0.56,
          a: clamp(1 - f / 5.2, 0, 1),
        }
  }
  return portrait
    ? {
        x: -(n * 3.75 + f * 2.3),
        z: -(n * 2.2 + f * 1.4),
        ry: n * 0.5,
        a: clamp(1 - ak / 2.2, 0, 1),
      }
    : {
        x: -(n * 3.6 + f * 1.8),
        z: -(n * 2.8 + f * 1.4),
        ry: n * 0.6,
        a: clamp(1 - ak * 0.7, 0, 1) * 0.5,
      }
}

/** Row `d` channels from the current one slides up and back through depth. */
export function rowLayout(d: number) {
  const ad = Math.abs(d)
  return {
    y: d > 0 ? -d * 1.15 : -d * 2.3,
    z: -ad * 3.2,
    a: Math.pow(clamp(1 - ad, 0, 1), 1.4),
    s: 1 - ad * 0.12,
  }
}

export interface Framing {
  fov: number
  eye: Vec3
  at: Vec3
  floorY: number
  avatar: Vec3
}

export function framing(vp: Viewport): Framing {
  if (vp.portrait) {
    const fov = (50 * PI) / 180
    const t = Math.tan(fov / 2)
    const D = 1.6 / 0.86 / (t * vp.asp)
    const ly = -0.12 * 2 * D * t
    return {
      fov,
      eye: [0, ly + 1.6, D],
      at: [0, ly, 0],
      floorY: -2.5,
      avatar: [1.0, -2.5, 1.3],
    }
  }
  const fov = (34 * PI) / 180
  const t = Math.tan(fov / 2)
  const frac = vp.asp > 2 ? 0.34 : vp.asp > 1.5 ? 0.4 : 0.46
  const D = 1.6 / frac / (t * vp.asp)
  const visW = 2 * D * t * vp.asp
  const visH = 2 * D * t
  const lx = (vp.asp > 1.3 ? 0.1 : 0.06) * visW
  const ly = -0.05 * visH
  return {
    fov,
    eye: [lx - 0.4, ly + 1.1, D],
    at: [lx, ly, 0],
    floorY: FLOOR_Y,
    avatar: [2.12, FLOOR_Y, 1.35],
  }
}

/**
 * The rectangle an opened tile becomes, in CSS pixels.
 *
 * `page` must agree with the article layout in app/styles/console.css --
 * the reader panel's width, its top offset under the bar, its side margins --
 * because the flipped tile hands over to that page's panel mid-transition.
 * `reader` is the scene's own dialog, centred.
 */
export function panelRect(vp: Viewport, mode: 'page' | 'reader'): ScreenRect {
  const narrow = vp.w <= 700
  if (mode === 'page') {
    const w = narrow ? vp.w - 16 : Math.min(980, vp.w - 48)
    const y = narrow ? 68 : 92
    return { w, h: vp.h - y + 24, x: (vp.w - w) / 2, y }
  }
  if (vp.portrait || narrow) {
    const w = vp.w - 20
    const h = vp.h - 96
    return { w, h, x: (vp.w - w) / 2, y: (vp.h - h) / 2 + 22 }
  }
  const w = Math.min(820, vp.w * 0.7)
  const h = Math.min(vp.h * 0.78, 600)
  return { w, h, x: (vp.w - w) / 2, y: (vp.h - h) / 2 + 10 }
}
