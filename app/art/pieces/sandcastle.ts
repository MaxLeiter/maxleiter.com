import { art, FLOOR, hsl, Kit } from '../kit'

/** Sandcastle, a Linux desktop on the web: a sandcastle on the beach whose
 *  towers are windows -- title bars, close buttons and all -- with a
 *  bucket and spade beside it and the sea glittering behind. */
export default art(['blog:sandcastle'], () => {
  const k = new Kit({ hue: 35, hue2: 200, spot: [430, 120] })
  k.stage()
  // The sea.
  k.add(
    k.rect(
      0,
      232,
      640,
      72,
      0,
      k.lin(0, 232, 0, FLOOR, [
        [0, hsl(195, 80, 52, 0.9)],
        [1, hsl(185, 70, 40, 0.6)],
      ]),
    ),
    k.rect(0, 232, 640, 2, 0, hsl(190, 100, 85, 0.7)),
    ...[0, 1, 2, 3, 4, 5].map((i) =>
      k.rect(
        40 + i * 110 + k.rand() * 30,
        246 + (i % 3) * 14,
        40,
        2,
        1,
        'rgba(255,255,255,.5)',
      ),
    ),
  )
  const sand = (l: number) => hsl(40, 70, l)
  const tower = (x: number, w: number, h: number) =>
    k.rect(
      x,
      FLOOR - h,
      w,
      h,
      2,
      k.lin(x, 0, x + w, 0, [
        [0, sand(70)],
        [0.5, sand(62)],
        [1, sand(46)],
      ]),
    ) +
    [0, 1, 2]
      .map((i) =>
        k.rect(x + i * (w / 3) + 2, FLOOR - h - 12, w / 3 - 6, 14, 2, sand(66)),
      )
      .join('') +
    // Each tower's window.
    k.window(x + 8, FLOOR - h + 18, w - 16, Math.min(56, h - 40), {
      bar: '#e9ecf1',
      body: hsl(215, 40, 18),
      r: 4,
      content: k.bars(x + 14, FLOOR - h + 42, w - 30, 2, {
        colors: [hsl(140, 70, 60), 'rgba(255,255,255,.6)'],
        height: 3,
        lead: 8,
      }),
    })
  const castle =
    k.rect(
      310,
      FLOOR - 70,
      260,
      70,
      2,
      k.lin(0, FLOOR - 70, 0, FLOOR, [
        [0, sand(62)],
        [1, sand(44)],
      ]),
    ) +
    tower(300, 72, 150) +
    tower(410, 92, 196) +
    tower(530, 66, 128) +
    k.path(`M440 ${FLOOR}v-34a16 16 0 0 1 32 0v34z`, hsl(30, 50, 26)) +
    k.line(
      [
        [456, FLOOR - 196 - 12],
        [456, FLOOR - 196 - 52],
      ],
      '#5a4630',
      3,
    ) +
    k.poly(
      [
        [456, FLOOR - 248],
        [490, FLOOR - 238],
        [456, FLOOR - 228],
      ],
      hsl(355, 85, 58),
    )
  k.standing(castle, 440, 180, 0.2)
  // Bucket and spade.
  const bucket = `${
    k.path(
      `M232 ${FLOOR - 52}h56l-8 52h-40z`,
      k.lin(232, 0, 288, 0, [
        [0, hsl(200, 80, 42)],
        [0.4, hsl(195, 90, 62)],
        [1, hsl(205, 80, 36)],
      ]),
    ) +
    k.ellipse(260, FLOOR - 52, 28, 7, hsl(195, 80, 70)) +
    k.path(
      `M234 ${FLOOR - 50}q26-34 52 0`,
      'none',
      'stroke="#d9dee5" stroke-width="2.5"',
    )
  }<g transform="rotate(18 300 ${FLOOR - 40})">${k.rect(296, FLOOR - 96, 8, 64, 3, hsl(50, 90, 55))}${k.path(`M288 ${FLOOR - 34}h24l-4 26q-8 8-16 0z`, hsl(355, 80, 55))}</g>`
  k.standing(bucket, 262, 40)
  k.add(k.sparkles(5, [300, 30, 300, 60]))
  return k.vignette().toString()
})
