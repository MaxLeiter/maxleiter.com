import { art, FLOOR, hsl, Kit } from '../kit'

/** Ship something every day: a toy container ship steaming across the
 *  water, its deck stacked with containers in the greens of a commit streak,
 *  the streak itself rising behind it like a skyline of days. */
export default art(['blog:ship-every-day'], () => {
  const k = new Kit({ hue: 200, hue2: 230, spot: [420, 140] })
  k.stage()
  // The streak: a grid of days behind.
  const R = k.rand
  for (let c = 0; c < 16; c++) {
    for (let r = 0; r < 5; r++) {
      const lvl = R()
      k.add(
        k.rect(
          250 + c * 23,
          52 + r * 23,
          18,
          18,
          4,
          hsl(135, 60, 18 + lvl * 38, 0.35 + lvl * 0.5),
        ),
      )
    }
  }
  // Water.
  k.add(
    k.rect(
      0,
      FLOOR - 26,
      640,
      30,
      0,
      k.lin(0, FLOOR - 26, 0, FLOOR + 4, [
        [0, hsl(195, 80, 45, 0)],
        [1, hsl(195, 80, 45, 0.5)],
      ]),
    ),
  )
  const sx = 300
  const sy = 236
  const hull =
    k.path(
      `M${sx} ${sy}h300l-26 46h-252z`,
      k.lin(0, sy, 0, sy + 46, [
        [0, hsl(355, 80, 56)],
        [1, hsl(350, 75, 32)],
      ]),
    ) +
    k.rect(sx, sy, 300, 10, 0, '#f2f4f7') +
    k.gloss(k.path(`M${sx} ${sy}h300l-26 46h-252z`, '#fff'), sy, 46, 0.3)
  let stacks = ''
  for (let c = 0; c < 7; c++) {
    const n = 1 + Math.floor(R() * 3)
    for (let r = 0; r < n; r++) {
      const l = 30 + R() * 30
      stacks += k.slab(sx + 30 + c * 30, sy - 24 - r * 24, 28, 22, 2, {
        face: [hsl(135, 70, l + 14), hsl(135, 70, l - 6)],
        side: hsl(135, 60, 14),
        depth: 2,
      })
    }
  }
  const bridge =
    k.slab(sx + 246, sy - 70, 40, 70, 4, {
      face: ['#ffffff', '#c8d0d9'],
      side: '#59626d',
      depth: 4,
    }) +
    k.rect(sx + 252, sy - 62, 28, 8, 2, hsl(200, 80, 30)) +
    k.rect(sx + 258, sy - 96, 14, 28, 2, hsl(355, 80, 52))
  const smoke = [0, 1, 2]
    .map((i) =>
      k.circle(
        sx + 266 + i * 18,
        sy - 110 - i * 14,
        10 + i * 5,
        `rgba(255,255,255,${0.35 - i * 0.08})`,
        `filter="${k.blur(3)}"`,
      ),
    )
    .join('')
  k.add(smoke)
  k.standing(stacks + bridge + hull, sx + 150, 170, 0.35)
  // Wake.
  k.add(
    k.curve(
      [
        [sx - 10, sy + 40],
        [sx - 60, sy + 52],
        [sx - 140, sy + 50],
      ],
      'rgba(255,255,255,.5)',
      3,
    ),
    k.curve(
      [
        [sx + 4, sy + 46],
        [sx - 40, sy + 60],
        [sx - 110, sy + 62],
      ],
      'rgba(255,255,255,.3)',
      2,
    ),
  )
  k.add(k.sparkles(4, [260, 30, 360, 60]))
  return k.vignette().toString()
})
