import { art, hsl, Kit } from '../kit'

/** How 700 hackers run their sites: a wall of tiny personal homepages,
 *  each its own colour, and the stats pulled out of them as a pie of
 *  glossy wedges in front. */
export default art(['blog:hacker-sites'], () => {
  const k = new Kit({ hue: 30, hue2: 260, spot: [430, 140] })
  k.stage()
  const R = k.rand
  // The wall, in a gentle perspective.
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 9; c++) {
      const s = 1 - r * 0.04
      const x = 236 + c * 44 * s + r * 4
      const y = 36 + r * 40
      const hue = R() * 360
      const dark = R() > 0.5
      k.add(
        k.rect(
          x,
          y,
          38 * s,
          32 * s,
          3,
          dark ? '#151a22' : '#f3f4f7',
          `opacity="${0.55 + r * 0.08}"`,
        ),
        k.rect(
          x,
          y,
          38 * s,
          6 * s,
          0,
          hsl(hue, 70, 55),
          `opacity="${0.55 + r * 0.08}"`,
        ),
        k.bars(x + 4, y + 11 * s, 30 * s, 2, {
          colors: [dark ? hsl(hue, 70, 70, 0.7) : 'rgba(20,24,36,.35)'],
          height: 2.5,
          lead: 6,
        }),
      )
    }
  }
  // The pie, as a thick glossy disc.
  const cx = 470
  const cy = 248
  const rx = 92
  const ry = 34
  const wedges: [number, number][] = [
    [0, 0.38],
    [0.38, 0.62],
    [0.62, 0.8],
    [0.8, 1],
  ]
  const hues = [210, 30, 140, 330]
  const pt = (t: number, dy = 0): [number, number] => [
    cx + Math.cos(t * Math.PI * 2 - 1) * rx,
    cy + dy + Math.sin(t * Math.PI * 2 - 1) * ry,
  ]
  let disc = k.ellipse(cx, cy + 16, rx, ry, '#1a1d24')
  disc += k.rect(cx - rx, cy, rx * 2, 16, 0, '#262a33')
  wedges.forEach(([a, b], i) => {
    const [x0, y0] = pt(a)
    const [x1, y1] = pt(b)
    const off = i === 1 ? [10, -8] : [0, 0]
    disc += `<g transform="translate(${off[0]} ${off[1]})">${k.path(
      `M${cx} ${cy}L${x0} ${y0}A${rx} ${ry} 0 ${b - a > 0.5 ? 1 : 0} 1 ${x1} ${y1}Z`,
      k.lin(cx - rx, cy - ry, cx + rx, cy + ry, [
        [0, hsl(hues[i], 85, 66)],
        [1, hsl(hues[i], 80, 44)],
      ]),
      'stroke="rgba(255,255,255,.55)" stroke-width="1.5"',
    )}</g>`
  })
  k.standing(disc, cx, 110)
  k.add(k.sparkles(4, [330, 20, 280, 50]))
  return k.vignette().toString()
})
