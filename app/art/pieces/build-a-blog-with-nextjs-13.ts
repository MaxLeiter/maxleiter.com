import { art, hsl, Kit } from '../kit'

/** Building a blog with server components: a page frame under construction,
 *  blocks already set in place, a crane lowering the next one onto it. */
export default art(['blog:build-a-blog-with-nextjs-13'], () => {
  const k = new Kit({ hue: 35, hue2: 220, spot: [420, 140] })
  k.stage()
  const x = 300
  const y = 120
  const w = 220
  const h = 176
  // The page under construction: its frame and the blocks already set.
  const page =
    k.slab(x, y, w, h, 10, {
      face: ['#262c36', '#10141a'],
      side: '#05070a',
      depth: 8,
    }) +
    k.rect(
      x,
      y,
      w,
      20,
      0,
      'rgba(255,255,255,.07)',
      `clip-path="${k.clip(k.rect(x, y, w, h, 10, '#fff'))}"`,
    ) +
    k.circle(x + 12, y + 10, 3.5, '#ff6b5e') +
    k.circle(x + 24, y + 10, 3.5, '#ffc23d') +
    k.circle(x + 36, y + 10, 3.5, '#36d26a') +
    k.slab(x + 14, y + 32, w - 28, 26, 5, {
      face: [hsl(210, 80, 64), hsl(220, 70, 44)],
      depth: 4,
    }) +
    k.slab(x + 14, y + 68, 60, 92, 5, {
      face: [hsl(160, 60, 58), hsl(170, 60, 36)],
      depth: 4,
    }) +
    k.rect(
      x + 84,
      y + 68,
      w - 98,
      92,
      5,
      'none',
      'stroke="rgba(255,255,255,.45)" stroke-width="2" stroke-dasharray="6 5"',
    )
  k.standing(page, x + w / 2, 150)
  // The crane.
  const arm =
    k.rect(
      486,
      18,
      14,
      290,
      2,
      'none',
      `stroke="${hsl(45, 95, 55)}" stroke-width="4"`,
    ) +
    [0, 1, 2, 3, 4, 5, 6, 7, 8]
      .map((i) =>
        k.line(
          [
            [486, 40 + i * 30],
            [500, 70 + i * 30],
          ],
          hsl(45, 95, 55),
          2.5,
        ),
      )
      .join('') +
    k.rect(380, 18, 200, 12, 2, hsl(45, 95, 55)) +
    k.rect(560, 30, 26, 18, 2, '#3a3f48')
  k.add(arm)
  const bx = x + 84
  const by = 92
  k.add(
    k.line(
      [
        [bx + 61, 30],
        [bx + 61, by - 14],
      ],
      '#cfd5dc',
      2,
    ),
    k.poly(
      [
        [bx + 61, by - 14],
        [bx + 20, by],
        [bx + 102, by],
      ],
      'none',
      'stroke="#cfd5dc" stroke-width="2"',
    ),
    `<g transform="rotate(-4 ${bx + 61} ${by + 30})">${k.slab(bx, by, 122, 62, 6, { face: [hsl(330, 80, 68), hsl(320, 70, 46)], depth: 6 })}${k.bars(bx + 12, by + 14, 98, 3, { colors: ['rgba(255,255,255,.7)'], height: 5, lead: 13 })}</g>`,
  )
  k.add(k.sparkles(5, [300, 40, 200, 70]))
  return k.vignette().toString()
})
