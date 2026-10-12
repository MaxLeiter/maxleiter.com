import { art, hsl, Kit } from '../kit'

/** AI SDK 3.0's generative UI: a chat bubble that answers not with text
 *  but with live components popping out of it -- a weather card, a stock
 *  chart, a confirm button -- each a little glossy toy. */
export default art(
  ['work:https://vercel.com/blog/ai-sdk-3-generative-ui'],
  () => {
    const k = new Kit({ hue: 190, hue2: 240, spot: [430, 140] })
    k.stage()
    const bx = 300
    const by = 196
    k.standing(
      `<g transform="translate(0 0)">${k.bubble(bx, by, 220, 74, ['#ffffff', '#dfe4ec'])}${k.bars(bx + 18, by + 18, 180, 3, { colors: ['rgba(30,40,60,.35)'], height: 5, lead: 14 })}</g>`,
      bx + 110,
      130,
      0.25,
    )
    // Weather card.
    k.add(
      `<g transform="rotate(-8 330 110)">${k.slab(280, 70, 100, 80, 12, { face: [hsl(205, 90, 64), hsl(215, 80, 44)], depth: 5 })}${k.orb(310, 100, 16, 45, 64)}${['M322 120h40a12 12 0 0 0 0-24a16 16 0 0 0-30 4a10 10 0 0 0-10 20z'].map((d) => k.path(d, '#fff')).join('')}${k.rect(292, 132, 40, 6, 3, 'rgba(255,255,255,.8)')}</g>`,
    )
    // Chart card.
    const pts: [number, number][] = [
      [418, 120],
      [438, 104],
      [456, 112],
      [476, 86],
      [496, 92],
      [514, 70],
    ]
    k.add(
      k.slab(406, 50, 122, 90, 12, {
        face: ['#1f2530', '#0c0f14'],
        side: '#040507',
        depth: 6,
      }),
      k.glow(k.line(pts, hsl(140, 100, 62), 3.5), 4, 0.9),
      k.rect(418, 60, 40, 6, 3, 'rgba(255,255,255,.5)'),
    )
    // Button.
    k.add(
      `<g transform="rotate(10 580 160)">${k.slab(540, 140, 84, 34, 17, { face: [hsl(330, 90, 66), hsl(320, 80, 46)], depth: 5 })}${k.rect(560, 154, 44, 6, 3, 'rgba(255,255,255,.85)')}</g>`,
    )
    // Pop lines.
    k.add(
      ...[
        [380, 180, 360, 160],
        [460, 176, 466, 152],
        [520, 186, 546, 172],
      ].map(([a, b, c, d]) =>
        k.line(
          [
            [a, b],
            [c, d],
          ],
          hsl(50, 100, 75),
          3,
        ),
      ),
    )
    k.add(k.sparkles(5, [300, 20, 300, 40]))
    return k.vignette().toString()
  },
)
