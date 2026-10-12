import { art, hsl, Kit } from '../kit'

/** v0, which turns a prompt into a working app: a chat prompt bar at the
 *  front, and rising out of it in a burst of sparkles, a generated
 *  interface assembling itself block by block. */
export default art(['project:v0'], () => {
  const k = new Kit({ hue: 230, hue2: 270, spot: [430, 120] })
  k.stage()
  // The generated UI, floating.
  const ux = 330
  const uy = 40
  const ui = k.window(ux, uy, 220, 150, {
    bar: '#e9edf3',
    body: '#f7f9fc',
    content:
      k.rect(ux + 12, uy + 26, 60, 112, 5, '#e8ecf2') +
      [0, 1, 2, 3]
        .map((i) =>
          k.rect(
            ux + 20,
            uy + 36 + i * 16,
            44,
            6,
            3,
            i === 0 ? hsl(230, 80, 60) : 'rgba(20,24,36,.3)',
          ),
        )
        .join('') +
      k.rect(
        ux + 82,
        uy + 26,
        126,
        44,
        6,
        k.lin(ux + 82, uy + 26, ux + 208, uy + 70, [
          [0, hsl(260, 80, 66)],
          [1, hsl(200, 85, 60)],
        ]),
      ) +
      k.rect(
        ux + 82,
        uy + 78,
        60,
        40,
        6,
        '#ffffff',
        'stroke="#dde2ea" stroke-width="1.5"',
      ) +
      k.rect(
        ux + 148,
        uy + 78,
        60,
        40,
        6,
        '#ffffff',
        'stroke="#dde2ea" stroke-width="1.5"',
      ) +
      k.rect(ux + 90, uy + 88, 30, 5, 2.5, 'rgba(20,24,36,.4)') +
      k.rect(ux + 156, uy + 88, 30, 5, 2.5, 'rgba(20,24,36,.4)') +
      k.rect(ux + 156, uy + 124, 52, 14, 7, '#111827'),
  })
  k.add(ui)
  // Blocks still flying into place.
  k.add(
    `<g transform="rotate(12 586 120)">${k.slab(566, 104, 44, 30, 6, { face: [hsl(200, 85, 66), hsl(210, 80, 46)], depth: 4 })}</g>`,
    `<g transform="rotate(-14 296 150)">${k.slab(276, 136, 40, 26, 6, { face: ['#ffffff', '#d8dde6'], depth: 4 })}</g>`,
  )
  // The prompt bar.
  const px = 300
  const py = 236
  const prompt =
    k.slab(px, py, 260, 56, 18, {
      face: ['#20242e', '#0d0f14'],
      side: '#040507',
      depth: 7,
    }) +
    k.rect(px + 18, py + 20, 120, 7, 3.5, 'rgba(255,255,255,.55)') +
    k.rect(px + 142, py + 16, 3, 16, 1.5, hsl(230, 100, 80)) +
    k.orb(px + 230, py + 28, 14, 230, 62) +
    k.poly(
      [
        [px + 225, py + 31],
        [px + 230, py + 22],
        [px + 235, py + 31],
      ],
      '#fff',
    )
  k.standing(prompt, px + 130, 150)
  k.add(
    k.poly(
      [
        [px + 60, py],
        [px + 200, py],
        [ux + 220, uy + 150],
        [ux, uy + 150],
      ],
      hsl(230, 100, 80, 0.1),
      `filter="${k.blur(4)}"`,
    ),
  )
  k.add(k.sparkles(7, [ux - 20, uy + 140, 260, 50]))
  return k.vignette().toString()
})
