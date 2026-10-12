import { art, hsl, Kit } from '../kit'

/** Notion-style URLs, /some-title-here-{id}: a glossy address bar, the
 *  title's words as chunky segments joined by dashes, and a cheerful garden
 *  slug inching along the top of it, leaving a shining trail. */
export default art(['blog:sluggified-urls'], () => {
  const k = new Kit({ hue: 95, hue2: 160, spot: [420, 150] })
  k.stage()
  // The address bar.
  const bx = 230
  const by = 180
  const bw = 370
  const bh = 64
  k.add(
    k.slab(bx, by, bw, bh, 32, {
      face: ['#ffffff', '#cdd6df'],
      side: '#4b5560',
      depth: 9,
    }),
  )
  k.add(
    k.circle(bx + 34, by + 32, 13, 'none', 'stroke="#7b8794" stroke-width="4"'),
    k.line(
      [
        [bx + 43, by + 41],
        [bx + 52, by + 50],
      ],
      '#7b8794',
      4,
    ),
  )
  const words = [48, 66, 42, 54]
  let at = bx + 70
  words.forEach((len, i) => {
    k.add(k.rect(at, by + 25, len, 14, 7, hsl(205 + i * 18, 70, 52)))
    at += len
    k.add(k.rect(at + 4, by + 30, 10, 4, 2, '#9aa5b1'))
    at += 18
  })
  k.add(k.rect(at, by + 25, 44, 14, 7, hsl(40, 80, 55)))
  // The trail.
  k.add(
    k.glow(
      k.curve(
        [
          [bx + 60, by - 2],
          [bx + 160, by - 3],
          [bx + 230, by - 2],
        ],
        hsl(170, 100, 85, 0.7),
        4,
      ),
      4,
      0.8,
    ),
  )
  // The slug, on top of the bar.
  const sx = bx + 270
  const sy = by - 4
  const body = k.path(
    `M${sx - 72} ${sy}q4-26 40-30q30-4 52 -6q24-2 30 -34q6-20 26-14q20 6 12 34q-10 34-40 50z`,
    k.lin(sx - 70, sy - 70, sx + 50, sy, [
      [0, hsl(70, 85, 66)],
      [0.6, hsl(90, 75, 48)],
      [1, hsl(110, 70, 34)],
    ]),
  )
  const shell =
    k.circle(
      sx - 20,
      sy - 36,
      32,
      k.rad(sx - 30, sy - 48, 40, [
        [0, hsl(30, 90, 72)],
        [0.6, hsl(20, 80, 48)],
        [1, hsl(10, 70, 28)],
      ]),
    ) +
    k.path(
      `M${sx - 20} ${sy - 36}m-4 0a4 4 0 1 1 8 0a10 10 0 1 1 -20 0a16 16 0 1 1 32 0a22 22 0 1 1 -44 0`,
      'none',
      `stroke="${hsl(15, 60, 28)}" stroke-width="3.5" stroke-linecap="round"`,
    ) +
    k.ellipse(
      sx - 32,
      sy - 54,
      12,
      6,
      'rgba(255,255,255,.5)',
      `filter="${k.blur(2)}"`,
    )
  const eyes =
    k.line(
      [
        [sx + 52, sy - 70],
        [sx + 46, sy - 98],
      ],
      hsl(85, 70, 50),
      4,
    ) +
    k.line(
      [
        [sx + 62, sy - 66],
        [sx + 66, sy - 94],
      ],
      hsl(85, 70, 50),
      4,
    ) +
    k.circle(sx + 46, sy - 100, 7, '#fff') +
    k.circle(sx + 48, sy - 100, 3.5, '#111') +
    k.circle(sx + 66, sy - 96, 7, '#fff') +
    k.circle(sx + 68, sy - 96, 3.5, '#111') +
    k.path(
      `M${sx + 54} ${sy - 52}q8 6 14 -2`,
      'none',
      'stroke="#2a3a10" stroke-width="2.5" stroke-linecap="round"',
    )
  k.add(
    k.ellipse(
      sx - 10,
      sy + 2,
      80,
      6,
      'rgba(0,0,0,.35)',
      `filter="${k.blur(3)}"`,
    ),
    body,
    shell,
    eyes,
    k.gloss(body, sy - 70, 70, 0.3),
  )
  k.add(
    k.ellipse(
      bx + bw / 2,
      306,
      170,
      9,
      'rgba(0,0,0,.5)',
      `filter="${k.blur(7)}"`,
    ),
  )
  k.add(k.sparkles(4, [bx + 20, 60, 360, 60]))
  return k.vignette().toString()
})
