import { art, hsl, Kit } from '../kit'

/** KnightOS, an open-source OS for graphing calculators: a chunky
 *  calculator standing tall, its pixel LCD showing a chess knight, the
 *  operating system's own mascot. */
export default art(['project:knightos'], () => {
  const k = new Kit({ hue: 220, hue2: 200, spot: [430, 120] })
  k.stage()
  const x = 360
  const y = 40
  const w = 150
  const h = 258
  const lcdX = x + 18
  const lcdY = y + 22
  // Pixel knight, 12x12 on the LCD.
  const KNIGHT = [
    '.....XX.....',
    '....XXXX....',
    '...XXXXXX...',
    '..XX.XXXXX..',
    '.XXXXXXXXX..',
    'XXXXXXXXXX..',
    'XXX..XXXXX..',
    '.....XXXXX..',
    '....XXXXX...',
    '...XXXXXXX..',
    '..XXXXXXXXX.',
    '..XXXXXXXXX.',
  ]
  let px = ''
  KNIGHT.forEach((row, r) =>
    [...row].forEach((c, i) => {
      if (c === 'X')
        px += k.rect(
          lcdX + 34 + i * 4.5,
          lcdY + 16 + r * 4.5,
          4,
          4,
          0,
          '#1f2a18',
        )
    }),
  )
  const keys: string[] = []
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 5; c++) {
      const kx = x + 16 + c * 24
      const ky = y + 144 + r * 18
      const hue = r === 0 ? 200 : c === 4 ? 30 : 0
      keys.push(
        k.rect(
          kx,
          ky,
          20,
          13,
          4,
          r === 0 || c === 4 ? hsl(hue, 70, 50) : '#3a404c',
        ) + k.rect(kx + 2, ky + 1, 16, 4, 2, 'rgba(255,255,255,.18)'),
      )
    }
  }
  const calc =
    k.slab(x, y, w, h, 18, {
      face: ['#4b5262', '#1b1f27'],
      side: '#07080b',
      depth: 9,
    }) +
    k.rect(lcdX - 6, lcdY - 6, w - 24, 92, 8, '#141820') +
    k.rect(
      lcdX,
      lcdY,
      w - 36,
      80,
      4,
      k.lin(0, lcdY, 0, lcdY + 80, [
        [0, hsl(90, 32, 70)],
        [1, hsl(95, 28, 56)],
      ]),
    ) +
    px +
    k.rect(lcdX, lcdY, w - 36, 10, 0, 'rgba(255,255,255,.12)') +
    // D-pad.
    k.circle(x + w / 2, y + 128, 14, '#2b303a') +
    k.rect(x + w / 2 - 4, y + 116, 8, 24, 2, '#5b6272') +
    k.rect(x + w / 2 - 12, y + 124, 24, 8, 2, '#5b6272') +
    keys.join('')
  k.standing(calc, x + w / 2, 100)
  k.add(k.sparkles(5, [500, 40, 100, 140]))
  return k.vignette().toString()
})
