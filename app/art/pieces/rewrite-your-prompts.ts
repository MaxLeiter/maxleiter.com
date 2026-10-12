import { art, hsl, Kit } from '../kit'

/** Rewrite your prompts for each new model, or it is apples to oranges: a
 *  prompt marked up in red pen, a pencil mid-edit, an apple and an orange
 *  waiting to be compared on their own terms. */
export default art(['blog:rewrite-your-prompts'], () => {
  const k = new Kit({ hue: 20, hue2: 340, spot: [420, 140] })
  k.stage()
  const x = 330
  const y = 60
  const w = 180
  const h = 220
  const doc = `<g transform="rotate(-6 ${x + w / 2} ${y + h / 2})">${
    k.sheet(x, y, w, h, 9, 'rgba(40,50,70,.4)')
    // Struck lines and the rewrites written over them.
  }${k.line(
    [
      [x + 22, y + 66],
      [x + 140, y + 66],
    ],
    hsl(355, 85, 52),
    3,
  )}${k.curve(
    [
      [x + 30, y + 58],
      [x + 70, y + 48],
      [x + 110, y + 56],
      [x + 150, y + 46],
    ],
    hsl(355, 85, 52),
    2.5,
  )}${k.line(
    [
      [x + 22, y + 120],
      [x + 118, y + 120],
    ],
    hsl(355, 85, 52),
    3,
  )}${k.curve(
    [
      [x + 24, y + 110],
      [x + 60, y + 102],
      [x + 96, y + 108],
      [x + 130, y + 100],
    ],
    hsl(355, 85, 52),
    2.5,
  )}${k.ellipse(
    x + 120,
    y + 168,
    34,
    14,
    'none',
    `stroke="${hsl(355, 85, 52)}" stroke-width="2.5"`,
  )}</g>`
  k.add(doc)
  // The pencil.
  const pencil = `<g transform="rotate(38 520 120)">${k.rect(
    500,
    20,
    28,
    170,
    4,
    k.lin(500, 0, 528, 0, [
      [0, hsl(42, 95, 48)],
      [0.45, hsl(46, 100, 66)],
      [1, hsl(38, 90, 40)],
    ]),
  )}${k.rect(500, 6, 28, 18, 4, hsl(340, 70, 70))}${k.rect(
    500,
    22,
    28,
    8,
    0,
    '#c9ced6',
  )}${k.poly(
    [
      [500, 190],
      [528, 190],
      [514, 228],
    ],
    hsl(30, 60, 78),
  )}${k.poly(
    [
      [508, 211],
      [520, 211],
      [514, 228],
    ],
    '#2a2a30',
  )}</g>`
  k.add(pencil)
  // Apple and orange on the floor.
  const apple =
    k.path(
      'M228 300c-34 0-46-30-42-52 4-24 22-32 36-26 6 3 10 3 16 0 14-6 32 2 36 26 4 22-8 52-46 52z',
      k.rad(212, 250, 60, [
        [0, hsl(0, 90, 66)],
        [0.6, hsl(355, 85, 46)],
        [1, hsl(350, 80, 26)],
      ]),
    ) +
    k.ellipse(
      212,
      246,
      12,
      7,
      'rgba(255,255,255,.55)',
      `filter="${k.blur(2)}"`,
    ) +
    k.line(
      [
        [228, 222],
        [232, 204],
      ],
      '#4a3020',
      4,
    ) +
    k.path('M232 210q16-14 30-4q-14 12-30 4z', hsl(110, 60, 45))
  const orange =
    k.orb(300, 268, 33, 30, 58) + k.circle(300, 238, 3, hsl(100, 50, 35))
  k.standing(apple + orange, 260, 90)
  k.add(k.sparkles(5, [330, 30, 260, 70]))
  return k.vignette().toString()
})
