import { art, hsl, Kit } from '../kit'

/** Publishing a small library took the Unix-wizard incantation: a bubbling
 *  cauldron, three config scrolls circling over it, and the package rising
 *  out of the steam, almost functional. */
export default art(['blog:node-has-tooling-problems'], () => {
  const k = new Kit({ hue: 120, hue2: 270, spot: [420, 150] })
  k.stage()
  const cx = 420
  const cy = 240
  // Steam and the potion glow.
  k.add(
    k.ellipse(
      cx,
      cy - 70,
      120,
      90,
      hsl(120, 100, 60, 0.28),
      `filter="${k.blur(20)}"`,
    ),
  )
  const pot =
    k.path(
      `M${cx - 110} ${cy - 30}q0 90 110 92q110-2 110-92z`,
      k.rad(cx - 40, cy, 140, [
        [0, '#4a4f5c'],
        [0.7, '#1c1f26'],
        [1, '#0a0b0e'],
      ]),
    ) +
    k.ellipse(cx, cy - 30, 112, 22, '#14161b') +
    k.ellipse(
      cx,
      cy - 30,
      100,
      16,
      k.rad(cx, cy - 34, 100, [
        [0, hsl(110, 100, 72)],
        [1, hsl(130, 90, 36)],
      ]),
    ) +
    k.ellipse(
      cx,
      cy - 30,
      112,
      22,
      'none',
      'stroke="#5a606c" stroke-width="5"',
    ) +
    [
      [-70, 34],
      [70, 34],
    ]
      .map(([dx, h]) => k.rect(cx + dx - 8, cy + h, 16, 30, 4, '#121318'))
      .join('') +
    k.path(
      `M${cx - 76} ${cy - 10}q20 50 70 58`,
      'none',
      'stroke="rgba(255,255,255,.18)" stroke-width="6" stroke-linecap="round"',
    )
  k.standing(pot, cx, 130)
  // Bubbles.
  const R = k.rand
  for (let i = 0; i < 10; i++) {
    const r = 4 + R() * 9
    k.add(k.orb(cx - 70 + R() * 140, cy - 46 - R() * 80, r, 110 + R() * 30, 62))
  }
  // Three config scrolls orbiting.
  const scroll = (x: number, y: number, rot: number, hue: number) =>
    `<g transform="rotate(${rot} ${x + 40} ${y + 28})">${k.slab(
      x,
      y,
      80,
      56,
      6,
      { face: ['#fdf6e3', '#e4d7b4'], side: '#7a6a44', depth: 4 },
    )}${k.rect(x - 4, y - 3, 8, 62, 4, hsl(hue, 70, 45))}${k.rect(
      x + 76,
      y - 3,
      8,
      62,
      4,
      hsl(hue, 70, 45),
    )}${k.bars(x + 12, y + 12, 58, 3, {
      colors: [hsl(hue, 60, 40, 0.7), 'rgba(80,60,30,.45)'],
      height: 4,
      lead: 12,
      indent: [0, 1, 1],
    })}</g>`
  k.add(
    scroll(250, 70, -14, 210),
    scroll(380, 34, 4, 30),
    scroll(520, 86, 16, 330),
  )
  // Stars of the incantation.
  k.add(
    k.curve(
      [
        [260, 140],
        [340, 100],
        [420, 80],
        [520, 100],
        [590, 150],
      ],
      hsl(60, 100, 80, 0.5),
      2,
      'stroke-dasharray="1 7"',
    ),
  )
  k.add(k.sparkles(6, [260, 30, 340, 120]))
  return k.vignette().toString()
})
