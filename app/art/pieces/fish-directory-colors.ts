import { art, hsl, Kit } from '../kit'

/** Per-directory terminal colours in fish: three terminal windows, each
 *  a different project's background colour, and a goldfish swimming from
 *  one into the next, trailing bubbles. */
export default art(['note:fish-directory-colors'], () => {
  const k = new Kit({ hue: 200, hue2: 250, spot: [430, 140] })
  k.stage()
  const term = (x: number, y: number, hue: number, rot: number) =>
    `<g transform="rotate(${rot} ${x + 80} ${y + 55})">${k.window(
      x,
      y,
      160,
      110,
      {
        bar: hsl(hue, 30, 22),
        body: hsl(hue, 55, 16),
        content:
          k.bars(x + 10, y + 26, 110, 4, {
            colors: [hsl(hue, 90, 70), 'rgba(255,255,255,.6)'],
            height: 4,
            lead: 12,
          }) +
          k.rect(x + 10, y + 78, 9, 4, 0, hsl(hue, 90, 70)) +
          k.rect(x + 22, y + 74, 7, 11, 1, hsl(hue, 90, 80)),
      },
    )}</g>`
  k.standing(term(250, 170, 330, -6) + term(440, 176, 150, 5), 420, 200, 0.25)
  k.add(term(350, 46, 210, -2))
  // The goldfish.
  const fx = 420
  const fy = 170
  const body = `M${fx - 52} ${fy}q24-34 70-24q22 6 30 24q-8 18-30 24q-46 10-70-24z`
  k.add(
    k.path(
      `M${fx + 44} ${fy}l34-26q-8 26 0 52z`,
      k.lin(fx + 44, fy - 26, fx + 78, fy + 26, [
        [0, hsl(30, 100, 66)],
        [1, hsl(10, 90, 46)],
      ]),
    ),
    k.path(`M${fx - 10} ${fy - 22}q14-22 36-10q-16 4-22 14z`, hsl(25, 95, 55)),
    k.path(
      body,
      k.rad(fx - 20, fy - 12, 80, [
        [0, hsl(42, 100, 72)],
        [0.55, hsl(28, 100, 56)],
        [1, hsl(12, 90, 40)],
      ]),
    ),
    k.gloss(k.path(body, '#fff'), fy - 24, 48, 0.4),
    k.path(`M${fx - 6} ${fy + 8}q10 14 22 6q-12-2-22-6z`, hsl(20, 95, 50)),
    k.circle(fx - 30, fy - 4, 7, '#fff'),
    k.circle(fx - 32, fy - 4, 4, '#111'),
    k.path(
      `M${fx - 48} ${fy + 4}q4 4 8 2`,
      'none',
      'stroke="#7a2a10" stroke-width="2" stroke-linecap="round"',
    ),
  )
  k.add(
    ...[
      [fx - 70, fy - 20, 6],
      [fx - 84, fy - 44, 4.5],
      [fx - 76, fy - 66, 3.5],
    ].map(([x, y, r]) =>
      k.circle(
        x,
        y,
        r,
        'rgba(255,255,255,.12)',
        'stroke="rgba(255,255,255,.7)" stroke-width="1.5"',
      ),
    ),
  )
  k.add(k.sparkles(4, [500, 30, 120, 60]))
  return k.vignette().toString()
})
