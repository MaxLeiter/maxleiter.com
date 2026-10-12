import { art, hsl, Kit } from '../kit'

/** Loading one wasm module on two runtimes: a glowing module cube in the
 *  middle, a dotted path to a small globe of edge nodes on one side and to
 *  a server tower on the other. */
export default art(['note:wasm-edge-and-node'], () => {
  const k = new Kit({ hue: 265, hue2: 220, spot: [430, 140] })
  k.stage()
  // Paths.
  k.add(
    k.glow(
      k.curve(
        [
          [430, 160],
          [360, 150],
          [300, 180],
        ],
        hsl(265, 100, 80, 0.7),
        3,
        'stroke-dasharray="3 7"',
      ),
      4,
      0.7,
    ),
    k.glow(
      k.curve(
        [
          [430, 160],
          [500, 150],
          [560, 190],
        ],
        hsl(265, 100, 80, 0.7),
        3,
        'stroke-dasharray="3 7"',
      ),
      4,
      0.7,
    ),
  )
  // The edge globe.
  const gx = 290
  const gy = 236
  const globe =
    k.orb(gx, gy, 52, 200, 52) +
    k.ellipse(
      gx,
      gy,
      52,
      18,
      'none',
      'stroke="rgba(255,255,255,.45)" stroke-width="1.5"',
    ) +
    k.ellipse(
      gx,
      gy,
      20,
      52,
      'none',
      'stroke="rgba(255,255,255,.45)" stroke-width="1.5"',
    ) +
    [
      [-30, -20],
      [18, -34],
      [34, 10],
      [-12, 26],
      [-40, 14],
    ]
      .map(([x, y]) =>
        k.glow(k.circle(gx + x, gy + y, 4, hsl(50, 100, 70)), 3, 1),
      )
      .join('')
  // The server tower.
  const sx = 534
  const sy = 170
  const tower =
    k.slab(sx, sy, 70, 132, 6, {
      face: ['#3a404c', '#14171d'],
      side: '#06070a',
      depth: 6,
    }) +
    [0, 1, 2, 3]
      .map(
        (i) =>
          k.rect(sx + 8, sy + 12 + i * 28, 54, 18, 3, '#0c0e12') +
          k.circle(sx + 52, sy + 21 + i * 28, 3, hsl(130, 90, 55)) +
          k.rect(sx + 14, sy + 19 + i * 28, 26, 4, 2, 'rgba(255,255,255,.3)'),
      )
      .join('')
  k.standing(`<g transform="translate(0 16)">${globe}</g>${tower}`, 420, 200)
  // The module cube.
  const cx = 430
  const cy = 130
  k.add(
    k.circle(
      cx,
      cy + 10,
      70,
      hsl(265, 100, 65, 0.35),
      `filter="${k.blur(18)}"`,
    ),
    k.cube(cx, cy, 52, [hsl(265, 90, 74), hsl(260, 80, 52), hsl(255, 75, 38)]),
    k.poly(
      [
        [cx - 18, cy - 24],
        [cx + 6, cy - 38],
        [cx + 26, cy - 28],
        [cx + 2, cy - 14],
      ],
      'rgba(255,255,255,.35)',
    ),
  )
  k.add(k.sparkles(4, [360, 30, 160, 50]))
  return k.vignette().toString()
})
