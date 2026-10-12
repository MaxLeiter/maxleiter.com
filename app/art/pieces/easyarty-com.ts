import { art, FLOOR, hsl, Kit } from '../kit'

/** easyarty.com, an artillery calculator for a war game: a stubby field gun
 *  on a grassy rise, its shell's dotted parabola arcing over to a target
 *  ring far away, with the range finder's crosshair floating above. */
export default art(['project:easyarty-com'], () => {
  const k = new Kit({ hue: 85, hue2: 200, spot: [430, 130] })
  k.stage()
  // Hills.
  k.add(
    k.path(
      `M0 ${FLOOR}q160-50 300-20q140 30 340-10v40h-640z`,
      k.lin(0, FLOOR - 50, 0, FLOOR, [
        [0, hsl(95, 45, 34)],
        [1, hsl(100, 40, 18)],
      ]),
    ),
  )
  // The arc.
  const pts: [number, number][] = []
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    pts.push([300 + t * 280, 236 - Math.sin(t * Math.PI) * 190 + t * 12])
  }
  k.add(
    k.glow(
      k.curve(pts, hsl(45, 100, 72), 3.5, 'stroke-dasharray="2 9"'),
      4,
      0.8,
    ),
  )
  k.add(k.orb(pts[7][0], pts[7][1], 7, 40, 55))
  // Target rings.
  k.add(
    ...[30, 20, 10].map((r, i) =>
      k.ellipse(
        580,
        258,
        r * 1.6,
        r * 0.5,
        'none',
        `stroke="${i % 2 ? '#fff' : hsl(0, 90, 60)}" stroke-width="4"`,
      ),
    ),
  )
  // The gun.
  const gx = 300
  const gy = 250
  const gun = `<g transform="rotate(-42 ${gx} ${gy})">${k.rect(
    gx - 10,
    gy - 12,
    110,
    22,
    8,
    k.lin(0, gy - 12, 0, gy + 10, [
      [0, hsl(80, 30, 52)],
      [0.4, hsl(80, 35, 38)],
      [1, hsl(80, 30, 20)],
    ]),
  )}${k.rect(gx + 92, gy - 15, 18, 28, 4, hsl(80, 30, 30))}</g>${k.path(
    `M${gx - 40} ${gy + 16}l20-36h46l20 36z`,
    k.lin(0, gy - 20, 0, gy + 16, [
      [0, hsl(80, 30, 46)],
      [1, hsl(80, 30, 24)],
    ]),
  )}${k.circle(
    gx - 30,
    gy + 22,
    18,
    '#22262c',
    'stroke="#5a606a" stroke-width="5"',
  )}${k.circle(
    gx + 34,
    gy + 22,
    18,
    '#22262c',
    'stroke="#5a606a" stroke-width="5"',
  )}${k.circle(gx - 30, gy + 22, 5, '#9aa2ad')}${k.circle(gx + 34, gy + 22, 5, '#9aa2ad')}`
  k.add(
    k.ellipse(
      gx,
      FLOOR - 18,
      70,
      8,
      'rgba(0,0,0,.45)',
      `filter="${k.blur(5)}"`,
    ),
    gun,
  )
  // Muzzle flash.
  k.add(
    k.circle(
      gx + 82,
      gy - 84,
      16,
      hsl(45, 100, 70, 0.6),
      `filter="${k.blur(6)}"`,
    ),
  )
  // Crosshair.
  const cx = 520
  const cy = 96
  k.add(
    k.glow(
      k.circle(
        cx,
        cy,
        26,
        'none',
        `stroke="${hsl(140, 100, 70)}" stroke-width="3"`,
      ) +
        k.line(
          [
            [cx - 38, cy],
            [cx - 12, cy],
          ],
          hsl(140, 100, 70),
          3,
        ) +
        k.line(
          [
            [cx + 12, cy],
            [cx + 38, cy],
          ],
          hsl(140, 100, 70),
          3,
        ) +
        k.line(
          [
            [cx, cy - 38],
            [cx, cy - 12],
          ],
          hsl(140, 100, 70),
          3,
        ) +
        k.line(
          [
            [cx, cy + 12],
            [cx, cy + 38],
          ],
          hsl(140, 100, 70),
          3,
        ),
      4,
      0.8,
    ),
  )
  k.add(k.sparkles(3, [380, 30, 100, 40]))
  return k.vignette().toString()
})
