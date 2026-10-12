import { art, hsl, Kit } from '../kit'

/** X11 on iOS: an older iPad running the classic X Window System -- grey
 *  stippled root window, bevelled xterms, a big X cursor. */
export default art(['blog:X11', 'project:x11-on-ios'], () => {
  const k = new Kit({ hue: 200, hue2: 230, spot: [420, 150] })
  k.stage()
  const x = 270
  const y = 78
  const w = 270
  const h = 196
  let stipple = ''
  for (let j = 0; j < h; j += 6)
    for (let i = (j / 6) % 2 ? 3 : 0; i < w; i += 6)
      stipple += `M${x + i} ${y + j}h3v3h-3z`
  const xterm = (wx: number, wy: number, ww: number, wh: number) =>
    k.rect(wx, wy, ww, wh, 0, '#c9ccd2') +
    k.rect(wx + 3, wy + 3, ww - 6, 12, 0, hsl(220, 40, 40)) +
    k.rect(wx + 4, wy + 18, ww - 8, wh - 22, 0, '#05070a') +
    k.bars(wx + 9, wy + 25, ww - 20, Math.floor((wh - 30) / 9), {
      colors: ['#9df29d', 'rgba(220,230,240,.75)'],
      height: 3.5,
      lead: 9,
    })
  const xcursor = (cx: number, cy: number, s: number) =>
    k.path(
      `M${cx - s} ${cy - s}l${s * 0.35} 0l${s * 0.65} ${s * 0.75}l${s * 0.65}-${s * 0.75}l${s * 0.35} 0l-${s * 0.82} ${s}l${s * 0.82} ${s}l-${s * 0.35} 0l-${s * 0.65}-${s * 0.75}l-${s * 0.65} ${s * 0.75}l-${s * 0.35} 0l${s * 0.82}-${s}z`,
      '#fff',
      'stroke="#000" stroke-width="1.5"',
    )
  const screen = `${k.rect(
    x,
    y,
    w,
    h,
    0,
    '#5d6370',
  )}<path d="${stipple}" fill="#818796"/>${xterm(
    x + 16,
    y + 18,
    150,
    100,
  )}${xterm(x + 110, y + 82, 145, 96)}${k.rect(
    x + 196,
    y + 14,
    58,
    52,
    0,
    '#c9ccd2',
  )}${k.circle(
    x + 225,
    y + 42,
    19,
    '#f4f4f4',
    'stroke="#222" stroke-width="2"',
  )}${k.line(
    [
      [x + 225, y + 42],
      [x + 225, y + 28],
    ],
    '#222',
    2,
  )}${k.line(
    [
      [x + 225, y + 42],
      [x + 235, y + 47],
    ],
    '#222',
    2,
  )}${xcursor(x + 92, y + 150, 11)}`
  k.standing(
    k.slab(x - 18, y - 22, w + 36, h + 44, 22, {
      face: ['#f1f3f6', '#a7adb6'],
      side: '#4c525c',
      depth: 7,
    }) +
      k.screen(x, y, w, h, 2, screen) +
      k.circle(
        x + w / 2,
        y + h + 12,
        6,
        '#d9dde3',
        'stroke="#8d939c" stroke-width="1.5"',
      ),
    x + w / 2,
    170,
  )
  k.add(k.sparkles(4, [540, 60, 80, 120]))
  return k.vignette().toString()
})
