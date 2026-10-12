import { art, hsl, Kit } from '../kit'

/** gemini.sh concatenates a whole repo for a long-context model: files of
 *  every colour pouring into a funnel and coming out the bottom as one very
 *  long scroll, unrolling across the floor toward a pair of twin stars. */
export default art(['note:gemini-script'], () => {
  const k = new Kit({ hue: 235, hue2: 270, spot: [420, 130] })
  k.stage()
  const R = k.rand
  // Files falling in.
  for (let i = 0; i < 9; i++) {
    const x = 300 + R() * 210
    const y = 16 + R() * 70
    k.add(
      `<g transform="rotate(${(R() - 0.5) * 50} ${x + 18} ${y + 22})">${k.sheet(x, y, 36, 44, 3)}${k.rect(x, y, 36, 6, 1, hsl(R() * 360, 80, 60))}</g>`,
    )
  }
  // The funnel.
  const fx = 420
  const funnel =
    k.path(
      `M${fx - 110} 112h220l-80 72v26h-60v-26z`,
      k.lin(fx - 110, 0, fx + 110, 0, [
        [0, '#6b7383'],
        [0.35, '#e7ebf0'],
        [0.6, '#aab2be'],
        [1, '#4c5360'],
      ]),
    ) +
    k.ellipse(fx, 112, 110, 16, '#2a2e36') +
    k.ellipse(fx, 112, 110, 16, 'none', 'stroke="#f2f4f7" stroke-width="3"')
  k.add(funnel)
  // The scroll unrolling to the right.
  const scroll =
    k.path(
      `M${fx - 30} 210v60q0 20 20 20h170v-28h-130q-20 0-20-20v-32z`,
      k.lin(0, 210, 0, 290, [
        [0, '#fdfaf0'],
        [1, '#e5dcc2'],
      ]),
    ) +
    k.bars(fx + 30, 270, 140, 1, {
      colors: ['rgba(80,60,30,.45)'],
      height: 4,
    }) +
    k.bars(fx - 20, 222, 20, 3, {
      colors: ['rgba(80,60,30,.45)'],
      height: 4,
      lead: 12,
    }) +
    k.cylinder(fx + 186, 262, 10, 28, 40, 70)
  k.standing(scroll, fx + 80, 170)
  // Twin stars.
  k.add(
    k.sparkle(560, 140, 16, hsl(50, 100, 85)),
    k.sparkle(590, 112, 12, hsl(200, 100, 88)),
  )
  k.add(k.sparkles(3, [300, 120, 80, 60]))
  return k.vignette().toString()
})
