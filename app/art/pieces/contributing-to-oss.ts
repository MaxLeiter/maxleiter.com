import { art, hsl, Kit } from '../kit'

/** Contributing to open source: a big glossy jigsaw, most of it already
 *  laid by many hands, and one bright new piece dropping into its gap. */
export default art(['blog:contributing-to-oss'], () => {
  const k = new Kit({ hue: 260, hue2: 210, spot: [430, 130] })
  k.stage()
  const S = 64
  // One jigsaw cell, with knobs out on the right and bottom, holes on left/top.
  const piece = (
    x: number,
    y: number,
    knobs: [number, number, number, number],
  ) => {
    const [t, r, b, l] = knobs
    const k1 = S * 0.18
    const edge = (
      x0: number,
      y0: number,
      dx: number,
      dy: number,
      dir: number,
    ) => {
      const mx = x0 + dx * 0.5
      const my = y0 + dy * 0.5
      const nx = -dy / S
      const ny = dx / S
      if (!dir) return `L${x0 + dx} ${y0 + dy}`
      return `L${mx - (dx / S) * k1} ${my - (dy / S) * k1}C${mx - (dx / S) * k1 + nx * dir * k1 * 2.4} ${my - (dy / S) * k1 + ny * dir * k1 * 2.4} ${mx + (dx / S) * k1 + nx * dir * k1 * 2.4} ${my + (dy / S) * k1 + ny * dir * k1 * 2.4} ${mx + (dx / S) * k1} ${my + (dy / S) * k1}L${x0 + dx} ${y0 + dy}`
    }
    return `M${x} ${y}${edge(x, y, S, 0, -t)}${edge(x + S, y, 0, S, -r)}${edge(x + S, y + S, -S, 0, -b)}${edge(x, y + S, 0, -S, -l)}Z`
  }
  const ox = 300
  const oy = 120
  const R = k.rand
  let board = k.rect(
    ox - 14,
    oy - 14,
    S * 4 + 28,
    S * 2 + 28,
    14,
    'rgba(0,0,0,.35)',
    `filter="${k.blur(6)}"`,
  )
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      if (r === 0 && c === 2) continue
      const knobs: [number, number, number, number] = [
        r === 0 ? 0 : -1,
        c === 3 ? 0 : 1,
        r === 1 ? 0 : 1,
        c === 0 ? 0 : -1,
      ]
      const d = piece(ox + c * S, oy + r * S, knobs)
      const hue = 200 + R() * 80
      board += k.path(
        d,
        k.lin(ox + c * S, oy + r * S, ox + c * S + S, oy + r * S + S, [
          [0, hsl(hue, 55, 62)],
          [1, hsl(hue, 55, 42)],
        ]),
        'stroke="rgba(255,255,255,.5)" stroke-width="1.5"',
      )
    }
  }
  // The gap.
  board += k.path(piece(ox + 2 * S, oy, [0, 1, 1, -1]), 'rgba(0,0,0,.45)')
  k.standing(
    `<g transform="translate(0 ${304 - oy - S * 2 - 10})">${board}</g>`,
    ox + S * 2,
    160,
    0.25,
  )
  // The new piece, hovering above its gap.
  const nx = ox + 2 * S
  const ny = 40
  const d = piece(nx, ny, [0, 1, 1, -1])
  k.add(
    k.path(d, hsl(45, 100, 60, 0.6), `filter="${k.blur(10)}"`),
    k.path(
      d,
      k.lin(nx, ny, nx + S, ny + S, [
        [0, hsl(48, 100, 70)],
        [1, hsl(30, 95, 52)],
      ]),
      'stroke="#fff" stroke-width="2"',
    ),
    k.gloss(k.path(d, '#fff'), ny, S, 0.45),
  )
  k.add(
    k.line(
      [
        [nx + S / 2, ny + S + 26],
        [nx + S / 2, ny + S + 50],
      ],
      hsl(48, 100, 75, 0.7),
      3,
      'stroke-dasharray="3 6"',
    ),
  )
  k.add(k.sparkles(5, [nx - 40, 20, 160, 60]))
  return k.vignette().toString()
})
