import { art, hsl, Kit } from '../kit'

/** Never think about branch names again: a glossy branch growing out of a
 *  trunk of commits, a blank luggage tag on every twig already filled in by
 *  the script, and a tear-off calendar for the date it stamps on each. */
export default art(['note:git-checkout-script'], () => {
  const k = new Kit({ hue: 110, hue2: 170, spot: [420, 140] })
  k.stage()
  const wood = k.lin(0, 60, 0, 300, [
    [0, hsl(30, 50, 48)],
    [1, hsl(25, 50, 26)],
  ])
  const tree =
    k.path('M420 304c-6-60 0-120 -6-170l14 0c4 50 -2 110 6 170z', wood) +
    k.curve(
      [
        [420, 210],
        [470, 190],
        [540, 150],
      ],
      hsl(28, 50, 38),
      10,
    ) +
    k.curve(
      [
        [418, 160],
        [370, 130],
        [310, 110],
      ],
      hsl(28, 50, 38),
      9,
    ) +
    k.curve(
      [
        [424, 130],
        [460, 92],
        [500, 70],
      ],
      hsl(28, 50, 38),
      7,
    )
  k.standing(tree, 420, 60, 0.2)
  const commits: [number, number][] = [
    [421, 270],
    [421, 230],
    [421, 190],
    [421, 150],
  ]
  k.add(...commits.map(([x, y]) => k.orb(x, y, 9, 120, 56)))
  // Tags hanging from the twigs.
  const tag = (x: number, y: number, hue: number, rot: number) =>
    `${k.line(
      [
        [x, y],
        [x + 4, y + 18],
      ],
      '#e8e2d0',
      1.5,
    )}<g transform="rotate(${rot} ${x + 4} ${y + 18})">${k.path(
      `M${x - 8} ${y + 26}l12-10h50q6 0 6 6v20q0 6-6 6h-50z`,
      k.lin(0, y + 16, 0, y + 48, [
        [0, hsl(hue, 80, 68)],
        [1, hsl(hue, 75, 48)],
      ]),
      'stroke="rgba(255,255,255,.6)" stroke-width="1.5"',
    )}${k.circle(x + 6, y + 32, 3, '#2a2a30')}${k.rect(
      x + 16,
      y + 28,
      34,
      5,
      2.5,
      'rgba(255,255,255,.75)',
    )}</g>`
  k.add(
    tag(540, 150, 200, 8),
    tag(310, 110, 330, -10),
    tag(500, 70, 45, 6),
    tag(470, 190, 160, 12),
  )
  // Calendar block.
  const cx = 270
  const cy = 210
  k.standing(
    k.slab(cx, cy, 80, 94, 8, {
      face: ['#ffffff', '#dfe4ea'],
      side: '#6b7380',
      depth: 6,
    }) +
      k.rect(
        cx,
        cy,
        80,
        24,
        0,
        hsl(355, 80, 55),
        `clip-path="${k.clip(k.rect(cx, cy, 80, 94, 8, '#fff'))}"`,
      ) +
      k.rect(cx + 20, cy + 40, 40, 34, 4, 'rgba(30,40,60,.75)') +
      [0, 1]
        .map((i) => k.rect(cx + 20 + i * 30, cy - 6, 8, 14, 3, '#9aa3ad'))
        .join(''),
    cx + 40,
    50,
  )
  k.add(k.sparkles(4, [340, 30, 240, 50]))
  return k.vignette().toString()
})
