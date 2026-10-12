import { art, hsl, Kit } from '../kit'

/** The GitHub link -- open-source work, dotfiles, experiments -- as an
 *  open treasure chest overflowing with glowing repositories, a branch graph
 *  curling out of it like a vine. */
export default art(['link:github'], () => {
  const k = new Kit({ hue: 270, hue2: 230, spot: [430, 140] })
  k.stage()
  const cx = 430
  const cy = 230
  // Glow from inside.
  k.add(
    k.ellipse(
      cx,
      cy - 40,
      130,
      80,
      hsl(50, 100, 60, 0.35),
      `filter="${k.blur(18)}"`,
    ),
  )
  // Lid, open behind.
  const wood = (l: number) => hsl(25, 55, l)
  k.add(
    k.path(
      `M${cx - 110} ${cy - 30}l20-70q90-30 180 0l20 70z`,
      k.lin(0, cy - 110, 0, cy - 30, [
        [0, wood(46)],
        [1, wood(28)],
      ]),
    ),
    k.path(`M${cx - 96} ${cy - 40}l16-52q80-24 160 0l16 52z`, hsl(270, 50, 20)),
  )
  // Repos spilling out: little folder-ish cards and code sheets.
  k.add(
    `<g transform="rotate(-14 ${cx - 50} ${cy - 50})">${k.folder(cx - 90, cy - 80, 70, 52, 210)}</g>`,
    `<g transform="rotate(10 ${cx + 46} ${cy - 60})">${k.slab(cx + 10, cy - 96, 76, 56, 6, { face: ['#20252f', '#0c0f14'], depth: 4 })}${k.bars(cx + 20, cy - 86, 56, 3, { colors: ['#7ee787', '#79c0ff', 'rgba(255,255,255,.6)'], height: 4, lead: 12 })}</g>`,
    `<g transform="rotate(-4 ${cx} ${cy - 74})">${k.folder(cx - 26, cy - 112, 56, 42, 140)}</g>`,
  )
  // Body of the chest.
  const chest =
    k.slab(cx - 110, cy - 34, 220, 104, 10, {
      face: [wood(48), wood(26)],
      side: wood(14),
      depth: 8,
    }) +
    [cx - 80, cx + 70]
      .map((x) => k.rect(x, cy - 34, 14, 104, 2, hsl(45, 70, 56)))
      .join('') +
    k.rect(cx - 110, cy - 6, 220, 10, 0, hsl(45, 70, 50)) +
    k.slab(cx - 14, cy - 14, 28, 34, 5, {
      face: [hsl(48, 95, 66), hsl(40, 80, 42)],
      depth: 3,
    }) +
    k.circle(cx, cy, 4, '#3a2410')
  k.standing(chest, cx, 140)
  // Branch vine.
  k.add(
    k.glow(
      k.curve(
        [
          [cx + 80, cy - 40],
          [cx + 130, cy - 100],
          [cx + 150, cy - 160],
        ],
        hsl(140, 90, 60),
        4,
      ) +
        k.curve(
          [
            [cx + 128, cy - 98],
            [cx + 170, cy - 110],
            [cx + 190, cy - 140],
          ],
          hsl(140, 90, 60),
          4,
        ),
      4,
      0.8,
    ),
    k.orb(cx + 150, cy - 160, 8, 140, 58),
    k.orb(cx + 190, cy - 140, 8, 140, 58),
    k.orb(cx + 128, cy - 98, 8, 140, 58),
  )
  k.add(k.sparkles(6, [310, 40, 260, 100]))
  return k.vignette().toString()
})
