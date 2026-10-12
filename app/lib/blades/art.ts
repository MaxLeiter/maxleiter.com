/**
 * The dashboard's procedural art, as SVG strings: item icons, the profile
 * avatar, the per-item cover and the rating stars.
 *
 * Strings rather than components because the same output is needed in two
 * places: the build renders the at-rest frame with it, and the homepage island
 * draws the next preview with it as the selection moves. Seeded from the
 * item's slug, so the build and the client draw the same cover and the frame
 * does not change when the island takes over.
 *
 * Leaf module: the island imports it.
 */

export type IconKind =
  | 'post'
  | 'note'
  | 'project'
  | 'work'
  | 'about'
  | 'link'
  | 'sound'
  | 'motion'
  | 'theme'
  | 'info'
  | 'home'
  | 'close'

const ICON: Record<IconKind, string> = {
  post: '<path d="M3.5 1h6.2L13 4.3V15H3.5zM9 1.8V5h3.2"/><path d="M5.3 7.2h5.5v1H5.3zm0 2.2h5.5v1H5.3zm0 2.2h3.8v1H5.3z" fill="rgba(0,0,0,.35)"/>',
  note: '<path d="M2.5 2.5h11v7.2L9.7 13.5H2.5z"/><path d="M9.5 13.3V9.5h3.8z" fill="rgba(0,0,0,.3)"/><path d="M4.5 5h7v1h-7zm0 2.2h5v1h-5z" fill="rgba(0,0,0,.35)"/>',
  project:
    '<path d="M8 1 14.5 4.5v7L8 15 1.5 11.5v-7z"/><path d="M8 8.2 14.5 4.5M8 8.2 1.5 4.5M8 8.2V15" stroke="rgba(0,0,0,.35)" stroke-width="1" fill="none"/>',
  work: '<path d="M5.5 3.5V2h5v1.5H14v10H2v-10zm1-.5v.5h3V3z"/><path d="M2 7.5h12v1H2z" fill="rgba(0,0,0,.35)"/>',
  about:
    '<circle cx="8" cy="5" r="3.2"/><path d="M1.8 15c.4-3.6 2.9-5.6 6.2-5.6s5.8 2 6.2 5.6z"/>',
  link: '<path d="M6.6 9.4 9.4 6.6l1 1-2.8 2.8z"/><path d="M7.4 4.2 9.3 2.3a3 3 0 0 1 4.3 4.3l-1.9 1.9-1-1 1.9-1.9a1.6 1.6 0 0 0-2.3-2.3L8.4 5.2zM8.6 11.8l-1.9 1.9a3 3 0 0 1-4.3-4.3l1.9-1.9 1 1-1.9 1.9a1.6 1.6 0 0 0 2.3 2.3l1.9-1.9z"/>',
  sound:
    '<path d="M2 6h3l4-3v10L5 10H2z"/><path d="M11 5.2a4 4 0 0 1 0 5.6l-.8-.8a2.9 2.9 0 0 0 0-4z"/>',
  motion:
    '<path d="M2 8a6 6 0 1 1 12 0h-1.5a4.5 4.5 0 1 0-9 0z"/><circle cx="8" cy="8" r="2"/>',
  theme:
    '<path d="M8 1.5a6.5 6.5 0 1 0 0 13z"/><path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="rgba(0,0,0,.35)"/>',
  info: '<circle cx="8" cy="8" r="6.5"/><path d="M7.2 7h1.6v5H7.2zM7.2 4h1.6v1.6H7.2z" fill="rgba(0,0,0,.45)"/>',
  home: '<path d="M8 1.5 15 8h-2v6.5H9.5v-4h-3v4H3V8H1z"/>',
  close:
    '<path d="M3.5 2.4 8 6.9l4.5-4.5 1.1 1.1L9.1 8l4.5 4.5-1.1 1.1L8 9.1l-4.5 4.5-1.1-1.1L6.9 8 2.4 3.5z"/>',
}

/** The glossy square an item row starts with. Decorative. */
export function iconHTML(kind: IconKind): string {
  return `<svg viewBox="0 0 16 16" aria-hidden="true">${ICON[kind]}</svg>`
}

/** The play-triangle glyph inside a button's chrome bead. */
export const PLAY_PATH = '<path d="M6 3l5 5-5 5z"/>'

