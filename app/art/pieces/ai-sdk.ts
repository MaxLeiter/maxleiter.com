import { art, hsl, Kit } from '../kit'

/** The AI SDK, one interface for every model provider: a single glossy
 *  adapter in the middle, three differently coloured model orbs plugged
 *  into it by cables, and one clean stream flowing out the front. */
export default art(['project:ai-sdk'], () => {
  const k = new Kit({ hue: 200, hue2: 250, spot: [430, 130] })
  k.stage()
  const hx = 420
  const hy = 190
  // Cables from the orbs to the hub.
  const orbs: [number, number, number][] = [
    [300, 80, 20],
    [430, 52, 280],
    [560, 92, 150],
  ]
  k.add(
    ...orbs.map(
      ([x, y, hue]) =>
        k.curve(
          [
            [x, y + 24],
            [x, (y + hy) / 2 + 10],
            [hx + (x - hx) * 0.2, hy - 40],
          ],
          '#20242c',
          9,
        ) +
        k.curve(
          [
            [x, y + 24],
            [x, (y + hy) / 2 + 10],
            [hx + (x - hx) * 0.2, hy - 40],
          ],
          hsl(hue, 80, 60, 0.6),
          3,
        ),
    ),
  )
  k.add(
    ...orbs.map(
      ([x, y, hue]) =>
        k.circle(x, y, 40, hsl(hue, 90, 60, 0.3), `filter="${k.blur(10)}"`) +
        k.orb(x, y, 26, hue, 60),
    ),
  )
  // The hub.
  const hub =
    k.slab(hx - 70, hy - 44, 140, 88, 20, {
      face: ['#f3f5f8', '#aab3bf'],
      side: '#4c545f',
      depth: 9,
    }) +
    [0, 1, 2]
      .map(
        (i) =>
          k.circle(hx - 34 + i * 34, hy - 20, 7, '#1d2129') +
          k.circle(
            hx - 34 + i * 34,
            hy - 20,
            3,
            hsl([20, 280, 150][i], 90, 60),
          ),
      )
      .join('') +
    k.rect(hx - 44, hy + 6, 88, 18, 9, '#1d2129') +
    k.glow(k.rect(hx - 36, hy + 12, 56, 6, 3, hsl(200, 100, 70)), 3, 1)
  k.standing(
    hub + k.rect(hx - 10, hy + 50, 20, 304 - hy - 50, 4, '#3a404b'),
    hx,
    110,
    0.3,
  )
  // The stream out to the right.
  k.add(
    k.glow(
      k.curve(
        [
          [hx + 70, hy + 14],
          [520, hy + 30],
          [600, hy + 10],
          [660, hy + 20],
        ],
        hsl(200, 100, 70),
        4,
      ),
      6,
      0.8,
    ),
  )
  k.add(
    ...[0, 1, 2, 3].map((i) =>
      k.rect(500 + i * 34, hy + 18 - i * 2, 22, 6, 3, 'rgba(255,255,255,.8)'),
    ),
  )
  k.add(k.sparkles(4, [340, 20, 200, 30]))
  return k.vignette().toString()
})
