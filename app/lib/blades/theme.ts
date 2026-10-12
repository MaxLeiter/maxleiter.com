/**
 * The five blades: their order, their colours and the section each one is.
 *
 * One table, read by the homepage dashboard, the section pages, the article
 * reader and the homepage island. A blade's colour carries through to every
 * page in its section, so a post opened from the green blog blade is read on
 * green glass. Leaf module: the island imports it, so nothing here may reach
 * `node:fs`.
 */

export type BladeId = 'projects' | 'blog' | 'notes' | 'work' | 'system'

export interface BladeTheme {
  id: BladeId
  /** One line under the blade title. */
  sub: string
  /** The section page this blade stands for, or the homepage blade. */
  href: string
  /** Highlight, body and shadow tones of the glass. */
  c: readonly [string, string, string]
  /** The selection glow and orb ring. */
  glow: string
  /** The ambient ribbons' tint. */
  rgb: readonly [number, number, number]
  /** Link colour on light glass: the body tone, darkened for contrast. */
  linkLight: string
  /** Link colour on dark glass: the highlight tone. */
  linkDark: string
}

/** Mixes two `#rrggbb` colours; `k` is the share of `b`. */
export function mixHex(a: string, b: string, k: number): string {
  const pa = (a.match(/\w\w/g) ?? []).map((h) => parseInt(h, 16))
  const pb = (b.match(/\w\w/g) ?? []).map((h) => parseInt(h, 16))
  return `#${pa
    .map((v, i) =>
      Math.round(v + (pb[i] - v) * k)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

function blade(
  id: BladeId,
  sub: string,
  href: string,
  c: readonly [string, string, string],
  glow: string,
  rgb: readonly [number, number, number],
): BladeTheme {
  return {
    id,
    sub,
    href,
    c,
    glow,
    rgb,
    linkLight: mixHex(c[1], '#000000', 0.25),
    linkDark: c[0],
  }
}

export const BLADES: readonly BladeTheme[] = [
  blade(
    'projects',
    'things I made, and things I helped make',
    '/projects',
    ['#ffb53f', '#ad4a00', '#4d1900'],
    '#ffbe55',
    [255, 140, 30],
  ),
  blade(
    'blog',
    'writing about the web, Linux, tooling and AI',
    '/blog',
    ['#a6e050', '#347c0d', '#0d3202'],
    '#c8ff6e',
    [140, 230, 60],
  ),
  blade(
    'notes',
    'short fixes, scripts and snippets',
    '/notes',
    ['#74ccff', '#1565b4', '#04224d'],
    '#92dcff',
    [60, 160, 255],
  ),
  blade(
    'work',
    'on the Vercel blog: v0, the AI SDK and more',
    '/?blade=work',
    ['#cf9cff', '#7440bd', '#200a4b'],
    '#dcb2ff',
    [170, 100, 255],
  ),
  blade(
    'system',
    'about, contact and settings',
    '/about',
    ['#d3d9df', '#5e6974', '#1b2025'],
    '#ffffff',
    [190, 205, 220],
  ),
]

/** The blade the homepage opens on. */
export const HOME_BLADE = 1

export function bladeById(id: BladeId): BladeTheme {
  return BLADES.find((b) => b.id === id) ?? BLADES[HOME_BLADE]
}

/**
 * The custom properties a themed subtree reads: the glass tones, the glow,
 * the page backdrop and the two link colours. Inline on the element, so no
 * per-blade class has to exist in any sheet.
 */
export function bladeVars(b: BladeTheme): Record<string, string> {
  return {
    '--c1': b.c[0],
    '--c2': b.c[1],
    '--c3': b.c[2],
    '--glow': b.glow,
    '--bg-a': b.c[1],
    '--bg-b': mixHex(b.c[2], '#000000', 0.55),
    '--rl-l': b.linkLight,
    '--rl-d': b.linkDark,
  }
}

/** `Sep 26, 2026` -> `Sep '26`; empty when the string is not a date. */
export function shortDate(date: string): string {
  const m = /^(\w+)\s+\d+,\s*(\d{4})/.exec(date || '')
  return m ? `${m[1].slice(0, 3)} '${m[2].slice(2)}` : ''
}

/** `https://www.github.com/x` -> `github.com`; empty for a relative URL. */
export function hostOf(href: string): string {
  const m = /^https?:\/\/(?:www\.)?([^/?#]+)/.exec(href)
  return m ? m[1] : ''
}
