import { art, hsl, Kit } from '../kit'

/** text-size-adjust: a phone showing two identical code blocks, the lower
 *  one's text inflated by the browser, and a magnifier catching it. */
export default art(['blog:mobile-browsers-resizing-font'], () => {
  const k = new Kit({ hue: 280, hue2: 230, spot: [400, 140] })
  k.stage()
  const x = 330
  const y = 36
  const w = 150
  const h = 262
  const code = (cy: number, size: number, lead: number, rows: number) =>
    k.rect(x + 12, cy, w - 24, rows * lead + 14, 6, '#0f1420') +
    k.bars(x + 20, cy + 9, w - 40, rows, {
      colors: ['#ff7b72', '#79c0ff', '#d2a8ff', 'rgba(230,237,243,.7)'],
      indent: [0, 1, 1, 0],
      height: size,
      lead,
    })
  const content =
    k.rect(x, y, w, h, 0, '#f4f5f8') +
    k.rect(x + 12, y + 30, 90, 8, 4, 'rgba(20,24,36,.6)') +
    k.bars(x + 12, y + 46, w - 24, 2, {
      colors: ['rgba(20,24,36,.25)'],
      height: 4,
      lead: 9,
    }) +
    code(y + 70, 4, 10, 5) +
    k.bars(x + 12, y + 140, w - 24, 2, {
      colors: ['rgba(20,24,36,.25)'],
      height: 4,
      lead: 9,
    }) +
    code(y + 164, 8, 17, 4)
  const phone =
    k.slab(x - 10, y - 12, w + 20, h + 24, 26, {
      face: ['#2b303b', '#0d0f14'],
      side: '#040507',
      depth: 7,
    }) +
    k.screen(x, y, w, h, 18, content) +
    k.rect(x + w / 2 - 22, y + 6, 44, 11, 6, '#0d0f14')
  k.standing(phone, x + w / 2, 90)
  // The magnifier over the big block.
  const mx = 470
  const my = 226
  k.add(
    k.line(
      [
        [mx + 40, my + 40],
        [mx + 86, my + 86],
      ],
      k.lin(mx, my, mx + 86, my + 86, [
        [0, '#7a5230'],
        [1, '#3a2614'],
      ]),
      16,
    ),
    k.circle(
      mx,
      my,
      54,
      hsl(200, 80, 90, 0.18),
      'stroke="#d8dee6" stroke-width="9"',
    ),
    k.circle(
      mx,
      my,
      54,
      'none',
      'stroke="rgba(255,255,255,.7)" stroke-width="2"',
    ),
    k.path(
      `M${mx - 40} ${my - 18}a44 44 0 0 1 36 -32`,
      'none',
      'stroke="rgba(255,255,255,.65)" stroke-width="5" stroke-linecap="round"',
    ),
  )
  // Resize arrows.
  const arrow = (ax: number, ay: number, dx: number) =>
    k.glow(
      k.line(
        [
          [ax, ay],
          [ax + dx, ay],
        ],
        hsl(45, 100, 65),
        5,
      ) +
        k.poly(
          [
            [ax + dx, ay - 8],
            [ax + dx + Math.sign(dx) * 12, ay],
            [ax + dx, ay + 8],
          ],
          hsl(45, 100, 65),
        ),
      4,
      0.7,
    )
  k.add(arrow(290, 220, -40), arrow(290, 250, -24))
  k.add(k.sparkles(4, [480, 40, 120, 100]))
  return k.vignette().toString()
})
