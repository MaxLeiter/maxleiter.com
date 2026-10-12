import { art, hsl, Kit } from '../kit'

/** jsonTree, a first open-source project that draws JSON as a tree: a
 *  little bonsai whose branches end in glossy nodes, and whose leaves are
 *  pairs of curly braces. */
export default art(['project:jsontree'], () => {
  const k = new Kit({ hue: 130, hue2: 180, spot: [430, 130] })
  k.stage()
  const trunk = hsl(28, 45, 34)
  const tree =
    k.path('M420 270c-4-40 6-70 -10-110l12-2c16 36 4 70 10 112z', trunk) +
    k.curve(
      [
        [418, 210],
        [380, 190],
        [340, 160],
      ],
      trunk,
      9,
    ) +
    k.curve(
      [
        [420, 180],
        [470, 160],
        [510, 130],
      ],
      trunk,
      8,
    ) +
    k.curve(
      [
        [414, 160],
        [400, 120],
        [420, 80],
      ],
      trunk,
      7,
    ) +
    k.curve(
      [
        [350, 166],
        [320, 140],
        [300, 110],
      ],
      trunk,
      5,
    ) +
    k.curve(
      [
        [500, 136],
        [540, 120],
        [560, 90],
      ],
      trunk,
      5,
    )
  // The pot.
  const pot =
    k.path(
      'M350 268h140l-14 36h-112z',
      k.lin(350, 0, 490, 0, [
        [0, hsl(15, 60, 34)],
        [0.4, hsl(18, 70, 52)],
        [1, hsl(12, 60, 30)],
      ]),
    ) + k.rect(344, 260, 152, 12, 4, hsl(18, 60, 44))
  k.standing(tree + pot, 420, 90)
  const brace = (x: number, y: number, s: number, hue: number) =>
    k.circle(x, y, 22 * s, hsl(hue, 80, 55, 0.35), `filter="${k.blur(6)}"`) +
    k.path(
      `M${x - 6 * s} ${y - 14 * s}q-6 0-6 6v4q0 4-5 4q5 0 5 4v4q0 6 6 6`,
      'none',
      `stroke="${hsl(hue, 90, 72)}" stroke-width="${3.5 * s}" stroke-linecap="round"`,
    ) +
    k.path(
      `M${x + 6 * s} ${y - 14 * s}q6 0 6 6v4q0 4 5 4q-5 0-5 4v4q0 6-6 6`,
      'none',
      `stroke="${hsl(hue, 90, 72)}" stroke-width="${3.5 * s}" stroke-linecap="round"`,
    )
  k.add(
    k.orb(340, 160, 9, 130, 56),
    k.orb(510, 130, 9, 130, 56),
    k.orb(420, 80, 10, 140, 58),
    brace(300, 104, 1.2, 50),
    brace(560, 84, 1.1, 190),
    brace(420, 54, 1.3, 120),
    brace(468, 100, 0.9, 330),
    brace(372, 120, 0.9, 260),
  )
  k.add(k.sparkles(4, [300, 20, 260, 40]))
  return k.vignette().toString()
})
