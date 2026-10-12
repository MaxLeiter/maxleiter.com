import { art, hsl, Kit } from '../kit'

/** The Framework Laptop: an open, repairable laptop with its expansion
 *  cards lifted out beside it and a screwdriver ready. */
export default art(['blog:framework'], () => {
  const k = new Kit({ hue: 24, hue2: 220, spot: [410, 150] })
  k.stage()
  const x = 300
  const y = 86
  const w = 230
  const h = 150
  const lid = k.slab(x, y, w, h, 10, {
    face: ['#d6dbe2', '#8b929c'],
    side: '#454b55',
    depth: 5,
  })
  const screen = k.screen(
    x + 10,
    y + 10,
    w - 20,
    h - 20,
    4,
    k.rect(
      x + 10,
      y + 10,
      w - 20,
      h - 20,
      0,
      k.lin(x, y, x + w, y + h, [
        [0, hsl(200, 60, 30)],
        [1, hsl(280, 60, 22)],
      ]),
    ) +
      k.rect(x + 10, y + 10, w - 20, 9, 0, 'rgba(0,0,0,.6)') +
      k.window(x + 22, y + 28, 120, 80, {
        bar: '#2b2f3a',
        body: '#0f1218',
        content: k.bars(x + 30, y + 50, 100, 4, {
          colors: ['#7ee787', '#79c0ff', '#ffa657'],
          height: 4,
          lead: 11,
        }),
      }) +
      k.window(x + 120, y + 52, 90, 66, { bar: '#2b2f3a', body: '#141922' }),
  )
  const base = k.poly(
    [
      [x - 26, y + h + 4],
      [x + w + 26, y + h + 4],
      [x + w + 40, y + h + 30],
      [x - 40, y + h + 30],
    ],
    k.lin(0, y + h, 0, y + h + 30, [
      [0, '#c9ced6'],
      [1, '#6c727c'],
    ]),
    'stroke="rgba(255,255,255,.6)" stroke-width="1"',
  )
  const keys =
    Array.from({ length: 12 }, (_, i) =>
      k.rect(x - 10 + i * 21, y + h + 10, 17, 5, 1.5, 'rgba(30,34,40,.55)'),
    ).join('') +
    Array.from({ length: 11 }, (_, i) =>
      k.rect(x - 2 + i * 21, y + h + 18, 17, 5, 1.5, 'rgba(30,34,40,.55)'),
    ).join('')
  k.standing(lid + screen + base + keys, x + w / 2, 170)
  // Expansion cards, floating out.
  const card = (cx: number, cy: number, hue: number, rot: number) =>
    `<g transform="rotate(${rot} ${cx} ${cy})">${k.slab(cx - 16, cy - 24, 32, 48, 6, { face: [hsl(hue, 20, 85), hsl(hue, 15, 55)], depth: 4 })}${k.rect(cx - 9, cy - 30, 18, 8, 2, hsl(hue, 90, 55))}</g>`
  k.add(
    card(255, 150, 210, -14),
    card(232, 216, 25, 10),
    card(575, 140, 140, 12),
  )
  k.add(
    `<g transform="rotate(-38 575 230)">${k.rect(
      560,
      160,
      14,
      70,
      7,
      k.lin(560, 0, 574, 0, [
        [0, hsl(24, 95, 62)],
        [1, hsl(18, 90, 40)],
      ]),
    )}${k.rect(
      564,
      230,
      6,
      46,
      2,
      k.lin(0, 230, 0, 276, [
        [0, '#e6eaf0'],
        [1, '#7c838e'],
      ]),
    )}</g>`,
  )
  k.add(k.sparkles(5, [230, 60, 380, 80]))
  return k.vignette().toString()
})
