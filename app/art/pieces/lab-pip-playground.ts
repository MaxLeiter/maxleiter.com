import { art, hsl, Kit } from '../kit'

/** A picture-in-picture playground: a big screen playing one scene, and a
 *  small floating window popped out of it into the corner, its resize
 *  handle glinting, still playing the same picture. */
export default art(['lab:pip-playground'], () => {
  const k = new Kit({ hue: 320, hue2: 250, spot: [430, 130] })
  k.stage()
  const scene = (x: number, y: number, w: number, h: number) =>
    k.rect(
      x,
      y,
      w,
      h,
      0,
      k.lin(x, y, x, y + h, [
        [0, hsl(260, 70, 40)],
        [0.6, hsl(320, 80, 56)],
        [1, hsl(30, 90, 58)],
      ]),
    ) +
    k.circle(x + w * 0.66, y + h * 0.56, h * 0.18, hsl(45, 100, 72)) +
    k.path(
      `M${x} ${y + h}l${w * 0.3}-${h * 0.36}l${w * 0.2} ${h * 0.2}l${w * 0.22}-${h * 0.3}l${w * 0.28} ${h * 0.46}z`,
      hsl(270, 50, 18),
    )
  const tx = 290
  const ty = 60
  const tv =
    k.slab(tx - 12, ty - 12, 284, 184, 14, {
      face: ['#353b47', '#12151b'],
      side: '#06070a',
      depth: 7,
    }) +
    k.screen(tx, ty, 260, 160, 6, scene(tx, ty, 260, 160)) +
    k.rect(tx + 110, ty + 172, 40, 40, 0, '#22262e') +
    k.rect(tx + 70, 296, 120, 8, 4, '#2b3039')
  k.standing(tv, tx + 130, 150)
  // The floating mini player.
  const px = 488
  const py = 168
  k.add(
    k.rect(
      px + 6,
      py + 12,
      124,
      76,
      10,
      'rgba(0,0,0,.55)',
      `filter="${k.blur(8)}"`,
    ),
    k.slab(px - 4, py - 4, 128, 80, 10, {
      face: ['#ffffff', '#d4dae3'],
      side: '#56606c',
      depth: 5,
    }),
    k.screen(px, py, 120, 72, 6, scene(px, py, 120, 72)),
    k.line(
      [
        [px + 104, py + 66],
        [px + 116, py + 54],
      ],
      '#fff',
      2.5,
    ),
    k.line(
      [
        [px + 110, py + 66],
        [px + 116, py + 60],
      ],
      '#fff',
      2.5,
    ),
    k.curve(
      [
        [tx + 230, ty + 120],
        [px - 10, py - 30],
        [px + 20, py - 10],
      ],
      'rgba(255,255,255,.5)',
      2.5,
      'stroke-dasharray="2 7"',
    ),
  )
  k.add(k.sparkles(4, [px, py - 50, 120, 40]))
  return k.vignette().toString()
})
