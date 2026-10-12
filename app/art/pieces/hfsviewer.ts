import { art, hsl, Kit } from '../kit'

/** HFSViewer opens classic Mac disk images on a modern machine: two glossy
 *  3.5-inch floppies, one sliding toward a window that already shows the
 *  old volume's folders, as crisp as the day they were written. */
export default art(['blog:HFSViewer', 'lab:HFSViewer'], () => {
  const k = new Kit({ hue: 185, hue2: 230, spot: [430, 140] })
  k.stage()
  // The window with the volume's contents.
  const wx = 330
  const wy = 56
  const content =
    k.rect(wx, wy + 16, 230, 16, 0, '#eef1f5') +
    k.bars(wx + 8, wy + 21, 120, 1, {
      colors: ['rgba(20,24,36,.3)'],
      height: 5,
    }) +
    [0, 1, 2]
      .map(
        (i) =>
          k.folder(wx + 18 + i * 70, wy + 48, 48, 38, 210 - i * 20) +
          k.rect(wx + 18 + i * 70, wy + 94, 48, 5, 2.5, 'rgba(20,24,36,.35)'),
      )
      .join('') +
    k.slab(wx + 26, wy + 112, 40, 26, 4, {
      face: ['#f4f6f9', '#b4bcc6'],
      depth: 3,
    }) +
    k.rect(wx + 30, wy + 130, 32, 3, 1.5, '#5d6672') +
    k.rect(wx + 18, wy + 144, 56, 5, 2.5, 'rgba(20,24,36,.35)')
  k.add(
    k.window(wx, wy, 230, 162, { bar: '#dfe3e9', body: '#ffffff', content }),
  )
  // A floppy.
  const floppy = (
    x: number,
    y: number,
    s: number,
    hue: number,
    rot: number,
  ) => {
    const w = 120 * s
    const d = `M${x} ${y + 8 * s}q0-8 8-8h${w - 24 * s}l${16 * s} ${16 * s}v${w - 24 * s}q0 8-8 8h${-(w - 16 * s)}q-8 0-8-8z`
    return `<g transform="rotate(${rot} ${x + w / 2} ${y + w / 2})">${k.path(
      d,
      'rgba(0,0,0,.5)',
      `transform="translate(${4 * s} ${8 * s})" filter="${k.blur(4)}"`,
    )}${k.path(
      d,
      k.lin(x, y, x + w, y + w, [
        [0, hsl(hue, 80, 60)],
        [1, hsl(hue, 75, 34)],
      ]),
    )}${k.gloss(k.path(d, '#fff'), y, w, 0.35)}${k.rect(
      x + 28 * s,
      y,
      62 * s,
      38 * s,
      2 * s,
      k.lin(x, 0, x + w, 0, [
        [0, '#9aa3ad'],
        [0.4, '#eef1f4'],
        [1, '#8a939d'],
      ]),
    )}${k.rect(
      x + 66 * s,
      y + 6 * s,
      14 * s,
      26 * s,
      2 * s,
      hsl(hue, 70, 28),
    )}${k.rect(
      x + 18 * s,
      y + 56 * s,
      84 * s,
      58 * s,
      4 * s,
      '#f6f7f9',
    )}${k.bars(x + 26 * s, y + 68 * s, 60 * s, 3, {
      colors: ['rgba(30,40,60,.35)'],
      height: 4 * s,
      lead: 12 * s,
    })}${k.path(
      d,
      'none',
      'stroke="rgba(255,255,255,.45)" stroke-width="1.5"',
    )}</g>`
  }
  k.standing(
    floppy(236, 186, 0.98, 210, -8) + floppy(330, 200, 0.86, 330, 6),
    360,
    130,
  )
  k.add(
    k.curve(
      [
        [440, 214],
        [480, 230],
        [520, 222],
        [540, 200],
      ],
      hsl(185, 100, 80, 0.55),
      3,
      'stroke-dasharray="3 7"',
    ),
  )
  k.add(k.sparkles(5, [480, 180, 140, 90]))
  return k.vignette().toString()
})
