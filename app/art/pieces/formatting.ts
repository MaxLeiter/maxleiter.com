import { art, hsl, Kit } from '../kit'

/** Formatting should be unnecessary: the program kept as a tree, as Ada's
 *  DIANA did, and each reader's pretty-printer drawing it their own way --
 *  one panel tight and two-space, the other airy and tabbed. */
export default art(['blog:formatting'], () => {
  const k = new Kit({ hue: 150, hue2: 200, spot: [420, 130] })
  k.stage()
  // The tree, glowing.
  const nodes: [number, number][] = [
    [420, 70],
    [370, 120],
    [470, 120],
    [340, 170],
    [395, 170],
    [445, 170],
    [505, 170],
  ]
  const edges = [
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
    [2, 5],
    [2, 6],
  ]
  k.add(
    ...edges.map(([a, b]) =>
      k.glow(k.line([nodes[a], nodes[b]], hsl(150, 100, 75, 0.9), 3), 4, 0.7),
    ),
  )
  k.add(
    ...nodes.map(([x, y], i) =>
      k.orb(x, y, i === 0 ? 15 : 11, 140 + i * 12, 60),
    ),
  )
  // Two printouts of the same tree.
  const panel = (
    x: number,
    y: number,
    rot: number,
    indent: number[],
    lead: number,
    color: string,
  ) =>
    `<g transform="rotate(${rot} ${x + 80} ${y + 60})">${k.slab(
      x,
      y,
      160,
      118,
      10,
      { face: ['#1f2630', '#0c1016'], side: '#040507', depth: 6 },
    )}${k.bars(x + 14, y + 16, 132, Math.floor(96 / lead), {
      colors: [color, 'rgba(230,237,243,.65)', hsl(200, 90, 70)],
      indent,
      height: 4.5,
      lead,
    })}</g>`
  k.standing(
    panel(250, 186, -7, [0, 1, 1, 2, 2, 1, 0, 1], 11, hsl(150, 80, 62)) +
      panel(440, 192, 6, [0, 2, 4, 4, 2, 0], 16, hsl(40, 90, 64)),
    420,
    210,
  )
  // Arrows from the tree down to each.
  k.add(
    k.curve(
      [
        [350, 186],
        [330, 196],
        [320, 200],
      ],
      hsl(150, 100, 80, 0.6),
      2.5,
      'stroke-dasharray="2 6"',
    ),
    k.curve(
      [
        [495, 186],
        [515, 196],
        [525, 202],
      ],
      hsl(150, 100, 80, 0.6),
      2.5,
      'stroke-dasharray="2 6"',
    ),
  )
  k.add(k.sparkles(4, [300, 30, 260, 60]))
  return k.vignette().toString()
})
