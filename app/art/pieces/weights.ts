import { art, hsl, Kit } from '../kit'

/** "They're made out of weights": a flying saucer's beam lays bare a
 *  thinking machine that is nothing but stacked matrices of numbers. */
export default art(['blog:weights'], () => {
  const k = new Kit({ hue: 8, hue2: 290, spot: [420, 210], bloom: 0.9 })
  k.stage()
  // The beam.
  k.add(
    k.poly(
      [
        [392, 92],
        [448, 92],
        [540, 300],
        [300, 300],
      ],
      k.lin(0, 92, 0, 300, [
        [0, 'rgba(180,255,230,.55)'],
        [1, 'rgba(120,255,200,.05)'],
      ]),
      `filter="${k.blur(3)}"`,
    ),
  )
  // Layers of weights, each a slab of coloured cells, fanned in depth.
  let stack = ''
  for (let l = 0; l < 4; l++) {
    const x = 330 + l * 26
    const y = 168 + l * 22
    const w = 132
    const h = 92
    stack += k.slab(x, y, w, h, 8, {
      face: [hsl(330 - l * 18, 60, 22, 0.92), hsl(280 - l * 18, 60, 10, 0.92)],
      depth: 5,
      rim: hsl(160, 100, 80, 0.6),
    })
    for (let j = 0; j < 5; j++) {
      for (let i = 0; i < 8; i++) {
        const v = k.rand()
        stack += k.rect(
          x + 9 + i * 15,
          y + 10 + j * 15.5,
          11,
          11,
          2,
          hsl(
            v > 0.5 ? 12 + v * 30 : 190 + v * 60,
            95,
            35 + v * 35,
            0.55 + v * 0.45,
          ),
        )
      }
    }
  }
  k.add(stack)
  // The saucer.
  const saucer =
    k.ellipse(
      420,
      86,
      96,
      22,
      k.lin(330, 70, 330, 108, [
        [0, '#d9e3ee'],
        [0.5, '#7d8a9a'],
        [1, '#2a313c'],
      ]),
    ) +
    k.ellipse(
      420,
      70,
      46,
      30,
      k.rad(405, 55, 50, [
        [0, 'rgba(220,255,245,.95)'],
        [0.6, 'rgba(90,220,190,.6)'],
        [1, 'rgba(20,80,90,.6)'],
      ]),
    ) +
    [0, 1, 2, 3, 4, 5, 6]
      .map((i) =>
        k.circle(
          344 + i * 25.5,
          90 + Math.sin((i / 6) * Math.PI) * 6,
          3.5,
          hsl(150 + i * 25, 100, 70),
        ),
      )
      .join('')
  k.add(k.glow(saucer, 6, 0.5))
  k.add(k.sparkles(6, [300, 140, 260, 150]))
  return k.vignette().toString()
})
