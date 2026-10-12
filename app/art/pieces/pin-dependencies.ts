import { art, hsl, Kit } from '../kit'

/** Pin your dependencies: a stack of package boxes, the top one held down
 *  by a giant glossy push-pin, while an unpinned one beside it has burst
 *  open, its broken version spilling out. */
export default art(['blog:pin-dependencies'], () => {
  const k = new Kit({ hue: 0, hue2: 220, spot: [420, 140] })
  k.stage()
  const box = (cx: number, cy: number, s: number) =>
    k.cube(cx, cy, s, [hsl(32, 60, 70), hsl(28, 55, 52), hsl(26, 50, 40)]) +
    k.poly(
      [
        [cx - s * 0.12, cy - s * 0.93],
        [cx + s * 0.12, cy - s * 0.93],
        [cx + s * 0.87 * 0.12 + s * 0.12, cy - s * 0.5 * 0.12 - s * 0.07],
        [cx - s * 0.87 * 0.12 + s * 0.12, cy + s * 0.07],
      ],
      hsl(40, 30, 85, 0.7),
    )
  k.standing(
    box(380, 250, 46) + box(462, 250, 46) + box(421, 172, 50),
    420,
    140,
  )
  // The pin.
  const px = 421
  const py = 60
  k.add(
    k.line(
      [
        [px, py + 36],
        [px, py + 108],
      ],
      k.lin(0, py, 0, py + 108, [
        [0, '#e8ecf0'],
        [1, '#7a838e'],
      ]),
      5,
    ),
    k.ellipse(px, py + 34, 30, 9, hsl(0, 75, 36)),
    k.rect(
      px - 20,
      py - 2,
      40,
      36,
      6,
      k.lin(px - 20, 0, px + 20, 0, [
        [0, hsl(0, 80, 40)],
        [0.4, hsl(0, 90, 62)],
        [1, hsl(0, 80, 34)],
      ]),
    ),
    k.ellipse(
      px,
      py - 2,
      36,
      12,
      k.rad(px - 10, py - 6, 40, [
        [0, hsl(0, 100, 78)],
        [1, hsl(0, 85, 48)],
      ]),
    ),
    k.ellipse(px - 10, py - 5, 12, 4, 'rgba(255,255,255,.6)'),
  )
  // The burst box, off to the right.
  const bx = 560
  const by = 262
  const burst =
    k.cube(bx, by, 36, [hsl(32, 40, 50), hsl(28, 45, 40), hsl(26, 40, 30)]) +
    k.poly(
      [
        [bx - 31, by - 18],
        [bx - 50, by - 46],
        [bx - 6, by - 36],
      ],
      hsl(32, 50, 62),
    ) +
    k.poly(
      [
        [bx + 31, by - 18],
        [bx + 52, by - 44],
        [bx + 8, by - 36],
      ],
      hsl(28, 50, 56),
    ) +
    k.line(
      [
        [bx - 8, by + 6],
        [bx + 2, by + 16],
        [bx - 4, by + 26],
      ],
      '#2a1a10',
      2,
    )
  k.standing(burst, bx, 50)
  k.add(
    k.glow(
      k.line(
        [
          [bx - 2, by - 40],
          [bx + 6, by - 62],
          [bx - 4, by - 78],
          [bx + 4, by - 96],
        ],
        hsl(10, 100, 62),
        4,
      ),
      5,
      0.9,
    ),
    k.orb(bx - 20, by - 70, 6, 0, 55),
    k.orb(bx + 22, by - 86, 5, 20, 55),
  )
  k.add(k.sparkles(4, [330, 30, 200, 50]))
  return k.vignette().toString()
})
