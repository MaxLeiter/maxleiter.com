import { art, FLOOR, hsl, Kit } from '../kit'

/** AR glasses: a pair of dark-lensed sunglasses in front, and the screens
 *  they put in the air floating behind them, a monitor wall in an empty room. */
export default art(['blog:seeing-the-future'], () => {
  const k = new Kit({ hue: 210, hue2: 260, spot: [420, 130] })
  k.stage()
  // Floating virtual displays, translucent and glowing.
  const pane = (
    x: number,
    y: number,
    w: number,
    h: number,
    hue: number,
    rot: number,
  ) =>
    `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})">${k.glow(
      k.rect(
        x,
        y,
        w,
        h,
        8,
        hsl(hue, 90, 60, 0.18),
        `stroke="${hsl(hue, 100, 80, 0.8)}" stroke-width="2"`,
      ),
      10,
      0.7,
    )}${k.rect(
      x + 10,
      y + 10,
      w * 0.45,
      h * 0.5,
      4,
      hsl(hue, 90, 70, 0.35),
    )}${k.bars(x + w * 0.55, y + 12, w * 0.38, 4, {
      colors: [hsl(hue, 100, 88, 0.6)],
      height: 4,
      lead: 10,
    })}${k.bars(x + 10, y + h * 0.66, w - 20, 2, {
      colors: [hsl(hue, 100, 88, 0.45)],
      height: 4,
      lead: 10,
    })}</g>`
  k.add(
    pane(250, 48, 150, 96, 195, -8),
    pane(420, 34, 190, 118, 230, 4),
    pane(470, 168, 120, 78, 280, 10),
  )
  // The glasses: two lenses on a bridge, arms going back.
  const cx = 400
  const cy = 236
  const lens = (lx: number) =>
    k.path(
      `M${lx - 58} ${cy - 22}q0-14 16-14h84q16 0 16 14v10q0 40-40 44h-40q-36-4-36-44z`,
      k.lin(0, cy - 36, 0, cy + 40, [
        [0, hsl(250, 60, 30, 0.95)],
        [0.5, hsl(220, 60, 14, 0.95)],
        [1, hsl(190, 80, 30, 0.95)],
      ]),
      `stroke="#15171e" stroke-width="7"`,
    ) +
    k.path(`M${lx - 50} ${cy - 24}h50l-22 52h-22z`, 'rgba(255,255,255,.12)') +
    k.path(
      `M${lx - 50} ${cy - 24}q0-8 10-8h76`,
      'none',
      'stroke="rgba(255,255,255,.4)" stroke-width="2"',
    )
  const glasses =
    k.path(`M${cx - 120} ${cy - 24}l-46-30l-6 4l40 34z`, '#2a2d36') +
    k.path(`M${cx + 140} ${cy - 24}l46-30l6 4l-40 34z`, '#2a2d36') +
    lens(cx - 62) +
    lens(cx + 82) +
    k.path(
      `M${cx - 4} ${cy - 20}q14-12 28 0`,
      'none',
      'stroke="#15171e" stroke-width="7"',
    )
  // A beam from each lens to the panes.
  k.add(
    k.poly(
      [
        [cx - 60, cy - 30],
        [cx - 20, cy - 30],
        [330, 140],
        [260, 120],
      ],
      hsl(200, 100, 80, 0.07),
    ),
    k.poly(
      [
        [cx + 70, cy - 30],
        [cx + 110, cy - 30],
        [600, 150],
        [440, 140],
      ],
      hsl(230, 100, 80, 0.07),
    ),
  )
  k.add(
    k.ellipse(
      cx + 10,
      FLOOR + 2,
      150,
      8,
      'rgba(0,0,0,.45)',
      `filter="${k.blur(8)}"`,
    ),
  )
  k.add(
    `<g transform="translate(${cx + 10} ${cy}) rotate(-5) scale(1.25) translate(${-cx - 10} ${-cy})">${glasses}</g>`,
  )
  k.add(k.sparkles(5, [260, 20, 360, 60]))
  return k.vignette().toString()
})
