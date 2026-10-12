import { art, hsl, Kit } from '../kit'

/** Short-form thoughts and links: a glossy megaphone on a stand, sending
 *  out a burst of little speech bubbles and link chips. */
export default art(['link:x'], () => {
  const k = new Kit({ hue: 210, hue2: 250, spot: [440, 140] })
  k.stage()
  const mx = 340
  const my = 170
  const horn =
    k.path(
      `M${mx} ${my - 18}l120-62q14 36 14 80t-14 80l-120-62z`,
      k.lin(mx, 0, mx + 134, 0, [
        [0, '#d7dde5'],
        [0.5, '#ffffff'],
        [1, '#aab3bf'],
      ]),
    ) +
    k.ellipse(
      mx + 127,
      my,
      18,
      80,
      k.lin(0, my - 80, 0, my + 80, [
        [0, '#2a2f38'],
        [1, '#0d0f13'],
      ]),
    ) +
    k.ellipse(
      mx + 127,
      my,
      18,
      80,
      'none',
      'stroke="#eef1f5" stroke-width="4"',
    ) +
    k.rect(mx - 30, my - 22, 34, 44, 10, hsl(210, 80, 52)) +
    k.rect(mx - 14, my + 18, 16, 40, 6, '#3a404b') +
    k.gloss(
      k.path(`M${mx} ${my - 18}l120-62q14 36 14 80t-14 80l-120-62z`, '#fff'),
      my - 80,
      160,
      0.3,
    )
  const stand =
    k.line(
      [
        [mx + 40, my + 30],
        [mx + 20, 300],
      ],
      '#5a616c',
      6,
    ) +
    k.line(
      [
        [mx + 40, my + 30],
        [mx + 70, 300],
      ],
      '#5a616c',
      6,
    )
  k.standing(stand + horn, mx + 50, 110)
  // Burst lines and bubbles.
  k.add(
    ...[-0.6, -0.2, 0.2, 0.6].map((a) =>
      k.line(
        [
          [mx + 160 + Math.cos(a) * 10, my + Math.sin(a) * 60],
          [mx + 190 + Math.cos(a) * 20, my + Math.sin(a) * 90],
        ],
        hsl(50, 100, 72),
        4,
      ),
    ),
  )
  k.add(
    `<g transform="rotate(-10 560 80)">${k.bubble(520, 56, 84, 40, ['#ffffff', '#dfe4ec'], 'left')}${k.bars(532, 70, 60, 1, { colors: ['rgba(30,40,60,.4)'], height: 5 })}</g>`,
    `<g transform="rotate(8 580 200)">${k.bubble(548, 186, 70, 36, [hsl(210, 85, 64), hsl(215, 80, 44)], 'left')}${k.bars(560, 199, 46, 1, { colors: ['rgba(255,255,255,.8)'], height: 5 })}</g>`,
    k.slab(500, 128, 74, 26, 13, {
      face: [hsl(160, 70, 56), hsl(165, 70, 38)],
      depth: 3,
    }),
    k.circle(514, 141, 5, 'none', 'stroke="#fff" stroke-width="2"'),
    k.rect(524, 138, 40, 6, 3, 'rgba(255,255,255,.8)'),
  )
  k.add(k.sparkles(4, [480, 20, 140, 40]))
  return k.vignette().toString()
})
