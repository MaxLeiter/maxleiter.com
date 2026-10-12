import { art, FLOOR, hsl, Kit } from '../kit'

/** Running Wayland, X11, GNOME and KDE on an iPad: a tablet on a stand,
 *  its screen a Linux desktop with a top bar, a dock and live windows. */
export default art(['blog:xios'], () => {
  const k = new Kit({ hue: 265, hue2: 225, spot: [400, 120] })
  k.stage()
  const x = 250
  const y = 92
  const w = 300
  const h = 200
  const desk = k.lin(x, y, x + w, y + h, [
    [0, hsl(285, 70, 38)],
    [0.55, hsl(240, 70, 30)],
    [1, hsl(200, 80, 34)],
  ])
  const screen =
    k.rect(x, y, w, h, 0, desk) +
    k.circle(
      x + w * 0.72,
      y + h * 0.42,
      70,
      hsl(300, 90, 60, 0.35),
      `filter="${k.blur(18)}"`,
    ) +
    k.rect(x, y, w, 12, 0, 'rgba(10,12,20,.85)') +
    k.circle(x + w / 2, y + 6, 2.2, '#fff') +
    k.rect(x + w - 40, y + 3.5, 30, 5, 2.5, 'rgba(255,255,255,.6)') +
    k.window(x + 18, y + 26, 150, 104, {
      bar: '#2b2f3a',
      body: '#0f1218',
      content: k.bars(x + 28, y + 50, 130, 6, {
        colors: ['#7ee787', '#79c0ff', 'rgba(255,255,255,.6)', '#ffa657'],
        indent: [0, 1, 1, 2, 1, 0],
        lead: 12,
        height: 4,
      }),
    }) +
    k.window(x + 132, y + 58, 150, 112, {
      bar: '#e8e8ee',
      body: '#f6f6fa',
      content:
        k.rect(x + 142, y + 84, 56, 40, 4, hsl(200, 80, 60)) +
        k.rect(x + 206, y + 84, 66, 18, 4, hsl(330, 80, 65)) +
        k.rect(x + 206, y + 106, 66, 18, 4, hsl(45, 90, 60)) +
        k.bars(x + 142, y + 134, 130, 3, {
          colors: ['rgba(20,24,36,.35)'],
          height: 4,
          lead: 9,
        }),
    }) +
    k.rect(x + w / 2 - 70, y + h - 22, 140, 16, 8, 'rgba(255,255,255,.18)') +
    [0, 1, 2, 3, 4]
      .map((i) =>
        k.orb(x + w / 2 - 52 + i * 26, y + h - 14, 5.5, 200 + i * 40, 60),
      )
      .join('')
  const tablet =
    k.slab(x - 14, y - 14, w + 28, h + 28, 18, {
      face: ['#3a4150', '#11141b'],
      side: '#07080b',
      depth: 7,
      rim: 'rgba(255,255,255,.55)',
    }) +
    k.screen(x, y, w, h, 6, screen) +
    k.circle(x - 7, y + h / 2, 2, 'rgba(255,255,255,.25)')
  const stand =
    k.poly(
      [
        [x + w / 2 - 30, y + h + 10],
        [x + w / 2 + 30, y + h + 10],
        [x + w / 2 + 52, FLOOR],
        [x + w / 2 - 52, FLOOR],
      ],
      k.lin(0, y + h, 0, FLOOR, [
        [0, '#5a6272'],
        [1, '#1a1e26'],
      ]),
    ) + k.rect(x + w / 2 - 70, FLOOR - 6, 140, 8, 4, '#2a2f3a')
  k.standing(stand + tablet, x + w / 2, 160)
  k.add(k.sparkles(5, [x + w - 20, y - 30, 120, 90]))
  return k.vignette().toString()
})
