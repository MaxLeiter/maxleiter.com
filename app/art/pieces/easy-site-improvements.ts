import { art, hsl, Kit } from '../kit'

/** Easy wins for speed and accessibility: a speedometer swinging into the
 *  green, a photo squeezed small in a clamp, and the access figure in a
 *  bright focus ring. */
export default art(['blog:easy-site-improvements'], () => {
  const k = new Kit({ hue: 190, hue2: 240, spot: [430, 140] })
  k.stage()
  // Gauge.
  const gx = 430
  const gy = 210
  const arc = (a0: number, a1: number, color: string) => {
    const p = (a: number, r: number) => [
      gx + Math.cos(a) * r,
      gy + Math.sin(a) * r,
    ]
    const [x0, y0] = p(a0, 96)
    const [x1, y1] = p(a1, 96)
    return `<path d="M${x0} ${y0}A96 96 0 0 1 ${x1} ${y1}" fill="none" stroke="${color}" stroke-width="16"/>`
  }
  const gauge = `${
    k.path(
      `M${gx - 124} ${gy}a124 124 0 0 1 248 0v24h-248z`,
      k.lin(0, gy - 124, 0, gy + 24, [
        [0, '#3c4250'],
        [1, '#14171d'],
      ]),
    ) +
    k.gloss(
      k.path(`M${gx - 124} ${gy}a124 124 0 0 1 248 0v24h-248z`, '#fff'),
      gy - 124,
      148,
      0.25,
    ) +
    k.path(
      `M${gx - 124} ${gy}a124 124 0 0 1 248 0v24h-248z`,
      'none',
      'stroke="rgba(255,255,255,.45)" stroke-width="2"',
    ) +
    arc(Math.PI, Math.PI * 1.33, hsl(0, 85, 58)) +
    arc(Math.PI * 1.35, Math.PI * 1.64, hsl(45, 95, 58)) +
    arc(Math.PI * 1.66, Math.PI * 2, hsl(130, 75, 52))
  }<g transform="rotate(-30 ${gx} ${gy})">${k.poly(
    [
      [gx - 5, gy],
      [gx + 5, gy],
      [gx, gy - 92],
    ],
    '#fff',
  )}</g>${k.orb(gx, gy, 14, 210, 55)}`
  k.standing(
    gauge + k.rect(gx - 124, gy + 24, 248, 304 - gy - 24, 0, '#14171d'),
    gx,
    140,
  )
  // Focus ring with access figure.
  const fx = 290
  const fy = 96
  k.add(
    k.glow(
      k.circle(
        fx,
        fy,
        40,
        'none',
        `stroke="${hsl(200, 100, 65)}" stroke-width="5"`,
      ),
      6,
      0.9,
    ),
    k.orb(fx, fy, 32, 220, 52),
    k.circle(fx, fy - 15, 5, '#fff'),
    k.line(
      [
        [fx - 16, fy - 6],
        [fx + 16, fy - 6],
      ],
      '#fff',
      4,
    ),
    k.line(
      [
        [fx, fy - 6],
        [fx, fy + 6],
        [fx - 9, fy + 20],
      ],
      '#fff',
      4,
    ),
    k.line(
      [
        [fx, fy + 6],
        [fx + 9, fy + 20],
      ],
      '#fff',
      4,
    ),
  )
  // A photo in a clamp, squeezed.
  const px = 540
  const py = 70
  k.add(
    k.slab(px, py + 10, 54, 44, 4, { face: ['#ffffff', '#d9dee5'], depth: 4 }),
    k.rect(
      px + 5,
      py + 15,
      44,
      34,
      2,
      k.lin(0, py + 15, 0, py + 49, [
        [0, hsl(200, 80, 70)],
        [1, hsl(140, 60, 45)],
      ]),
    ),
    k.circle(px + 36, py + 24, 4, hsl(50, 100, 70)),
    k.rect(px - 16, py + 4, 10, 56, 3, hsl(0, 0, 70)),
    k.rect(px + 60, py + 4, 10, 56, 3, hsl(0, 0, 70)),
    k.rect(px - 16, py + 28, 86, 6, 3, hsl(10, 80, 55)),
  )
  k.add(k.sparkles(4, [300, 140, 300, 50]))
  return k.vignette().toString()
})
