import { art, hsl, Kit } from '../kit'

/** The v0 composite model family: three glass slabs stacked into one
 *  model -- retrieval, the base model, a quick fix-up pass -- and a beam of
 *  light passing down through all of them, changing colour at each layer. */
export default art(
  ['work:https://vercel.com/blog/v0-composite-model-family'],
  () => {
    const k = new Kit({ hue: 260, hue2: 220, spot: [430, 120] })
    k.stage()
    const cx = 430
    const layer = (y: number, hue: number, w: number) => {
      const top = [
        [cx - w, y],
        [cx, y - w * 0.36],
        [cx + w, y],
        [cx, y + w * 0.36],
      ] as [number, number][]
      const d = 24
      return (
        k.poly(
          [
            [cx - w, y],
            [cx, y + w * 0.36],
            [cx, y + w * 0.36 + d],
            [cx - w, y + d],
          ],
          hsl(hue, 70, 34, 0.9),
        ) +
        k.poly(
          [
            [cx + w, y],
            [cx, y + w * 0.36],
            [cx, y + w * 0.36 + d],
            [cx + w, y + d],
          ],
          hsl(hue, 70, 24, 0.9),
        ) +
        k.poly(
          top,
          k.lin(cx - w, y - w * 0.36, cx + w, y + w * 0.36, [
            [0, hsl(hue, 90, 74, 0.92)],
            [1, hsl(hue, 85, 52, 0.92)],
          ]),
          'stroke="rgba(255,255,255,.65)" stroke-width="1.5"',
        )
      )
    }
    // The beam, behind and through.
    k.add(
      k.rect(
        cx - 9,
        0,
        18,
        290,
        9,
        'rgba(255,255,255,.18)',
        `filter="${k.blur(6)}"`,
      ),
    )
    const stack =
      layer(250, 200, 120) +
      k.rect(cx - 5, 190, 10, 60, 5, hsl(200, 100, 80, 0.85)) +
      layer(190, 265, 104) +
      k.rect(cx - 5, 132, 10, 58, 5, hsl(265, 100, 84, 0.85)) +
      layer(132, 320, 88) +
      k.rect(cx - 5, 30, 10, 102, 5, hsl(320, 100, 88, 0.85))
    k.standing(stack, cx, 150, 0.25)
    k.add(
      k.circle(cx, 30, 18, '#fff', `filter="${k.blur(8)}"`),
      k.sparkle(cx, 30, 14),
    )
    k.add(k.sparkles(4, [300, 40, 260, 60]))
    return k.vignette().toString()
  },
)
