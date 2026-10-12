import { art, hsl, Kit } from '../kit'

/** Vibe-coding Minecraft mods: a voxel island of machine blocks, and
 *  TileFinder's beacon picking out the one you were looking for. */
export default art(['blog:vibecoding-minecraft-mods'], () => {
  const k = new Kit({ hue: 120, hue2: 200, spot: [430, 150] })
  k.stage()
  const s = 26
  const grass: [string, string, string] = [
    hsl(105, 60, 52),
    hsl(28, 45, 34),
    hsl(28, 45, 24),
  ]
  const stone: [string, string, string] = [
    hsl(220, 6, 62),
    hsl(220, 6, 42),
    hsl(220, 6, 30),
  ]
  const machine = (hue: number): [string, string, string] => [
    hsl(hue, 30, 55),
    hsl(hue, 30, 36),
    hsl(hue, 30, 25),
  ]
  const grid: [number, number, number, [string, string, string]][] = []
  for (let j = 0; j < 4; j++)
    for (let i = 0; i < 5; i++)
      grid.push([i, j, 0, (i + j) % 3 === 0 ? stone : grass])
  grid.push(
    [1, 1, 1, machine(210)],
    [3, 1, 1, machine(20)],
    [2, 2, 1, machine(270)],
    [1, 2, 1, stone],
    [3, 2, 1, machine(150)],
    [2, 1, 2, machine(45)],
  )
  grid.sort((a, b) => a[0] + a[1] + a[2] * 0.01 - (b[0] + b[1] + b[2] * 0.01))
  let island = ''
  const ox = 420
  const oy = 170
  for (const [i, j, z, f] of grid) {
    const cx = ox + (i - j) * s * 0.87
    const cy = oy + (i + j) * s * 0.5 - z * s
    island += k.cube(cx, cy, s, f)
    if (f !== grass && f !== stone)
      island += k.rect(
        cx - 5,
        cy + s * 0.25,
        10,
        10,
        2,
        hsl(50, 100, 70, 0.8),
        `transform="skewY(30) translate(0 ${-(cx - 5) * 0.577})"`,
      )
  }
  k.standing(island, ox, 150, 0.25)
  // The beacon on the found block.
  const bx = ox + (2 - 1) * s * 0.87
  const by = oy + 3 * s * 0.5 - 2 * s - s
  k.add(
    k.poly(
      [
        [bx - 12, by],
        [bx + 12, by],
        [bx + 30, 0],
        [bx - 30, 0],
      ],
      'rgba(255,240,140,.28)',
      `filter="${k.blur(4)}"`,
    ),
    k.circle(
      bx,
      by + 6,
      30,
      'none',
      `stroke="${hsl(50, 100, 70)}" stroke-width="3" opacity=".8"`,
    ),
  )
  // A floating pickaxe of pixels.
  let pick = ''
  const px = 255
  const py = 110
  const pixels = [
    '..aaaa.',
    '.a...aa',
    '.....ab',
    '....b..',
    '...b...',
    '..b....',
    '.b.....',
  ]
  pixels.forEach((row, r) =>
    [...row].forEach((c, q) => {
      if (c !== '.')
        pick += k.rect(
          px + q * 9,
          py + r * 9,
          9,
          9,
          0,
          c === 'a' ? hsl(185, 70, 70) : hsl(30, 50, 40),
        )
    }),
  )
  k.add(
    k.glow(
      `<g transform="rotate(-10 ${px + 30} ${py + 30})">${pick}</g>`,
      6,
      0.5,
    ),
  )
  k.add(k.sparkles(6, [330, 40, 240, 120]))
  return k.vignette().toString()
})
