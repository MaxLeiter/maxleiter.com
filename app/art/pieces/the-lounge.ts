import { art, hsl, Kit } from '../kit'

/** The Lounge, a self-hosted web IRC client: a plush sofa in a dim lounge,
 *  a neon channel sign buzzing on the wall above it, and chat bubbles
 *  drifting up from the cushions. */
export default art(['project:the-lounge'], () => {
  const k = new Kit({ hue: 220, hue2: 270, spot: [430, 130], bloom: 0.8 })
  k.stage()
  // The neon sign: a hash.
  const nx = 430
  const ny = 80
  const neon = hsl(320, 100, 70)
  const sign =
    k.line(
      [
        [nx - 14, ny - 40],
        [nx - 24, ny + 40],
      ],
      neon,
      7,
    ) +
    k.line(
      [
        [nx + 22, ny - 40],
        [nx + 12, ny + 40],
      ],
      neon,
      7,
    ) +
    k.line(
      [
        [nx - 40, ny - 14],
        [nx + 44, ny - 14],
      ],
      neon,
      7,
    ) +
    k.line(
      [
        [nx - 46, ny + 14],
        [nx + 38, ny + 14],
      ],
      neon,
      7,
    )
  k.add(
    k.rect(
      nx - 70,
      ny - 58,
      140,
      116,
      14,
      'rgba(10,8,20,.55)',
      'stroke="rgba(255,255,255,.15)" stroke-width="2"',
    ),
  )
  k.add(
    `<g filter="${k.blur(10)}" opacity=".9">${sign}</g>`,
    `<g filter="${k.blur(3)}">${sign}</g>`,
    sign
      .replaceAll(neon, hsl(320, 100, 92))
      .replaceAll('stroke-width="7"', 'stroke-width="2.5"'),
  )
  // The sofa.
  const sx = 300
  const sy = 196
  const plush = (l: number) => hsl(20, 70, l)
  const sofa =
    k.rect(sx + 10, sy + 90, 14, 18, 3, '#2a1a12') +
    k.rect(sx + 236, sy + 90, 14, 18, 3, '#2a1a12') +
    k.rect(
      sx + 20,
      sy - 6,
      220,
      70,
      20,
      k.lin(0, sy - 6, 0, sy + 64, [
        [0, plush(52)],
        [1, plush(34)],
      ]),
    ) +
    k.rect(
      sx + 30,
      sy + 44,
      98,
      38,
      12,
      k.lin(0, sy + 44, 0, sy + 82, [
        [0, plush(60)],
        [1, plush(40)],
      ]),
    ) +
    k.rect(
      sx + 132,
      sy + 44,
      98,
      38,
      12,
      k.lin(0, sy + 44, 0, sy + 82, [
        [0, plush(60)],
        [1, plush(40)],
      ]),
    ) +
    k.rect(
      sx,
      sy + 26,
      40,
      72,
      16,
      k.lin(sx, 0, sx + 40, 0, [
        [0, plush(36)],
        [1, plush(56)],
      ]),
    ) +
    k.rect(
      sx + 220,
      sy + 26,
      40,
      72,
      16,
      k.lin(sx + 220, 0, sx + 260, 0, [
        [0, plush(56)],
        [1, plush(34)],
      ]),
    ) +
    k.rect(sx + 30, sy + 80, 200, 18, 6, plush(30)) +
    k.gloss(k.rect(sx + 20, sy - 6, 220, 70, 20, '#fff'), sy - 6, 70, 0.22) +
    k.slab(sx + 160, sy + 18, 54, 40, 12, {
      face: [hsl(190, 70, 60), hsl(200, 70, 40)],
      depth: 3,
    })
  k.standing(sofa, sx + 130, 150)
  // Chat bubbles.
  k.add(
    k.bubble(240, 118, 76, 34, ['#ffffff', '#dfe4ec']),
    k.bars(252, 129, 52, 1, { colors: ['rgba(30,40,60,.4)'], height: 5 }),
    k.bubble(540, 140, 66, 30, [hsl(200, 80, 66), hsl(210, 70, 46)], 'right'),
    k.bars(552, 151, 42, 1, { colors: ['rgba(255,255,255,.7)'], height: 5 }),
  )
  k.add(k.sparkles(3, [520, 40, 100, 60]))
  return k.vignette().toString()
})
