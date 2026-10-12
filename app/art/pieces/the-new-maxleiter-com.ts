import { art, hsl, Kit } from '../kit'

/** The new maxleiter.com, a desktop of draggable windows: a terminal with
 *  its prompt blinking, a calculator running KnightOS, and a blog post
 *  being dragged across by a grabbing hand, view-transition ghosts behind. */
export default art(['blog:the-new-maxleiter-com'], () => {
  const k = new Kit({ hue: 220, hue2: 260, spot: [420, 140] })
  k.stage()
  // Terminal, back left.
  k.add(
    k.window(250, 60, 170, 116, {
      bar: '#2a2f3a',
      body: '#0c0f14',
      content:
        k.bars(260, 88, 140, 4, {
          colors: [hsl(140, 80, 60), 'rgba(230,237,243,.6)'],
          height: 4,
          lead: 12,
        }) +
        k.rect(260, 140, 8, 4, 0, hsl(140, 80, 60)) +
        k.rect(272, 136, 7, 11, 1, hsl(140, 80, 70)),
    }),
  )
  // Calculator, front left, standing.
  const cx = 290
  const cy = 170
  const keys = [0, 1, 2, 3].flatMap((r) =>
    [0, 1, 2, 3].map((c) =>
      k.rect(
        cx + 10 + c * 18,
        cy + 64 + r * 15,
        14,
        10,
        3,
        c === 3 ? hsl(30, 90, 58) : '#3c424e',
      ),
    ),
  )
  const calc =
    k.slab(cx, cy, 82, 134, 10, {
      face: ['#4a5160', '#1b1f27'],
      side: '#07080b',
      depth: 6,
    }) +
    k.rect(cx + 8, cy + 10, 66, 46, 4, hsl(95, 30, 62)) +
    // A pixel knight on its LCD.
    k.path(
      `M${cx + 30} ${cy + 48}h22v-4h-4v-6l4-4v-8l-6-6h-8l-2 4-6 2v6l6-2v4l-6 6v4h0z`,
      '#24301c',
    ) +
    keys.join('')
  k.standing(calc, cx + 41, 50)
  // Ghosts of the dragged window.
  for (let i = 3; i >= 1; i--) {
    k.add(
      `<g opacity="${(0.1 * (4 - i)).toFixed(2)}">${k.rect(410 - i * 24, 104 + i * 12, 176, 128, 8, hsl(220, 90, 75))}</g>`,
    )
  }
  // The post being dragged.
  const px = 410
  const py = 100
  k.add(
    k.window(px, py, 186, 132, {
      bar: '#e9edf3',
      body: '#f7f9fc',
      content:
        k.rect(px + 12, py + 26, 84, 9, 4, hsl(220, 70, 50)) +
        k.rect(
          px + 12,
          py + 42,
          162,
          34,
          4,
          k.lin(px, py + 42, px + 186, py + 76, [
            [0, hsl(280, 70, 65)],
            [1, hsl(200, 80, 60)],
          ]),
        ) +
        k.bars(px + 12, py + 86, 162, 4, {
          colors: ['rgba(30,40,60,.35)'],
          height: 4,
          lead: 10,
        }),
    }),
  )
  // The grabbing hand on the title bar.
  const hx = px + 120
  const hy = py + 2
  k.add(
    k.path(
      `M${hx} ${hy + 10}c0-6 8-6 8 0v-4c0-6 8-6 8 0v2c0-6 8-6 8 0v4c0-5 7-5 7 0v14c0 12-8 20-18 20h-4c-9 0-14-6-17-12l-5-10c-2-5 4-8 7-4l6 7z`,
      '#fff',
      'stroke="#111" stroke-width="2.5" stroke-linejoin="round"',
    ),
  )
  k.add(k.sparkles(5, [420, 30, 180, 60]))
  return k.vignette().toString()
})
