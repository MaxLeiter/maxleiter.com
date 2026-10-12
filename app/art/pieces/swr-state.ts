import { art, hsl, Kit } from '../kit'

/** SWR for state, not just fetching: one glowing store at the centre, a
 *  revalidating ring turning around it, and three components wired to the
 *  same key, each lit with the same colour. */
export default art(['note:swr-state'], () => {
  const k = new Kit({ hue: 330, hue2: 260, spot: [430, 140] })
  k.stage()
  const cx = 430
  const cy = 150
  // Wires to the components.
  const comps: [number, number][] = [
    [290, 230],
    [430, 262],
    [570, 230],
  ]
  k.add(
    ...comps.map(([x, y]) =>
      k.glow(
        k.curve(
          [
            [cx, cy],
            [(cx + x) / 2, cy + 30],
            [x, y - 20],
          ],
          hsl(330, 100, 75, 0.8),
          3,
        ),
        4,
        0.8,
      ),
    ),
  )
  // The revalidate ring: two arcs with arrowheads.
  const ring = (a0: number, a1: number) => {
    const r = 64
    const p = (a: number): [number, number] => [
      cx + Math.cos(a) * r,
      cy + Math.sin(a) * r * 0.9,
    ]
    const [x0, y0] = p(a0)
    const [x1, y1] = p(a1)
    const [x2, y2] = p(a1 + 0.25)
    return `<path d="M${x0} ${y0}A${r} ${r * 0.9} 0 0 1 ${x1} ${y1}" fill="none" stroke="${hsl(330, 100, 80)}" stroke-width="6" stroke-linecap="round"/>${k.poly(
      [
        [x1 + (x1 - cx) * 0.18, y1 + (y1 - cy) * 0.18],
        [x2, y2],
        [x1 - (x1 - cx) * 0.18, y1 - (y1 - cy) * 0.18],
      ],
      hsl(330, 100, 80),
    )}`
  }
  k.add(k.glow(ring(-2.6, -0.4) + ring(0.55, 2.7), 5, 0.8))
  k.add(k.orb(cx, cy, 40, 320, 60))
  // The components.
  const comp = (x: number, y: number) =>
    k.slab(x - 50, y - 20, 100, 60, 8, {
      face: ['#2b303b', '#11141a'],
      side: '#05060a',
      depth: 6,
    }) +
    k.rect(x - 40, y - 10, 30, 30, 5, hsl(330, 90, 62)) +
    k.bars(x - 2, y - 6, 42, 3, {
      colors: ['rgba(255,255,255,.55)'],
      height: 4,
      lead: 10,
    })
  k.standing(
    comps
      .map(
        ([x, y]) => `<g transform="translate(0 ${264 - y})">${comp(x, y)}</g>`,
      )
      .join(''),
    cx,
    220,
  )
  k.add(k.sparkles(4, [360, 30, 160, 50]))
  return k.vignette().toString()
})
