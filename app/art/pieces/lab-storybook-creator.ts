import { art, hsl, Kit } from '../kit'

/** An AI storybook creator for children's ABC books: a picture book lying
 *  open, a smiling sun and a little house on its pages, and three toy
 *  alphabet blocks stacked beside it. */
export default art(['lab:storybook-creator'], () => {
  const k = new Kit({ hue: 40, hue2: 300, spot: [430, 140] })
  k.stage()
  const cx = 420
  const cy = 230
  const left = `M${cx} ${cy - 10}q-70-20-150 0l-10 70q80-14 160 6z`
  const right = `M${cx} ${cy - 10}q70-20 150 0l10 70q-80-14-160 6z`
  const book =
    k.path(
      `M${cx - 168} ${cy + 64}q84-12 168 10q84-22 168-10v10q-84-8-168 12q-84-20-168-12z`,
      hsl(350, 70, 42),
    ) +
    k.path(
      left,
      k.lin(cx - 160, 0, cx, 0, [
        [0, '#f6f0e0'],
        [1, '#fffdf6'],
      ]),
    ) +
    k.path(
      right,
      k.lin(cx, 0, cx + 160, 0, [
        [0, '#fffdf6'],
        [1, '#efe7d2'],
      ]),
    ) +
    // Left page: sun.
    k.orb(cx - 86, cy + 18, 20, 45, 64) +
    k.path(
      `M${cx - 94} ${cy + 22}q8 8 16 0`,
      'none',
      'stroke="#7a4a10" stroke-width="2" stroke-linecap="round"',
    ) +
    // Right page: house.
    k.rect(cx + 60, cy + 16, 40, 30, 2, hsl(200, 70, 60)) +
    k.poly(
      [
        [cx + 54, cy + 18],
        [cx + 80, cy - 4],
        [cx + 106, cy + 18],
      ],
      hsl(355, 80, 56),
    ) +
    k.rect(cx + 74, cy + 30, 12, 16, 2, hsl(30, 60, 38)) +
    k.path(
      `M${cx + 30} ${cy + 52}q50-8 110 0`,
      'none',
      `stroke="${hsl(110, 60, 45)}" stroke-width="4"`,
    )
  k.standing(book, cx, 170, 0.2)
  // Blocks with shapes rather than letters.
  const block = (x: number, y: number, s: number, hue: number, mark: string) =>
    k.cube(x, y, s, [hsl(hue, 80, 70), hsl(hue, 70, 52), hsl(hue, 65, 40)]) +
    mark
  k.add(
    block(
      560,
      236,
      28,
      200,
      k.circle(560 - 12, 246, 6, '#fff', 'opacity=".85"'),
    ),
    block(
      560,
      180,
      28,
      45,
      k.poly(
        [
          [548, 196],
          [554, 184],
          [560, 196],
        ],
        '#fff',
        'opacity=".85"',
      ),
    ),
    block(
      600,
      250,
      24,
      330,
      k.rect(588, 254, 10, 10, 2, '#fff', 'opacity=".85"'),
    ),
  )
  k.add(k.sparkles(6, [300, 40, 300, 100]))
  return k.vignette().toString()
})
