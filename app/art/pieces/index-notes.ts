import { art, hsl, Kit } from '../kit'

/** All notes, short thoughts and snippets: a corkboard of sticky notes in
 *  bright colours, pinned and curling at the corners, one fluttering down. */
export default art(['index:notes'], () => {
  const k = new Kit({ hue: 45, hue2: 200, spot: [430, 140] })
  k.stage()
  const bx = 290
  const by = 40
  const bw = 300
  const bh = 220
  const board =
    k.slab(bx - 10, by - 10, bw + 20, bh + 20, 8, {
      face: [hsl(28, 50, 46), hsl(25, 50, 28)],
      side: hsl(25, 50, 14),
      depth: 6,
    }) +
    k.rect(
      bx,
      by,
      bw,
      bh,
      2,
      k.rad(bx + bw / 2, by + bh / 2, bw * 0.7, [
        [0, hsl(32, 50, 62)],
        [1, hsl(28, 45, 46)],
      ]),
    )
  const note = (x: number, y: number, hue: number, rot: number) =>
    `<g transform="rotate(${rot} ${x + 34} ${y + 34})">${k.rect(
      x + 3,
      y + 6,
      68,
      68,
      2,
      'rgba(0,0,0,.35)',
      `filter="${k.blur(3)}"`,
    )}${k.path(
      `M${x} ${y}h68v56q-4 10-14 12h-54z`,
      k.lin(x, y, x, y + 68, [
        [0, hsl(hue, 95, 74)],
        [1, hsl(hue, 85, 60)],
      ]),
    )}${k.path(
      `M${x + 68} ${y + 56}q-4 10-14 12q4-6 2-14z`,
      hsl(hue, 70, 46),
    )}${k.bars(x + 8, y + 18, 50, 3, {
      colors: ['rgba(40,30,20,.4)'],
      height: 4,
      lead: 12,
    })}${k.orb(x + 34, y + 6, 5, 0, 55)}</g>`
  k.add(
    board,
    note(bx + 16, by + 20, 50, -6),
    note(bx + 112, by + 14, 330, 4),
    note(bx + 208, by + 26, 190, -3),
    note(bx + 30, by + 118, 120, 5),
    note(bx + 132, by + 120, 25, -4),
  )
  k.add(
    k.rect(bx + 30, by + bh + 10, 12, 304 - by - bh - 10, 2, hsl(25, 50, 22)),
    k.rect(
      bx + bw - 42,
      by + bh + 10,
      12,
      304 - by - bh - 10,
      2,
      hsl(25, 50, 22),
    ),
  )
  // A note fluttering down.
  k.add(note(530, 220, 280, 18))
  k.add(k.sparkles(3, [500, 20, 100, 40]))
  return k.vignette().toString()
})
