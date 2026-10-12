import { art, hsl, Kit } from '../kit'

/** "thank u, next": a pink-sealed break-up letter sails off, and in its place
 *  a hand-built stack of plain static pages, glowing. */
export default art(['blog:thank-u-next'], () => {
  const k = new Kit({ hue: 330, hue2: 280, spot: [420, 150] })
  k.stage()
  // The static pages the build writes: a fanned stack on the floor.
  let pages = ''
  for (let i = 0; i < 5; i++) {
    const x = 330 + i * 18
    const y = 150 + i * 14
    pages += k.slab(x, y, 120, 150 - i * 8, 8, {
      face: ['#ffffff', hsl(320, 60, 88)],
      side: hsl(320, 40, 40),
      depth: 4,
      rim: 'rgba(255,255,255,.9)',
    })
    pages += k.rect(x + 12, y + 14, 50, 7, 3.5, hsl(330, 80, 60))
    pages += k.bars(x + 12, y + 30, 96, 5, {
      colors: [hsl(280, 30, 70)],
      height: 4,
      lead: 10,
    })
  }
  k.standing(pages, 450, 110)
  // The letter, mid-flight, with a heart seal.
  const lx = 250
  const ly = 92
  const letter = `<g transform="rotate(-14 ${lx + 60} ${ly + 40})">${k.slab(
    lx,
    ly,
    120,
    78,
    6,
    {
      face: [hsl(330, 90, 82), hsl(330, 70, 62)],
      side: hsl(330, 60, 35),
      depth: 5,
    },
  )}${k.poly(
    [
      [lx, ly],
      [lx + 60, ly + 44],
      [lx + 120, ly],
    ],
    hsl(330, 80, 70),
    'stroke="rgba(255,255,255,.6)" stroke-width="1.5"',
  )}${k.path(
    `M${lx + 60} ${ly + 58}c-14-10-22-18-22-27c0-6 5-10 11-10c5 0 9 3 11 7c2-4 6-7 11-7c6 0 11 4 11 10c0 9-8 17-22 27z`,
    hsl(350, 95, 55),
    `stroke="${hsl(350, 100, 85)}" stroke-width="1.5"`,
  )}</g>`
  k.add(
    k.curve(
      [
        [60, 230],
        [140, 200],
        [200, 170],
        [255, 140],
      ],
      'rgba(255,200,230,.25)',
      18,
      `filter="${k.blur(6)}"`,
    ),
    k.glow(letter, 10, 0.5),
  )
  for (let i = 0; i < 6; i++) {
    const x = 200 + k.rand() * 360
    const y = 40 + k.rand() * 120
    const s = 6 + k.rand() * 8
    k.add(
      k.path(
        `M${x} ${y + s}c-${s} -${s * 0.7}-${s * 1.4}-${s * 1.2}-${s * 1.4}-${s * 1.8}c0-${s * 0.5} ${s * 0.4}-${s * 0.8} ${s * 0.8}-${s * 0.8}c${s * 0.3} 0 ${s * 0.5} ${s * 0.2} ${s * 0.6} ${s * 0.45}c${s * 0.1}-${s * 0.25} ${s * 0.3}-${s * 0.45} ${s * 0.6}-${s * 0.45}c${s * 0.4} 0 ${s * 0.8} ${s * 0.3} ${s * 0.8} ${s * 0.8}c0 ${s * 0.6}-${s * 0.7} ${s * 1.1}-${s * 1.4} ${s * 1.8}z`,
        hsl(340, 100, 75, 0.5 + k.rand() * 0.4),
      ),
    )
  }
  k.add(k.sparkles(5, [300, 60, 280, 120]))
  return k.vignette().toString()
})
