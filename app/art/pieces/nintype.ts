import { art, hsl, Kit } from '../kit'

/** Nintype: a phone keyboard in mid-flight, two thumbs drawing glowing
 *  ribbons across the keys at once. */
export default art(['blog:nintype'], () => {
  const k = new Kit({ hue: 315, hue2: 250, spot: [420, 160] })
  k.stage()
  const x = 330
  const y = 54
  const w = 170
  const h = 250
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
  let keys = ''
  const kw = 14.5
  rows.forEach((row, r) => {
    const off = r === 1 ? 7 : r === 2 ? 20 : 0
    ;[...row].forEach((_, i) => {
      keys += k.slab(
        x + 10 + off + i * (kw + 1.5),
        y + 140 + r * 26,
        kw,
        21,
        4,
        {
          face: ['#ffffff', '#cfd4dc'],
          side: '#7f8792',
          depth: 2,
          rim: 'rgba(255,255,255,.9)',
        },
      )
    })
  })
  keys += k.slab(x + 40, y + 218, 90, 19, 4, {
    face: ['#ffffff', '#cfd4dc'],
    side: '#7f8792',
    depth: 2,
  })
  const screen =
    k.rect(
      x,
      y,
      w,
      h,
      0,
      k.lin(x, y, x, y + h, [
        [0, hsl(260, 50, 24)],
        [1, hsl(320, 50, 18)],
      ]),
    ) +
    k.rect(x + 12, y + 30, w - 24, 80, 10, 'rgba(255,255,255,.12)') +
    k.bars(x + 22, y + 44, w - 44, 4, {
      colors: ['rgba(255,255,255,.75)'],
      height: 5,
      lead: 13,
    }) +
    k.rect(x + 22 + 70, y + 83, 3, 13, 1.5, hsl(320, 100, 70)) +
    k.rect(x, y + 128, w, h - 128, 0, '#c2c8d1') +
    keys +
    k.curve(
      [
        [x + 30, y + 152],
        [x + 60, y + 180],
        [x + 95, y + 160],
        [x + 120, y + 190],
      ],
      hsl(320, 100, 66),
      6,
      `filter="${k.blur(1.2)}"`,
    ) +
    k.curve(
      [
        [x + 140, y + 150],
        [x + 110, y + 172],
        [x + 85, y + 200],
        [x + 52, y + 178],
      ],
      hsl(190, 100, 62),
      6,
      `filter="${k.blur(1.2)}"`,
    )
  const phone =
    k.slab(x - 10, y - 12, w + 20, h + 24, 26, {
      face: ['#2f3540', '#0c0e13'],
      side: '#050608',
      depth: 6,
    }) + k.screen(x, y, w, h, 18, screen)
  k.standing(phone, x + w / 2, 110)
  k.add(
    k.circle(x + 30, y + 152, 8, hsl(320, 100, 80), `filter="${k.blur(4)}"`),
    k.circle(x + 140, y + 150, 8, hsl(190, 100, 80), `filter="${k.blur(4)}"`),
    k.sparkles(6, [x - 70, y, w + 140, 120]),
  )
  return k.vignette().toString()
})