export function glyphHTML(kind: IconKind | 'play'): string {
  return `<svg viewBox="0 0 16 16" aria-hidden="true">${
    kind === 'play' ? PLAY_PATH : ICON[kind]
  }</svg>`
}

/** FNV-1a. Seeds the cover generator from a slug. */
export function hash(s: string): number {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

/** A small seeded PRNG (mulberry-style), uniform in [0, 1). */
export function rng(seed: number): () => number {
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    seed = (seed + Math.imul(seed ^ (seed >>> 7), 61 | seed)) ^ seed
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296
  }
}

const f1 = (n: number) => n.toFixed(1)
const f2 = (n: number) => n.toFixed(2)

/**
 * A cover: the blade's gradient, a key light, bokeh, white ribbons and, for
 * projects and work, a receding floor grid. `c` is the blade's three tones.
 * Gradient ids are derived from the seed, so two covers on one page only
 * collide when they are the same cover.
 */
export function coverSVG(
  seed: string,
  c: readonly [string, string, string],
  grid: boolean,
): string {
  const r = rng(hash(seed))
  const id = `cv${hash(seed) % 1e6}`
  const sx = 20 + r() * 60
  const sy = 18 + r() * 30
  let ribbons = ''
  for (let i = 0; i < 5; i++) {
    const y0 = 40 + r() * 50
    const a = 8 + r() * 26
    const w = 0.6 + r() * (i < 2 ? 14 : 3)
    const o = i < 2 ? 0.14 + r() * 0.12 : 0.35 + r() * 0.4
    ribbons +=
      `<path d="M-10 ${f1(y0)} C 30 ${f1(y0 - a)}, 60 ${f1(y0 + a)}, 100 ${f1(y0 - a * 0.6)} ` +
      `S 150 ${f1(y0 + a * 0.4)}, 170 ${f1(y0 - a * 0.2)}" stroke="#fff" stroke-opacity="${f2(o)}" ` +
      `stroke-width="${f1(w)}" fill="none" stroke-linecap="round"/>`
  }
  let floor = ''
  if (grid || r() > 0.55) {
    for (let i = 0; i <= 12; i++) {
      const x = i * 13.3
      floor += `<line x1="${f1(x)}" y1="100" x2="${f1(80 + (x - 80) * 0.25)}" y2="72" stroke="#fff" stroke-opacity=".12" stroke-width=".4"/>`
    }
    for (let j = 0; j < 6; j++) {
      const y = 72 + Math.pow(j / 5, 2) * 28
      floor += `<line x1="0" y1="${f1(y)}" x2="160" y2="${f1(y)}" stroke="#fff" stroke-opacity="${f2(0.05 + j * 0.03)}" stroke-width=".4"/>`
    }
  }
  let dots = ''
  for (let i = 0; i < 14; i++) {
    dots += `<circle cx="${f1(r() * 160)}" cy="${f1(r() * 70)}" r="${f1(r() * r() * 7 + 0.4)}" fill="#fff" fill-opacity="${f2(r() * 0.25 + 0.05)}"/>`
  }
  return (
    `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>` +
    `<linearGradient id="${id}s" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>` +
    `<radialGradient id="${id}o" cx="${f1(sx)}%" cy="${f1(sy)}%" r="55%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".12" stop-color="#fff" stop-opacity=".55"/><stop offset=".4" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
    `<rect width="160" height="100" fill="url(#${id}s)"/><rect width="160" height="100" fill="url(#${id}o)"/>` +
    `${dots}${floor}${ribbons}` +
    `<path d="M0 0H160V34C110 26 50 28 0 42Z" fill="url(#${id}g)" opacity=".7"/></svg>`
  )
}

/**
 * Just a cover's ribbons, in white: the reader's header lays them over its own
 * gradient with `soft-light`, so the rest of the cover would be bytes on every
 * article for nothing visible. Same seed, same ribbons as the preview's cover.
 */
export function ribbonsSVG(seed: string): string {
  const r = rng(hash(seed))
  r()
  r()
  let paths = ''
  for (let i = 0; i < 5; i++) {
    const y0 = 40 + r() * 50
    const a = 8 + r() * 26
    const w = 0.6 + r() * (i < 2 ? 14 : 3)
    const o = i < 2 ? 0.14 + r() * 0.12 : 0.35 + r() * 0.4
    paths +=
      `<path d="M-10 ${f1(y0)}C30 ${f1(y0 - a)} 60 ${f1(y0 + a)} 100 ${f1(y0 - a * 0.6)}` +
      `S150 ${f1(y0 + a * 0.4)} 170 ${f1(y0 - a * 0.2)}" stroke-opacity="${f2(o)}" stroke-width="${f1(w)}"/>`
  }
  return (
    `<svg viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden="true">` +
    `<g fill="none" stroke="#fff" stroke-linecap="round">${paths}</g></svg>`
  )
}

