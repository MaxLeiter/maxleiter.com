import { art, hsl, Kit } from '../kit'

/** Updating one JSONB field with Drizzle: a database drum under a little
 *  rain cloud, the drizzle falling on a single key of the document lifted
 *  out of it, which glows where it changed and nowhere else. */
export default art(['note:updating-jsonb-drizzle'], () => {
  const k = new Kit({ hue: 160, hue2: 210, spot: [420, 130] })
  k.stage()
  // The drum.
  const db =
    k.cylinder(420, 210, 74, 84, 170, 46) +
    k.ellipse(
      420,
      238,
      74,
      23,
      'none',
      `stroke="${hsl(170, 80, 80, 0.5)}" stroke-width="2"`,
    ) +
    k.ellipse(
      420,
      266,
      74,
      23,
      'none',
      `stroke="${hsl(170, 80, 80, 0.5)}" stroke-width="2"`,
    )
  k.standing(db, 420, 90)
  // The document hovering above it: brace bars with one glowing row.
  const dx = 336
  const dy = 96
  const doc =
    k.slab(dx, dy, 168, 92, 10, {
      face: ['#1f2630', '#0c1016'],
      side: '#040507',
      depth: 6,
    }) +
    k.path(
      `M${dx + 18} ${dy + 14}q-8 0-8 8v14q0 6-6 10q6 4 6 10v14q0 8 8 8`,
      'none',
      `stroke="${hsl(45, 90, 65)}" stroke-width="3" stroke-linecap="round"`,
    ) +
    k.path(
      `M${dx + 150} ${dy + 14}q8 0 8 8v14q0 6 6 10q-6 4-6 10v14q0 8-8 8`,
      'none',
      `stroke="${hsl(45, 90, 65)}" stroke-width="3" stroke-linecap="round"`,
    ) +
    k.rect(dx + 28, dy + 18, 48, 6, 3, hsl(200, 80, 70)) +
    k.rect(dx + 84, dy + 18, 50, 6, 3, 'rgba(255,255,255,.4)') +
    k.glow(
      k.rect(
        dx + 22,
        dy + 38,
        124,
        16,
        6,
        hsl(160, 100, 50, 0.35),
        `stroke="${hsl(160, 100, 70)}" stroke-width="2"`,
      ),
      6,
      0.8,
    ) +
    k.rect(dx + 28, dy + 43, 48, 6, 3, hsl(200, 80, 70)) +
    k.rect(dx + 84, dy + 43, 40, 6, 3, hsl(160, 100, 75)) +
    k.rect(dx + 28, dy + 66, 48, 6, 3, hsl(200, 80, 70)) +
    k.rect(dx + 84, dy + 66, 56, 6, 3, 'rgba(255,255,255,.4)')
  k.add(doc)
  // The cloud and its drizzle, aimed at the one row.
  const cx = 470
  const cy = 46
  k.add(
    ...[
      [0, 0, 26],
      [-26, 8, 18],
      [26, 8, 20],
      [-8, -14, 20],
    ].map(([x, y, r]) =>
      k.circle(
        cx + x,
        cy + y,
        r,
        k.rad(cx + x - 6, cy + y - 10, r * 1.6, [
          [0, '#ffffff'],
          [1, '#aebccc'],
        ]),
      ),
    ),
    k.rect(cx - 44, cy + 6, 90, 22, 11, '#c3ceda'),
    ...[0, 1, 2, 3, 4].map((i) =>
      k.line(
        [
          [cx - 30 + i * 15, cy + 36 + (i % 2) * 8],
          [cx - 34 + i * 15, cy + 48 + (i % 2) * 8],
        ],
        hsl(195, 100, 75),
        3,
      ),
    ),
  )
  k.add(k.sparkles(4, [320, 40, 120, 50]))
  return k.vignette().toString()
})
