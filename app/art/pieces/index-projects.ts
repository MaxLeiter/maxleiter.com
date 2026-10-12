import { art, hsl, Kit } from '../kit'

/** All projects: a glossy red toolbox, lid flipped open, its trays full of
 *  tools -- a wrench, a screwdriver, a tape measure -- ready to build with. */
export default art(['index:projects'], () => {
  const k = new Kit({ hue: 0, hue2: 230, spot: [430, 140] })
  k.stage()
  const cx = 430
  const top = 196
  const red = (l: number) => hsl(355, 80, l)
  // Tools sticking up.
  k.add(
    `<g transform="rotate(-22 ${cx - 50} ${top})">${k.rect(cx - 56, top - 110, 14, 100, 5, '#c9d0d9')}${k.path(`M${cx - 66} ${top - 118}a18 18 0 1 1 32 0l-7 6v-14h-18v14z`, '#c9d0d9')}</g>`,
    `<g transform="rotate(16 ${cx + 30} ${top})">${k.rect(cx + 26, top - 120, 8, 70, 3, '#d9dee5')}${k.rect(
      cx + 20,
      top - 60,
      20,
      56,
      8,
      k.lin(cx + 20, 0, cx + 40, 0, [
        [0, hsl(45, 90, 44)],
        [0.4, hsl(48, 100, 64)],
        [1, hsl(40, 90, 38)],
      ]),
    )}</g>`,
    k.slab(cx + 60, top - 46, 52, 44, 12, {
      face: [hsl(48, 100, 62), hsl(40, 90, 42)],
      depth: 4,
    }),
    k.circle(cx + 86, top - 24, 10, '#2a2f38'),
    k.rect(cx + 104, top - 18, 26, 8, 2, '#d9dee5'),
  )
  // Lid, open behind.
  k.add(
    k.path(
      `M${cx - 130} ${top - 6}l-20-60h260l20 60z`,
      k.lin(0, top - 66, 0, top, [
        [0, red(36)],
        [1, red(24)],
      ]),
    ),
  )
  const box =
    k.slab(cx - 130, top, 260, 104, 10, {
      face: [red(60), red(34)],
      side: red(18),
      depth: 8,
    }) +
    k.rect(cx - 130, top + 34, 260, 6, 0, red(28)) +
    k.slab(cx - 30, top + 20, 60, 22, 5, {
      face: ['#e9edf2', '#9ea7b3'],
      depth: 3,
    }) +
    k.rect(cx - 50, top - 22, 100, 10, 5, '#2a2f38')
  k.standing(box, cx, 160)
  k.add(k.sparkles(5, [320, 40, 240, 60]))
  return k.vignette().toString()
})
