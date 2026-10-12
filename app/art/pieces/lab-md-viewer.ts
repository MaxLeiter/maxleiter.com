import { art, hsl, Kit } from '../kit'

/** md-viewer, a native-feeling markdown editor for macOS: raw markdown on
 *  a sheet at the back -- hashes, dashes, asterisks -- and the same page in
 *  front, rendered: a heading, a list, a quote, a code block. */
export default art(['lab:md-viewer'], () => {
  const k = new Kit({ hue: 30, hue2: 220, spot: [430, 140] })
  k.stage()
  // Source, behind and tilted.
  const sx = 300
  const sy = 50
  k.add(
    `<g transform="rotate(-8 ${sx + 90} ${sy + 100})">${k.slab(
      sx,
      sy,
      170,
      200,
      10,
      { face: ['#1f2530', '#0c0f14'], side: '#040507', depth: 6 },
    )}${[0, 1, 2]
      .map((i) =>
        k.line(
          [
            [sx + 18 + i * 8, sy + 22],
            [sx + 14 + i * 8, sy + 36],
          ],
          hsl(30, 90, 65),
          2.5,
        ),
      )
      .join('')}${k.rect(
      sx + 48,
      sy + 26,
      80,
      7,
      3.5,
      'rgba(255,255,255,.55)',
    )}${[0, 1, 2]
      .map(
        (i) =>
          k.rect(sx + 18, sy + 56 + i * 16, 8, 3, 1.5, hsl(30, 90, 65)) +
          k.rect(sx + 32, sy + 54 + i * 16, 90, 6, 3, 'rgba(255,255,255,.45)'),
      )
      .join(
        '',
      )}${k.rect(sx + 18, sy + 112, 6, 14, 2, hsl(200, 90, 65))}${k.rect(
      sx + 30,
      sy + 116,
      100,
      6,
      3,
      'rgba(255,255,255,.4)',
    )}${k.rect(sx + 18, sy + 140, 18, 6, 3, hsl(330, 90, 70))}${k.bars(
      sx + 18,
      sy + 156,
      120,
      3,
      { colors: ['rgba(255,255,255,.4)'], height: 5, lead: 12 },
    )}</g>`,
  )
  // Rendered, in front.
  const rx = 400
  const ry = 84
  const page =
    k.slab(rx, ry, 190, 214, 12, {
      face: ['#ffffff', '#e5e9ef'],
      side: '#6a7380',
      depth: 7,
    }) +
    k.rect(rx + 18, ry + 22, 120, 12, 6, 'rgba(20,24,36,.8)') +
    [0, 1, 2]
      .map(
        (i) =>
          k.circle(rx + 24, ry + 56 + i * 16, 3.5, hsl(30, 90, 52)) +
          k.rect(rx + 36, ry + 53 + i * 16, 110, 6, 3, 'rgba(20,24,36,.35)'),
      )
      .join('') +
    k.rect(rx + 18, ry + 110, 4, 26, 2, hsl(200, 80, 55)) +
    k.rect(rx + 28, ry + 114, 130, 6, 3, 'rgba(20,24,36,.3)') +
    k.rect(rx + 28, ry + 126, 90, 6, 3, 'rgba(20,24,36,.3)') +
    k.rect(rx + 18, ry + 150, 154, 46, 6, '#0f141c') +
    k.bars(rx + 28, ry + 160, 130, 2, {
      colors: ['#ff7b72', '#79c0ff', '#d2a8ff'],
      height: 4,
      lead: 13,
    })
  k.standing(page, rx + 95, 110)
  k.add(k.sparkles(4, [480, 30, 140, 50]))
  return k.vignette().toString()
})
