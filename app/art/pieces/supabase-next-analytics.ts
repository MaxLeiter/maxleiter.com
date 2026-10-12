import { art, hsl, Kit } from '../kit'

/** Live-updating page views: a watchful eye over a monitor whose chart is
 *  climbing in real time, a "live" light pulsing in its corner. */
export default art(['blog:supabase-next-analytics'], () => {
  const k = new Kit({ hue: 150, hue2: 190, spot: [430, 140] })
  k.stage()
  const x = 300
  const y = 104
  const w = 250
  const h = 156
  const pts: [number, number][] = [
    [x + 14, y + 128],
    [x + 50, y + 116],
    [x + 84, y + 122],
    [x + 120, y + 96],
    [x + 156, y + 100],
    [x + 192, y + 64],
    [x + 234, y + 40],
  ]
  const chart =
    [0, 1, 2, 3]
      .map((i) =>
        k.rect(x + 10, y + 30 + i * 30, w - 20, 1, 0, 'rgba(255,255,255,.08)'),
      )
      .join('') +
    k.path(
      `M${pts.map(([a, b]) => `${a} ${b}`).join('L')}L${x + 234} ${y + h}L${x + 14} ${y + h}Z`,
      k.lin(0, y + 40, 0, y + h, [
        [0, hsl(150, 90, 55, 0.55)],
        [1, hsl(150, 90, 55, 0)],
      ]),
    ) +
    k.glow(k.line(pts, hsl(150, 100, 70), 4), 5, 0.9) +
    k.circle(x + 234, y + 40, 6, '#fff') +
    k.circle(x + 222, y + 16, 5, hsl(0, 90, 60)) +
    k.circle(
      x + 222,
      y + 16,
      10,
      hsl(0, 90, 60, 0.3),
      `filter="${k.blur(3)}"`,
    ) +
    k.rect(x + 14, y + 12, 70, 8, 4, 'rgba(255,255,255,.4)')
  const monitor =
    k.slab(x - 12, y - 12, w + 24, h + 24, 14, {
      face: ['#353b47', '#12151b'],
      side: '#06070a',
      depth: 7,
    }) +
    k.screen(x, y, w, h, 6, chart) +
    k.rect(x + w / 2 - 14, y + h + 12, 28, 30, 0, '#22262e') +
    k.rect(x + w / 2 - 60, 296, 120, 8, 4, '#2b3039')
  k.standing(monitor, x + w / 2, 150)
  // The eye.
  const ex = 360
  const ey = 66
  k.add(
    k.glow(
      k.path(
        `M${ex - 56} ${ey}q56-46 112 0q-56 46-112 0z`,
        '#f7fbff',
        'stroke="#0d3b2a" stroke-width="4"',
      ),
      10,
      0.6,
    ),
    k.orb(ex, ey, 20, 160, 52),
    k.circle(ex, ey, 9, '#071410'),
    k.circle(ex - 6, ey - 7, 4, '#fff'),
  )
  k.add(k.sparkles(4, [420, 30, 180, 60]))
  return k.vignette().toString()
})