/** The profile picture: a little terminal window on a blue glass tile. */
export function avatarSVG(id: string): string {
  return (
    `<svg viewBox="0 0 68 68" aria-hidden="true"><defs>` +
    `<radialGradient id="${id}a" cx="50%" cy="20%" r="95%"><stop offset="0" stop-color="#8fe0ff"/><stop offset=".45" stop-color="#2b86c9"/><stop offset="1" stop-color="#0b2347"/></radialGradient>` +
    `<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b5560"/><stop offset=".5" stop-color="#1c2127"/><stop offset="1" stop-color="#0e1114"/></linearGradient>` +
    `<linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="${id}d" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#d4ff8a" stop-opacity=".9"/><stop offset="1" stop-color="#d4ff8a" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="68" height="68" fill="url(#${id}a)"/>` +
    `<path d="M-4 52 C 14 40, 30 58, 72 40 L72 72 L-4 72Z" fill="#0b2347" opacity=".55"/>` +
    `<path d="M-4 58 C 20 48, 40 66, 72 50" stroke="#bfefff" stroke-opacity=".5" stroke-width="1.2" fill="none"/>` +
    `<g transform="translate(13 15) rotate(-6 21 18)">` +
    `<rect x="0" y="0" width="42" height="33" rx="6" fill="url(#${id}b)" stroke="#cfd6dc" stroke-width="1.6"/>` +
    `<rect x="0" y="0" width="42" height="8" rx="6" fill="#6b7682"/><rect x="0" y="4" width="42" height="4" fill="#6b7682"/>` +
    `<circle cx="6" cy="4" r="1.6" fill="#ff7a59"/><circle cx="11" cy="4" r="1.6" fill="#ffd24a"/><circle cx="16" cy="4" r="1.6" fill="#7be05a"/>` +
    `<ellipse cx="18" cy="21" rx="16" ry="9" fill="url(#${id}d)" opacity=".35"/>` +
    `<path d="M7 15.5 13 20 7 24.5" stroke="#b6ff5c" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<rect x="16" y="23" width="12" height="2.8" rx="1.2" fill="#b6ff5c"/></g>` +
    `<path d="M0 0H68V30C48 22 22 22 0 34Z" fill="url(#${id}c)" opacity=".55"/></svg>`
  )
}

/** Five gold stars, one gradient for all of them. Decorative. */
export function starsSVG(id: string): string {
  const star = (i: number) =>
    `<path transform="translate(${i * 13} 0)" d="M6 .6l1.6 3.4 3.7.5-2.7 2.6.7 3.7L6 9 2.7 10.8l.7-3.7L.7 4.5l3.7-.5z" fill="url(#${id})" stroke="rgba(0,0,0,.5)" stroke-width=".6"/>`
  return (
    `<svg viewBox="0 0 64 12" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffbf1f"/></linearGradient></defs>` +
    `${[0, 1, 2, 3, 4].map(star).join('')}</svg>`
  )
}

/**
 * The controller face glyph: four dots in a diamond with one filled. A neutral
 * shape rather than any console's lettering or colours.
 */
export function padGlyph(which: 's' | 'e'): string {
  const pos = { s: [8, 12.5], e: [12.5, 8], n: [8, 3.5], w: [3.5, 8] }
  return `<svg viewBox="0 0 16 16" aria-hidden="true">${Object.entries(pos)
    .map(
      ([k, [x, y]]) =>
        `<circle cx="${x}" cy="${y}" r="2.3" fill="${k === which ? '#2b3135' : 'none'}" stroke="#2b3135" stroke-width="1"/>`,
    )
    .join('')}</svg>`
}
