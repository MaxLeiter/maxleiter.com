/**
 * MERIDIAN's settings, shared by the two homepage islands.
 *
 * The menu island owns the settings screen and writes these; the scene island
 * reads them at start and follows `mx:prefs` events after that. They live in
 * `localStorage`, which can be missing or throw (private windows, blocked
 * storage), so every access is guarded and the defaults always render.
 */

export type Quality = 'auto' | 'low' | 'medium' | 'high' | 'ultra'

export interface Prefs {
  sound: boolean
  /** 0-10. */
  music: number
  /** 0-10. */
  sfx: number
  motion: 'full' | 'reduced'
  quality: Quality
  fps: boolean
}

export const QUALITIES: Quality[] = ['auto', 'low', 'medium', 'high', 'ultra']

const KEY = 'meridian.prefs'

/** Reduced motion follows the system until the visitor picks otherwise. */
export function defaultPrefs(): Prefs {
  const reduced =
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  return {
    sound: false,
    music: 7,
    sfx: 8,
    motion: reduced ? 'reduced' : 'full',
    quality: 'auto',
    fps: false,
  }
}

function clamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && value >= 0 && value <= 10
    ? Math.round(value)
    : fallback
}

/**
 * Sound always starts off: a page that plays audio on load because of a
 * setting saved last week is a page that plays audio on load.
 */
export function loadPrefs(): Prefs {
  const base = defaultPrefs()
  let saved: Partial<Record<keyof Prefs, unknown>> = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}') as typeof saved
  } catch {
    saved = {}
  }
  return {
    sound: false,
    music: clamp(saved.music, base.music),
    sfx: clamp(saved.sfx, base.sfx),
    motion:
      saved.motion === 'reduced' || saved.motion === 'full'
        ? saved.motion
        : base.motion,
    quality: QUALITIES.includes(saved.quality as Quality)
      ? (saved.quality as Quality)
      : base.quality,
    fps: saved.fps === true,
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // Storage is unavailable; the settings still apply to this visit.
  }
}

/** What the scene island reports back, for the settings screen. */
export interface SceneStats {
  kind: 'webgpu' | 'webgl2' | '2d' | 'none'
  adapter: string
  fps: number
  scale: number
}

export const PREFS_EVENT = 'mx:prefs'
export const STATS_EVENT = 'mx:stats'
export const START_EVENT = 'mx:start'

export function rendererName(kind: SceneStats['kind']): string {
  return kind === 'webgpu'
    ? 'WebGPU'
    : kind === 'webgl2'
      ? 'WebGL 2'
      : kind === '2d'
        ? 'Canvas 2D'
        : 'Painted backdrop'
}
