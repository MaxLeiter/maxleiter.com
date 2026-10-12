import { art, hsl, Kit } from '../kit'

/** The RSS feed: a little broadcast tower on a hill, rings of signal
 *  radiating from its tip, and posts and notes riding the waves out to
 *  whatever reader catches them. */
export default art(['link:rss'], () => {
  const k = new Kit({ hue: 28, hue2: 260, spot: [430, 120] })
  k.stage()
  const tx = 420
  const top = 90
  // Rings.
  k.add(
    ...[50, 90, 130, 170].map((r, i) =>
      k.glow(
        k.path(
          `M${tx - r * 0.7} ${top - r * 0.7}a${r} ${r} 0 0 1 ${r * 1.4} 0`,
          'none',
          `stroke="${hsl(28, 100, 66, 0.9 - i * 0.18)}" stroke-width="5" stroke-linecap="round"`,
        ),
        4,
        0.8,
      ),
    ),
  )
  // Tower.
  const steel = hsl(28, 20, 70)
  let lattice = ''
  for (let i = 0; i < 6; i++) {
    const y0 = top + 20 + i * 32
    const y1 = y0 + 32
    const w0 = 8 + i * 9
    const w1 = w0 + 9
    lattice +=
      k.line(
        [
          [tx - w0, y0],
          [tx + w1, y1],
        ],
        steel,
        2.5,
      ) +
      k.line(
        [
          [tx + w0, y0],
          [tx - w1, y1],
        ],
        steel,
        2.5,
      )
  }
  const tower =
    k.line(
      [
        [tx - 8, top + 20],
        [tx - 62, 300],
      ],
      steel,
      5,
    ) +
    k.line(
      [
        [tx + 8, top + 20],
        [tx + 62, 300],
      ],
      steel,
      5,
    ) +
    lattice +
    k.orb(tx, top + 6, 16, 28, 60) +
    k.glow(k.circle(tx, top + 6, 5, '#fff'), 4, 1)
  k.standing(tower, tx, 80)
  // Cards riding out.
  k.add(
    `<g transform="rotate(-10 300 150)">${k.sheet(280, 120, 46, 58, 4)}</g>`,
    `<g transform="rotate(12 560 140)">${k.sheet(540, 112, 46, 58, 4)}</g>`,
    `<g transform="rotate(4 600 230)">${k.sheet(584, 206, 36, 46, 3)}</g>`,
  )
  k.add(k.sparkles(4, [300, 20, 260, 40]))
  return k.vignette().toString()
})
