import { art, hsl, Kit } from '../kit'

/** Setting the open dialog's default directory: the dialog itself, and in
 *  front of it the one folder it should always start in, pinned with a
 *  bright marker so it is never more than a keystroke away. */
export default art(['note:vscode-default-dir'], () => {
  const k = new Kit({ hue: 205, hue2: 240, spot: [430, 140] })
  k.stage()
  const wx = 300
  const wy = 54
  const content =
    k.rect(wx, wy + 16, 70, 154, 0, '#eef1f5') +
    [0, 1, 2, 3, 4]
      .map((i) =>
        k.rect(
          wx + 10,
          wy + 28 + i * 18,
          46,
          6,
          3,
          i === 1 ? hsl(205, 80, 55) : 'rgba(20,24,36,.3)',
        ),
      )
      .join('') +
    [0, 1, 2]
      .flatMap((r) =>
        [0, 1, 2].map((c) =>
          k.folder(wx + 86 + c * 52, wy + 30 + r * 42, 34, 26, 205),
        ),
      )
      .join('') +
    k.rect(wx + 196, wy + 146, 46, 16, 8, hsl(205, 85, 52))
  k.add(
    k.window(wx, wy, 256, 172, { bar: '#dfe3e9', body: '#ffffff', content }),
  )
  // The hero folder and its pin.
  const fx = 420
  const fy = 196
  k.standing(k.folder(fx, fy, 130, 100, 45), fx + 65, 80)
  k.add(
    k.path(
      `M${fx + 104} ${fy - 8}c-22 0-30 18-30 30 0 20 30 46 30 46s30-26 30-46c0-12-8-30-30-30z`,
      k.lin(0, fy - 8, 0, fy + 68, [
        [0, hsl(355, 95, 66)],
        [1, hsl(350, 85, 40)],
      ]),
      'stroke="rgba(255,255,255,.6)" stroke-width="2"',
    ),
    k.circle(fx + 104, fy + 22, 10, '#fff'),
    k.path(`M${fx + 98} ${fy + 24}l6-6 6 6v6h-12z`, hsl(350, 80, 45)),
  )
  k.add(k.sparkles(4, [500, 140, 120, 60]))
  return k.vignette().toString()
})
