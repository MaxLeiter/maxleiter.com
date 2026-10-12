import { art, hsl, Kit } from '../kit'

/** Improving a site's accessibility: an oversized Tab key being pressed,
 *  and the bright focus ring it sends hopping along a row of buttons to the
 *  one that matters. */
export default art(
  [
    'work:https://vercel.com/blog/improving-the-accessibility-of-our-nextjs-site',
  ],
  () => {
    const k = new Kit({ hue: 220, hue2: 260, spot: [430, 130] })
    k.stage()
    // Buttons.
    const bx = 300
    const by = 80
    for (let i = 0; i < 3; i++) {
      k.add(
        k.slab(bx + i * 96, by, 80, 36, 18, {
          face:
            i === 2
              ? [hsl(220, 90, 64), hsl(225, 80, 46)]
              : ['#ffffff', '#d8dee6'],
          depth: 5,
        }),
        k.rect(
          bx + 20 + i * 96,
          by + 15,
          40,
          6,
          3,
          i === 2 ? 'rgba(255,255,255,.85)' : 'rgba(20,24,36,.35)',
        ),
      )
    }
    k.add(
      k.glow(
        k.rect(
          bx + 186,
          by - 6,
          92,
          50,
          24,
          'none',
          `stroke="${hsl(45, 100, 62)}" stroke-width="4"`,
        ),
        6,
        1,
      ),
    )
    // Hops.
    k.add(
      k.curve(
        [
          [bx + 40, by + 52],
          [bx + 88, by + 80],
          [bx + 136, by + 52],
        ],
        hsl(45, 100, 70, 0.6),
        2.5,
        'stroke-dasharray="2 6"',
      ),
      k.curve(
        [
          [bx + 136, by + 52],
          [bx + 184, by + 80],
          [bx + 232, by + 52],
        ],
        hsl(45, 100, 70, 0.8),
        2.5,
        'stroke-dasharray="2 6"',
      ),
    )
    // The tab key.
    const kx = 330
    const ky = 196
    const key =
      k.rect(kx, ky + 14, 200, 92, 18, '#1c2028') +
      k.slab(kx + 8, ky, 184, 82, 16, {
        face: ['#f4f6f9', '#b9c1cc'],
        side: '#59616d',
        depth: 14,
      }) +
      k.line(
        [
          [kx + 40, ky + 30],
          [kx + 120, ky + 30],
        ],
        '#2a2f38',
        6,
      ) +
      k.poly(
        [
          [kx + 120, ky + 18],
          [kx + 138, ky + 30],
          [kx + 120, ky + 42],
        ],
        '#2a2f38',
      ) +
      k.line(
        [
          [kx + 142, ky + 16],
          [kx + 142, ky + 44],
        ],
        '#2a2f38',
        6,
      ) +
      k.line(
        [
          [kx + 160, ky + 60],
          [kx + 60, ky + 60],
        ],
        'rgba(42,47,56,.4)',
        5,
      )
    k.standing(
      `<g transform="translate(0 ${304 - ky - 106})">${key}</g>`,
      kx + 100,
      120,
    )
    k.add(k.sparkles(4, [bx + 200, 30, 100, 40]))
    return k.vignette().toString()
  },
)
