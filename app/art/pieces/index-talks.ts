import { art, FLOOR, hsl, Kit } from '../kit'

/** Talks I like: a stage under a spotlight, a microphone on its stand in
 *  front of an empty projector screen, the audience's seats in silhouette. */
export default art(['index:talks'], () => {
  const k = new Kit({ hue: 350, hue2: 260, spot: [430, 120] })
  k.stage()
  // Curtains.
  k.add(
    k.path(
      'M220 0h70q-20 140 0 300h-70z',
      k.lin(220, 0, 290, 0, [
        [0, hsl(350, 70, 22)],
        [0.5, hsl(350, 80, 42)],
        [1, hsl(350, 70, 24)],
      ]),
    ),
    k.path(
      'M640 0h-70q20 140 0 300h70z',
      k.lin(570, 0, 640, 0, [
        [0, hsl(350, 70, 24)],
        [0.5, hsl(350, 80, 42)],
        [1, hsl(350, 70, 22)],
      ]),
    ),
  )
  // Screen.
  k.add(
    k.rect(
      330,
      40,
      210,
      124,
      4,
      k.lin(0, 40, 0, 164, [
        [0, '#f4f6fa'],
        [1, '#c8d0db'],
      ]),
    ),
    k.rect(340, 50, 120, 10, 5, 'rgba(30,40,60,.25)'),
    k.rect(340, 70, 190, 80, 4, hsl(220, 50, 70, 0.4)),
  )
  // Spotlight cone.
  k.add(
    k.poly(
      [
        [420, -10],
        [450, -10],
        [520, FLOOR],
        [360, FLOOR],
      ],
      'rgba(255,250,230,.12)',
      `filter="${k.blur(6)}"`,
    ),
  )
  // The mic.
  const mx = 440
  const mic = `${
    k.line(
      [
        [mx, 200],
        [mx, FLOOR - 4],
      ],
      '#3a404b',
      5,
    ) + k.ellipse(mx, FLOOR - 2, 30, 6, '#2a2f38')
  }<g transform="rotate(-20 ${mx} 200)">${k.rect(mx - 6, 170, 12, 34, 5, '#2a2f38')}${k.rect(
    mx - 12,
    136,
    24,
    40,
    12,
    k.lin(mx - 12, 0, mx + 12, 0, [
      [0, '#6b7380'],
      [0.4, '#e9edf2'],
      [1, '#5a626e'],
    ]),
  )}${[0, 1, 2, 3]
    .map((i) =>
      k.line(
        [
          [mx - 10, 144 + i * 8],
          [mx + 10, 144 + i * 8],
        ],
        'rgba(0,0,0,.25)',
        1.5,
      ),
    )
    .join('')}</g>`
  k.standing(mic, mx, 50)
  // Seats.
  k.add(
    ...[0, 1, 2, 3, 4, 5, 6].map((i) =>
      k.path(
        `M${246 + i * 56} 400v-44q0-14 14-14h22q14 0 14 14v44z`,
        '#07080c',
      ),
    ),
  )
  k.add(k.sparkles(3, [330, 10, 210, 20]))
  return k.vignette(0.5).toString()
})
