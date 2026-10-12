import { art, hsl, Kit } from '../kit'

/** Introducing the AI SDK, streaming text in a few lines: a glossy tap
 *  pouring a ribbon of tokens into a chat window, each word arriving as
 *  the one before it lands. */
export default art(
  ['work:https://vercel.com/blog/introducing-the-vercel-ai-sdk'],
  () => {
    const k = new Kit({ hue: 175, hue2: 220, spot: [430, 130] })
    k.stage()
    // The tap.
    const metal = k.lin(0, 40, 0, 110, [
      [0, '#f2f5f8'],
      [0.4, '#aab3be'],
      [1, '#5a626e'],
    ])
    k.add(
      k.rect(260, 54, 150, 30, 15, metal),
      k.rect(380, 54, 30, 76, 12, metal),
      k.rect(300, 34, 14, 22, 4, '#7a838f'),
      k.rect(282, 26, 50, 12, 6, hsl(0, 80, 55)),
      k.gloss(k.rect(260, 54, 150, 30, 15, '#fff'), 54, 30, 0.5),
    )
    // The stream of tokens falling.
    const R = k.rand
    for (let i = 0; i < 8; i++) {
      const y = 136 + i * 13
      k.add(
        k.rect(
          386 + (R() - 0.5) * 10,
          y,
          18 + R() * 10,
          7,
          3.5,
          hsl(175 + i * 6, 90, 70, 0.95 - i * 0.05),
        ),
      )
    }
    k.add(
      k.rect(
        392,
        130,
        10,
        110,
        5,
        hsl(175, 100, 70, 0.3),
        `filter="${k.blur(5)}"`,
      ),
    )
    // The chat window catching it.
    const wx = 300
    const wy = 230
    const chat =
      k.slab(wx, wy, 250, 70, 14, {
        face: ['#20252f', '#0c0f14'],
        side: '#040507',
        depth: 7,
      }) +
      k.bars(wx + 16, wy + 16, 210, 3, {
        colors: [hsl(175, 90, 70), 'rgba(255,255,255,.65)'],
        height: 6,
        lead: 15,
      }) +
      k.rect(wx + 160, wy + 46, 4, 12, 2, hsl(175, 100, 80))
    k.standing(chat, wx + 125, 140)
    k.add(k.sparkles(4, [440, 40, 160, 80]))
    return k.vignette().toString()
  },
)
