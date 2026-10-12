import { art, hsl, Kit } from '../kit'

/** Labs, experiments and playthings: a rack of glossy flasks bubbling in
 *  different colours, one round flask on a burner sending up a puff. */
export default art(['index:labs'], () => {
  const k = new Kit({ hue: 170, hue2: 260, spot: [430, 130] })
  k.stage()
  const glass = 'rgba(220,240,255,.18)'
  const rim = 'stroke="rgba(255,255,255,.75)" stroke-width="2"'
  const conical = (x: number, hue: number) =>
    k.path(
      `M${x - 12} 180v40l-36 70q-4 10 8 10h80q12 0 8-10l-36-70v-40z`,
      glass,
      rim,
    ) +
    k.path(
      `M${x - 30} 252l-18 38q-4 10 8 10h80q12 0 8-10l-18-38z`,
      k.lin(0, 252, 0, 300, [
        [0, hsl(hue, 90, 64)],
        [1, hsl(hue, 80, 40)],
      ]),
    ) +
    k.rect(x - 16, 174, 32, 8, 3, 'rgba(255,255,255,.6)') +
    k.orb(x - 8, 268, 4, hue, 70) +
    k.orb(x + 10, 278, 3, hue, 70)
  const tube = (x: number, hue: number, fill: number) =>
    k.path(`M${x - 10} 196v90a10 10 0 0 0 20 0v-90z`, glass, rim) +
    k.path(
      `M${x - 9} ${296 - fill}v${fill - 10}a9 9 0 0 0 18 0v${-(fill - 10)}z`,
      hsl(hue, 90, 58),
    )
  const round =
    k.circle(500, 232, 46, glass, rim) +
    k.path(
      'M456 244a46 46 0 0 0 88 0z',
      k.lin(0, 240, 0, 278, [
        [0, hsl(300, 90, 66)],
        [1, hsl(290, 80, 40)],
      ]),
    ) +
    k.rect(488, 140, 24, 50, 4, glass, rim) +
    k.rect(476, 278, 48, 26, 4, '#3a404b') +
    k.glow(k.path('M492 278q8-14 16 0z', hsl(30, 100, 60)), 4, 1)
  k.standing(
    conical(340, 140) + tube(400, 200, 60) + tube(424, 45, 40) + round,
    430,
    160,
  )
  k.add(
    ...[0, 1, 2].map((i) =>
      k.circle(
        500 + (i - 1) * 12,
        124 - i * 18,
        10 + i * 4,
        `rgba(255,220,255,${0.4 - i * 0.1})`,
        `filter="${k.blur(3)}"`,
      ),
    ),
  )
  k.add(k.orb(336, 150, 7, 140, 64), k.orb(348, 126, 5, 140, 64))
  k.add(k.sparkles(5, [300, 30, 280, 70]))
  return k.vignette().toString()
})
