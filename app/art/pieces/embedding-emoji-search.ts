import { art, hsl, Kit, type Pt } from '../kit'

/** Emoji in embedding space: faces hung in a 3D constellation, neighbours
 *  joined by light, and a search lens pulling the nearest ones close. */
export default art(['blog:embedding-emoji-search'], () => {
  const k = new Kit({ hue: 285, hue2: 230, spot: [420, 170], floor: false })
  k.stage()
  // Axes of the space.
  const o: Pt = [300, 290]
  k.add(
    k.line([o, [600, 250]], 'rgba(255,255,255,.18)', 1.5),
    k.line([o, [300, 40]], 'rgba(255,255,255,.18)', 1.5),
    k.line([o, [200, 360]], 'rgba(255,255,255,.18)', 1.5),
  )
  const faces: [number, number, number, number, number][] = []
  for (let i = 0; i < 16; i++) {
    faces.push([
      300 + k.rand() * 300,
      50 + k.rand() * 230,
      9 + k.rand() * 12,
      [48, 10, 200, 320, 140][i % 5],
      i % 4,
    ])
  }
  let links = ''
  faces.forEach((a, i) =>
    faces.slice(i + 1).forEach((b) => {
      const d = Math.hypot(a[0] - b[0], a[1] - b[1])
      if (d < 95)
        links += k.line(
          [
            [a[0], a[1]],
            [b[0], b[1]],
          ],
          hsl(200, 100, 75, 0.35 - d / 400),
          1.2,
        )
    }),
  )
  k.add(`<g filter="${k.blur(0.6)}">${links}</g>`)
  const face = (x: number, y: number, r: number, hue: number, mood: number) => {
    let f = k.orb(x, y, r, hue, 60)
    f += k.ellipse(x - r * 0.32, y - r * 0.12, r * 0.11, r * 0.17, '#1c1020')
    f += k.ellipse(x + r * 0.32, y - r * 0.12, r * 0.11, r * 0.17, '#1c1020')
    const smile = mood === 1 ? -0.35 : mood === 2 ? 0.25 : 0.45
    f += `<path d="M${x - r * 0.4} ${y + r * 0.3}Q${x} ${y + r * (0.3 + smile)} ${x + r * 0.4} ${y + r * 0.3}" fill="none" stroke="#1c1020" stroke-width="${r * 0.11}" stroke-linecap="round"/>`
    if (mood === 3)
      f +=
        k.ellipse(
          x - r * 0.55,
          y + r * 0.2,
          r * 0.16,
          r * 0.1,
          'rgba(255,90,140,.6)',
        ) +
        k.ellipse(
          x + r * 0.55,
          y + r * 0.2,
          r * 0.16,
          r * 0.1,
          'rgba(255,90,140,.6)',
        )
    return f
  }
  for (const [x, y, r, hue, mood] of faces)
    k.add(k.glow(face(x, y, r, hue, mood), 5, 0.4))
  // The lens.
  const lx = 470
  const ly = 150
  k.add(
    k.circle(lx, ly, 58, 'rgba(160,230,255,.12)'),
    face(lx - 6, ly + 4, 30, 48, 0),
    k.circle(
      lx,
      ly,
      58,
      'none',
      `stroke="${hsl(190, 90, 80)}" stroke-width="7"`,
    ),
    k.circle(
      lx,
      ly,
      58,
      'none',
      'stroke="rgba(255,255,255,.7)" stroke-width="2"',
    ),
    k.line(
      [
        [lx + 42, ly + 42],
        [lx + 84, ly + 86],
      ],
      k.lin(lx + 42, 0, lx + 84, 0, [
        [0, '#b8c4d4'],
        [1, '#3b4352'],
      ]),
      15,
    ),
    k.gloss(k.circle(lx, ly, 55, '#fff'), ly - 55, 110, 0.35),
  )
  k.add(k.sparkles(8, [300, 30, 320, 260]))
  return k.vignette().toString()
})
