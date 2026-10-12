import { art, hsl, Kit } from '../kit'

/** vcup, a dead-simple CLI for uploading files to blob storage: a glossy
 *  cup on the floor launching files straight up, a cloud catching them. */
export default art(['lab:vcup'], () => {
  const k = new Kit({ hue: 200, hue2: 240, spot: [430, 120] })
  k.stage()
  const cx = 430
  // The cloud.
  k.add(
    k.circle(cx, 70, 90, hsl(200, 100, 70, 0.25), `filter="${k.blur(16)}"`),
    ...[
      [0, 0, 40],
      [-44, 14, 30],
      [46, 14, 32],
      [-14, -22, 30],
      [22, -16, 26],
    ].map(([x, y, r]) =>
      k.circle(
        cx + x,
        70 + y,
        r,
        k.rad(cx + x - 8, 70 + y - 14, r * 1.6, [
          [0, '#ffffff'],
          [1, '#b8c6d6'],
        ]),
      ),
    ),
    k.rect(cx - 74, 70, 150, 40, 20, '#c6d2df'),
  )
  // Files flying up.
  k.add(
    `<g transform="rotate(-12 ${cx - 40} 160)">${k.sheet(cx - 60, 136, 38, 48, 4)}</g>`,
    `<g transform="rotate(8 ${cx + 6} 128)">${k.sheet(cx - 14, 108, 40, 50, 4)}</g>`,
    `<g transform="rotate(18 ${cx + 52} 168)">${k.sheet(cx + 34, 146, 36, 46, 4)}</g>`,
    ...[
      [-40, 190],
      [8, 170],
      [52, 200],
    ].map(([x, y]) =>
      k.line(
        [
          [cx + x, y + 10],
          [cx + x, y + 40],
        ],
        'rgba(255,255,255,.4)',
        3,
      ),
    ),
  )
  // The cup.
  const cup =
    k.path(
      `M${cx - 54} 232h108l-12 72h-84z`,
      k.lin(cx - 54, 0, cx + 54, 0, [
        [0, hsl(200, 80, 34)],
        [0.35, hsl(195, 90, 62)],
        [0.6, hsl(200, 85, 50)],
        [1, hsl(210, 80, 28)],
      ]),
    ) +
    k.ellipse(cx, 232, 54, 12, hsl(200, 60, 18)) +
    k.ellipse(cx, 232, 54, 12, 'none', 'stroke="#d8eefc" stroke-width="3"') +
    k.path(
      `M${cx + 50} 248q34 4 26 28q-6 16-30 14`,
      'none',
      `stroke="${hsl(200, 80, 44)}" stroke-width="9" stroke-linecap="round"`,
    ) +
    k.poly(
      [
        [cx - 8, 270],
        [cx + 8, 270],
        [cx + 8, 286],
        [cx - 8, 286],
      ],
      'rgba(255,255,255,.85)',
    ) +
    k.poly(
      [
        [cx - 18, 272],
        [cx, 254],
        [cx + 18, 272],
      ],
      'rgba(255,255,255,.85)',
    )
  k.standing(cup, cx, 80)
  k.add(k.sparkles(4, [300, 120, 240, 60]))
  return k.vignette().toString()
})
