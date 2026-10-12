import { art, hsl, Kit } from '../kit'

/** New edge dev infrastructure: a globe threaded with glowing routes
 *  between edge regions, and a laptop in front sending its first request
 *  up to the nearest one. */
export default art(
  ['work:https://vercel.com/blog/new-edge-dev-infrastructure'],
  () => {
    const k = new Kit({ hue: 210, hue2: 250, spot: [440, 130] })
    k.stage()
    const gx = 450
    const gy = 120
    const R = 96
    k.add(
      k.circle(
        gx,
        gy,
        R + 20,
        hsl(200, 100, 60, 0.25),
        `filter="${k.blur(16)}"`,
      ),
      k.circle(
        gx,
        gy,
        R,
        k.rad(gx - 30, gy - 40, R * 1.4, [
          [0, hsl(205, 70, 46)],
          [0.7, hsl(220, 70, 22)],
          [1, hsl(230, 60, 12)],
        ]),
      ),
      ...[-0.6, 0, 0.6].map((t) =>
        k.ellipse(
          gx,
          gy + t * R * 0.8,
          R * Math.sqrt(1 - t * t * 0.64),
          R * 0.18,
          'none',
          'stroke="rgba(255,255,255,.2)" stroke-width="1.5"',
        ),
      ),
      ...[0.35, 0.7].map((s) =>
        k.ellipse(
          gx,
          gy,
          R * s,
          R,
          'none',
          'stroke="rgba(255,255,255,.2)" stroke-width="1.5"',
        ),
      ),
    )
    const nodes: [number, number][] = [
      [gx - 54, gy - 40],
      [gx + 20, gy - 62],
      [gx + 62, gy - 6],
      [gx - 20, gy + 30],
      [gx + 40, gy + 56],
    ]
    const arcs = [
      [0, 1],
      [1, 2],
      [2, 4],
      [3, 0],
      [3, 2],
      [3, 4],
    ]
    k.add(
      ...arcs.map(([a, b]) => {
        const [x0, y0] = nodes[a]
        const [x1, y1] = nodes[b]
        return k.glow(
          k.curve(
            [
              [x0, y0],
              [(x0 + x1) / 2, (y0 + y1) / 2 - 22],
              [x1, y1],
            ],
            hsl(190, 100, 70),
            2.5,
          ),
          3,
          0.9,
        )
      }),
    )
    k.add(
      ...nodes.map(([x, y]) =>
        k.glow(k.circle(x, y, 5, hsl(50, 100, 72)), 4, 1),
      ),
    )
    k.add(
      k.ellipse(
        gx - 30,
        gy - 50,
        40,
        18,
        'rgba(255,255,255,.2)',
        `filter="${k.blur(6)}"`,
      ),
    )
    // The laptop.
    const lx = 300
    const ly = 214
    const laptop =
      k.slab(lx, ly, 150, 88, 8, {
        face: ['#3a404c', '#161a20'],
        side: '#06070a',
        depth: 4,
      }) +
      k.screen(
        lx + 8,
        ly + 8,
        134,
        74,
        4,
        k.bars(lx + 18, ly + 20, 110, 4, {
          colors: [hsl(140, 80, 60), 'rgba(255,255,255,.6)'],
          height: 4,
          lead: 12,
        }),
      ) +
      k.path(`M${lx - 18} ${ly + 96}h186l-10 8h-166z`, '#7c8592') +
      k.rect(lx - 18, ly + 90, 186, 8, 3, '#c3cad3')
    k.standing(`<g transform="translate(0 -8)">${laptop}</g>`, lx + 75, 110)
    k.add(
      k.glow(
        k.curve(
          [[lx + 140, ly - 4], [lx + 120, gy + 70], nodes[3]],
          hsl(50, 100, 72, 0.9),
          2.5,
          'stroke-dasharray="3 6"',
        ),
        3,
        0.8,
      ),
    )
    k.add(k.sparkles(3, [560, 20, 60, 60]))
    return k.vignette().toString()
  },
)
