import { art, hsl, Kit } from '../kit'

/** How v0 became an effective coding agent: a friendly little robot at a
 *  workbench, wrench in hand, fixing a code panel while its checklist ticks
 *  itself off beside it. */
export default art(
  ['work:https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent'],
  () => {
    const k = new Kit({ hue: 250, hue2: 210, spot: [430, 130] })
    k.stage()
    // Code panel being worked on.
    const cx = 420
    const cy = 64
    k.add(
      k.slab(cx, cy, 170, 120, 10, {
        face: ['#20252f', '#0c0f14'],
        side: '#040507',
        depth: 6,
      }),
      k.bars(cx + 14, cy + 16, 140, 7, {
        colors: ['#ff7b72', '#79c0ff', '#d2a8ff', 'rgba(230,237,243,.7)'],
        indent: [0, 1, 2, 2, 1, 1, 0],
        height: 4,
        lead: 13,
      }),
      k.glow(
        k.rect(
          cx + 8,
          cy + 50,
          154,
          14,
          4,
          hsl(140, 90, 50, 0.25),
          `stroke="${hsl(140, 100, 65)}" stroke-width="1.5"`,
        ),
        4,
        0.8,
      ),
    )
    // The robot.
    const rx = 330
    const ry = 160
    const robot = `${
      k.line(
        [
          [rx, ry - 52],
          [rx, ry - 70],
        ],
        '#b8c0cb',
        3,
      ) +
      k.orb(rx, ry - 74, 7, 0, 58) +
      k.slab(rx - 40, ry - 52, 80, 58, 18, {
        face: ['#f4f6f9', '#aeb7c3'],
        side: '#525a66',
        depth: 6,
      }) +
      k.rect(rx - 30, ry - 40, 60, 32, 12, '#141821') +
      k.glow(
        k.ellipse(rx - 12, ry - 24, 6, 8, hsl(190, 100, 70)) +
          k.ellipse(rx + 12, ry - 24, 6, 8, hsl(190, 100, 70)),
        4,
        1,
      ) +
      k.slab(rx - 34, ry + 12, 68, 72, 16, {
        face: ['#e9edf2', '#9aa4b1'],
        side: '#4b535f',
        depth: 6,
      }) +
      k.circle(
        rx,
        ry + 44,
        12,
        hsl(250, 80, 62),
        'stroke="#fff" stroke-width="2"',
      ) +
      k.rect(rx - 26, ry + 84, 18, 60, 8, '#7d8693') +
      k.rect(rx + 8, ry + 84, 18, 60, 8, '#7d8693') +
      k.ellipse(rx - 17, ry + 144, 18, 6, '#4b535f') +
      k.ellipse(rx + 17, ry + 144, 18, 6, '#4b535f') +
      // Arm with the wrench, reaching to the panel.
      k.curve(
        [
          [rx + 32, ry + 24],
          [rx + 62, ry + 4],
          [rx + 84, ry - 30],
        ],
        '#9aa4b1',
        12,
      )
    }<g transform="rotate(-40 ${rx + 92} ${ry - 44})">${k.rect(rx + 86, ry - 66, 12, 46, 5, '#c9d0d9')}${k.path(`M${rx + 80} ${ry - 72}a14 14 0 1 1 24 0l-6 4v-10h-12v10z`, '#c9d0d9')}</g>`
    k.standing(robot, rx, 70)
    // Checklist.
    const lx = 540
    const ly = 200
    const list =
      k.slab(lx, ly, 70, 100, 8, {
        face: ['#ffffff', '#dfe4ea'],
        side: '#6b7380',
        depth: 5,
      }) +
      [0, 1, 2]
        .map(
          (i) =>
            k.rect(
              lx + 10,
              ly + 14 + i * 28,
              14,
              14,
              3,
              i < 2 ? hsl(140, 70, 48) : '#d0d6de',
            ) +
            (i < 2
              ? k.line(
                  [
                    [lx + 13, ly + 21 + i * 28],
                    [lx + 16, ly + 25 + i * 28],
                    [lx + 22, ly + 17 + i * 28],
                  ],
                  '#fff',
                  2.5,
                )
              : '') +
            k.rect(lx + 30, ly + 18 + i * 28, 30, 5, 2.5, 'rgba(30,40,60,.35)'),
        )
        .join('')
    k.standing(list, lx + 35, 44)
    k.add(k.sparkles(5, [360, 20, 240, 50]))
    return k.vignette().toString()
  },
)
