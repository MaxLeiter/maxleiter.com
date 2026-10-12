import { art, FLOOR, hsl, Kit } from '../kit'

/** Every post: a bookshelf of glossy spines in every channel colour, one
 *  book pulled out and leaning, a little lamp lighting the shelf. */
export default art(['index:blog'], () => {
  const k = new Kit({ hue: 330, hue2: 260, spot: [430, 130] })
  k.stage()
  const x = 280
  const w = 320
  const shelf = (y: number) =>
    k.slab(x, y, w, 12, 3, {
      face: [hsl(28, 50, 50), hsl(25, 50, 30)],
      side: hsl(25, 50, 16),
      depth: 5,
    })
  const R = k.rand
  const books = (y: number) => {
    let out = ''
    let at = x + 10
    while (at < x + w - 30) {
      const bw = 14 + R() * 12
      const bh = 60 + R() * 30
      const hue = R() * 360
      out +=
        k.rect(
          at,
          y - bh,
          bw,
          bh,
          2,
          k.lin(at, 0, at + bw, 0, [
            [0, hsl(hue, 70, 34)],
            [0.4, hsl(hue, 80, 58)],
            [1, hsl(hue, 70, 30)],
          ]),
        ) +
        k.rect(at + 3, y - bh + 10, bw - 6, 4, 1, 'rgba(255,255,255,.6)') +
        k.rect(at + 3, y - 18, bw - 6, 3, 1, 'rgba(255,255,255,.4)')
      at += bw + 2
    }
    return out
  }
  const unit =
    k.rect(x - 12, 40, 12, FLOOR - 40, 2, hsl(25, 50, 24)) +
    k.rect(x + w, 40, 12, FLOOR - 40, 2, hsl(25, 50, 24)) +
    books(150) +
    shelf(150) +
    books(FLOOR - 12) +
    shelf(FLOOR - 12)
  k.standing(unit, x + w / 2, 180, 0.25)
  // The leaning book.
  k.add(
    `<g transform="rotate(-18 ${x + w - 60} ${FLOOR - 12})">${k.slab(x + w - 70, FLOOR - 120, 24, 108, 3, { face: [hsl(45, 95, 66), hsl(35, 85, 42)], depth: 4 })}</g>`,
  )
  // Lamp.
  k.add(
    k.line(
      [
        [x + w - 30, 150],
        [x + w - 30, 80],
        [x + w - 70, 56],
      ],
      '#9aa3ae',
      4,
    ),
    k.path(`M${x + w - 96} 70l26-28 26 22z`, hsl(45, 90, 55)),
    k.poly(
      [
        [x + w - 90, 72],
        [x + w - 46, 66],
        [x + w + 10, 150],
        [x + w - 170, 150],
      ],
      hsl(50, 100, 80, 0.12),
      `filter="${k.blur(4)}"`,
    ),
  )
  k.add(k.sparkles(4, [300, 20, 200, 30]))
  return k.vignette().toString()
})
