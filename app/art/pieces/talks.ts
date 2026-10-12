import { art, type ArtPiece, FLOOR, hsl, Kit } from '../kit'

/**
 * The talks: one stage dressing shared by all of them -- a speaker's mic on
 * its stand at the left -- and each talk's own subject as the hero, drawn
 * about the talk. The subject sits around (460, 170).
 */
function talk(
  id: string,
  hue: number,
  hero: (k: Kit) => string,
  standing = true,
): ArtPiece {
  return art([`talk:${id}`], () => {
    const k = new Kit({ hue, hue2: hue + 50, spot: [450, 130] })
    k.stage()
    const mx = 300
    const mic = `${
      k.line(
        [
          [mx, 196],
          [mx, FLOOR - 4],
        ],
        '#3a404b',
        4,
      ) + k.ellipse(mx, FLOOR - 2, 24, 5, '#2a2f38')
    }<g transform="rotate(-16 ${mx} 196)">${k.rect(mx - 5, 170, 10, 28, 4, '#2a2f38')}${k.rect(
      mx - 10,
      140,
      20,
      34,
      10,
      k.lin(mx - 10, 0, mx + 10, 0, [
        [0, '#6b7380'],
        [0.4, '#e9edf2'],
        [1, '#5a626e'],
      ]),
    )}</g>`
    k.standing(mic, mx, 30, 0.25)
    if (standing) k.standing(hero(k), 460, 130)
    else k.add(hero(k))
    k.add(k.sparkles(3, [470, 20, 140, 40]))
    return k.vignette().toString()
  })
}

const ink = 'rgba(30,40,60,.4)'

export default [
  // A 3D graph drawn by the calculator that shipped with every Mac.
  talk(
    'GMyg5ohTsVY',
    150,
    (k) => {
      let grid = ''
      for (let i = 0; i < 9; i++) {
        const pts: [number, number][] = []
        for (let j = 0; j <= 16; j++) {
          const x = 360 + j * 13 + i * 6
          const y =
            220 - i * 12 - Math.sin(j / 2.4 + i / 2) * 22 * Math.cos(i / 4)
          pts.push([x, y])
        }
        grid += k.curve(pts, hsl(150 + i * 12, 90, 62, 0.9), 2.5)
      }
      return (
        k.line(
          [
            [360, 250],
            [600, 250],
          ],
          'rgba(255,255,255,.6)',
          2,
        ) +
        k.line(
          [
            [360, 250],
            [360, 70],
          ],
          'rgba(255,255,255,.6)',
          2,
        ) +
        k.line(
          [
            [360, 250],
            [410, 290],
          ],
          'rgba(255,255,255,.6)',
          2,
        ) +
        k.glow(grid, 4, 0.6)
      )
    },
    false,
  ),
  // The art of code: a painter's palette whose paints are syntax colours.
  talk(
    '6avJHaC3C2U',
    30,
    (k) =>
      `${
        k.path(
          'M380 200c-30-60 30-110 100-100 70 10 90 70 60 110-14 20-40 4-52 20-12 18 10 40-20 50-50 16-74-40-88-80z',
          k.lin(370, 100, 560, 270, [
            [0, hsl(35, 60, 74)],
            [1, hsl(28, 55, 50)],
          ]),
          'transform="translate(0 40)"',
        ) +
        k.circle(420, 270, 14, 'rgba(0,0,0,.5)') +
        [
          [430, 170, 0],
          [480, 160, 210],
          [524, 186, 280],
          [528, 226, 140],
          [406, 222, 45],
        ]
          .map(([x, y, h]) => k.orb(x, y + 40, 16, h, 58))
          .join('')
      }<g transform="rotate(34 560 120)">${k.rect(556, 40, 10, 130, 4, hsl(28, 50, 40))}${k.rect(554, 160, 14, 16, 2, '#c9d0d9')}${k.path('M554 176h14q4 22-7 34q-11-12-7-34z', hsl(210, 85, 60))}</g>`,
  ),
  // Plain text: one giant caret blinking after a line.
  talk(
    'gd5uJ7Nlvvo',
    220,
    (k) =>
      k.slab(370, 90, 200, 150, 12, {
        face: ['#ffffff', '#dde3ea'],
        depth: 7,
      }) +
      k.bars(390, 112, 160, 5, { colors: [ink], height: 7, lead: 20 }) +
      k.glow(k.rect(520, 196, 8, 34, 2, hsl(220, 100, 60)), 5, 1),
  ),
  // Ten regrets: a checklist where every box is crossed out.
  talk(
    'M3BM9TB-8yA',
    110,
    (k) =>
      k.slab(390, 50, 150, 250, 10, {
        face: ['#ffffff', '#dde3ea'],
        depth: 7,
      }) +
      Array.from(
        { length: 10 },
        (_, i) =>
          k.rect(
            404,
            66 + i * 23,
            14,
            14,
            3,
            '#fff',
            'stroke="#9aa3ad" stroke-width="1.5"',
          ) +
          k.line(
            [
              [406, 68 + i * 23],
              [416, 78 + i * 23],
            ],
            hsl(0, 85, 55),
            2.5,
          ) +
          k.line(
            [
              [416, 68 + i * 23],
              [406, 78 + i * 23],
            ],
            hsl(0, 85, 55),
            2.5,
          ) +
          k.rect(426, 70 + i * 23, 90, 6, 3, ink),
      ).join(''),
  ),
  // The JSON saga: the braces themselves.
  talk(
    '-C-JoyNuQJs',
    45,
    (k) => {
      const c = hsl(45, 100, 66)
      const brace = (x: number, dir: number) =>
        k.path(
          `M${x} 70q${-dir * 30} 0 ${-dir * 30} 30v40q0 22 ${-dir * 24} 30q${dir * 24} 8 ${dir * 24} 30v40q0 30 ${dir * 30} 30`,
          'none',
          `stroke="${c}" stroke-width="16" stroke-linecap="round"`,
        )
      return (
        k.glow(brace(420, 1) + brace(510, -1), 10, 0.8) +
        k.orb(465, 170, 14, 200, 60)
      )
    },
    false,
  ),
  // Erlang's soul: a supervision tree, one process crashing and coming back.
  talk(
    'JvBT4XBdoUE',
    330,
    (k) => {
      const n: [number, number][] = [
        [466, 70],
        [400, 140],
        [530, 140],
        [370, 220],
        [430, 220],
        [500, 220],
        [560, 220],
      ]
      const e = [
        [0, 1],
        [0, 2],
        [1, 3],
        [1, 4],
        [2, 5],
        [2, 6],
      ]
      return (
        e
          .map(([a, b]) => k.line([n[a], n[b]], 'rgba(255,255,255,.5)', 3))
          .join('') +
        n
          .map(([x, y], i) =>
            i === 5
              ? k.glow(k.circle(x, y, 16, hsl(0, 90, 55)), 8, 1) +
                k.path(
                  `M${x - 22} ${y - 26}a30 30 0 1 1 -6 30`,
                  'none',
                  `stroke="${hsl(140, 90, 60)}" stroke-width="3"`,
                )
              : k.orb(x, y, i === 0 ? 20 : 14, 300 + i * 8, 58),
          )
          .join('')
      )
    },
    false,
  ),
  // The Apollo Guidance Computer: a DSKY box under the moon.
  talk(
    'B1J2RMorJXM',
    210,
    (k) =>
      k.orb(560, 70, 34, 50, 70) +
      k.slab(380, 120, 170, 180, 10, {
        face: ['#5a606a', '#2a2e35'],
        side: '#101215',
        depth: 7,
      }) +
      k.rect(396, 136, 138, 70, 4, '#0b0e0c') +
      [0, 1, 2]
        .map((r) =>
          k.bars(406, 146 + r * 20, 118, 1, {
            colors: [hsl(130, 100, 60)],
            height: 8,
          }),
        )
        .join('') +
      Array.from({ length: 15 }, (_, i) =>
        k.rect(
          396 + (i % 5) * 28,
          218 + Math.floor(i / 5) * 26,
          24,
          20,
          3,
          '#d9dde2',
        ),
      ).join(''),
  ),
  // DRM in Polish trains: a locomotive with its padlock sprung open.
  talk(
    'XrlrbfGZo2k',
    0,
    (k) =>
      k.slab(360, 170, 220, 100, 18, {
        face: [hsl(5, 70, 52), hsl(0, 65, 34)],
        depth: 7,
      }) +
      k.rect(380, 186, 50, 36, 6, hsl(200, 60, 70)) +
      k.rect(440, 186, 50, 36, 6, hsl(200, 60, 70)) +
      k.rect(360, 240, 220, 10, 0, hsl(50, 90, 60)) +
      [390, 450, 520]
        .map((x) =>
          k.circle(x, 286, 16, '#22262c', 'stroke="#6a707a" stroke-width="4"'),
        )
        .join('') +
      k.path(
        'M486 130v-20a22 22 0 0 1 44 0',
        'none',
        'stroke="#d9dee5" stroke-width="8" transform="rotate(-24 508 110)"',
      ) +
      k.slab(480, 120, 56, 44, 8, {
        face: [hsl(48, 100, 64), hsl(40, 85, 40)],
        depth: 4,
      }),
  ),
  // Red Star OS: the star rising out of fog over a desktop window.
  talk('8LGDM9exlZw', 355, (k) => {
    const pts: [number, number][] = []
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 26 : 62
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      pts.push([466 + Math.cos(a) * r, 120 + Math.sin(a) * r])
    }
    return (
      k.window(380, 170, 180, 110, { bar: '#d8dce2', body: hsl(210, 50, 40) }) +
      k.glow(
        k.poly(
          pts,
          k.lin(400, 60, 530, 180, [
            [0, hsl(0, 100, 66)],
            [1, hsl(355, 85, 42)],
          ]),
        ),
        10,
        0.8,
      ) +
      [0, 1, 2]
        .map((i) =>
          k.ellipse(
            420 + i * 50,
            250 + i * 10,
            80,
            14,
            'rgba(230,235,245,.25)',
            `filter="${k.blur(8)}"`,
          ),
        )
        .join('')
    )
  }),
  // The Xerox Alto: a portrait monitor and a three-button mouse.
  talk(
    'NqKyHEJe9_w',
    40,
    (k) =>
      k.slab(400, 50, 140, 180, 8, { face: ['#efe9dc', '#bdb5a4'], depth: 7 }) +
      k.screen(
        412,
        62,
        116,
        150,
        3,
        k.rect(412, 62, 116, 150, 0, '#f5f5f0') +
          k.rect(420, 72, 60, 50, 2, 'none', 'stroke="#222" stroke-width="2"') +
          k.rect(
            470,
            110,
            50,
            60,
            2,
            '#fff',
            'stroke="#222" stroke-width="2"',
          ) +
          k.bars(476, 122, 38, 3, { colors: ['#333'], height: 3, lead: 10 }),
      ) +
      k.rect(440, 230, 60, 40, 0, '#a9a192') +
      k.rect(390, 270, 160, 30, 6, '#d8d0c0') +
      k.slab(560, 262, 36, 36, 10, { face: ['#efe9dc', '#bdb5a4'], depth: 4 }) +
      [0, 1, 2]
        .map((i) =>
          k.rect(
            563 + i * 11,
            265,
            8,
            12,
            2,
            i === 1 ? hsl(0, 70, 50) : '#333',
          ),
        )
        .join(''),
  ),
  // NeXT: a black cube with a magenta glint.
  talk(
    'CtnX1EJHbC0',
    300,
    (k) =>
      k.cube(466, 180, 100, ['#2a2a2e', '#141416', '#08080a']) +
      k.line(
        [
          [466, 180],
          [466, 280],
        ],
        hsl(300, 100, 70, 0.6),
        2,
      ) +
      k.line(
        [
          [379, 130],
          [466, 180],
          [553, 130],
        ],
        'rgba(255,255,255,.25)',
        1.5,
      ) +
      k.glow(k.circle(500, 220, 4, hsl(300, 100, 70)), 4, 1),
  ),
  // The Linux gaming desktop: a tower and a controller in front.
  talk(
    'pq1XqP4-qOo',
    270,
    (k) =>
      k.slab(450, 70, 100, 220, 10, {
        face: ['#2b303a', '#0e1014'],
        side: '#040507',
        depth: 7,
      }) +
      k.glow(k.rect(462, 90, 6, 180, 3, hsl(270, 100, 66)), 6, 1) +
      k.circle(520, 100, 8, '#1a1d23', 'stroke="#555" stroke-width="2"') +
      k.path(
        'M380 236q4-14 20-14h60q16 0 20 14l8 30q4 16-10 18q-10 2-18-10l-6-8h-48l-6 8q-8 12-18 10q-14-2-10-18z',
        k.lin(0, 222, 0, 290, [
          [0, '#f2f4f7'],
          [1, '#9aa3ae'],
        ]),
      ) +
      k.rect(394, 242, 18, 6, 2, '#2a2f38') +
      k.rect(400, 236, 6, 18, 2, '#2a2f38') +
      k.circle(460, 238, 5, hsl(0, 80, 55)) +
      k.circle(470, 248, 5, hsl(140, 70, 45)),
  ),
  // Spatial programming: falling sand made of coloured cells.
  talk(
    'eQgxFuw8f1U',
    40,
    (k) => {
      const R = k.rand
      let cells = ''
      for (let c = 0; c < 18; c++) {
        const h = Math.round(4 + Math.sin(c / 3) * 3 + R() * 2)
        for (let r = 0; r < h; r++)
          cells += k.rect(
            380 + c * 12,
            290 - r * 12,
            11,
            11,
            1,
            hsl(42 + R() * 12, 90, 56 + R() * 14),
          )
      }
      for (let i = 0; i < 10; i++)
        cells += k.rect(
          440 + Math.floor(R() * 6) * 12,
          60 + i * 16,
          11,
          11,
          1,
          hsl(45, 95, 66),
        )
      return (
        cells +
        k.rect(
          368,
          50,
          240,
          254,
          6,
          'none',
          'stroke="rgba(255,255,255,.4)" stroke-width="2"',
        )
      )
    },
    false,
  ),
  // TypeScript types running DOOM: a corridor on a CRT, in angle brackets.
  talk(
    '0mCsluv5FXA',
    15,
    (k) =>
      k.slab(380, 80, 190, 150, 14, {
        face: ['#3a3f48', '#16181c'],
        depth: 7,
      }) +
      k.screen(
        394,
        94,
        162,
        118,
        8,
        k.rect(394, 94, 162, 118, 0, hsl(15, 60, 18)) +
          k.poly(
            [
              [394, 94],
              [445, 135],
              [505, 135],
              [556, 94],
            ],
            hsl(0, 40, 30),
          ) +
          k.poly(
            [
              [394, 212],
              [445, 172],
              [505, 172],
              [556, 212],
            ],
            hsl(20, 40, 26),
          ) +
          k.rect(445, 135, 60, 37, 0, hsl(10, 70, 40)) +
          k.circle(475, 154, 9, hsl(30, 100, 60)),
      ) +
      k.glow(
        k.line(
          [
            [360, 120],
            [338, 150],
            [360, 180],
          ],
          hsl(205, 90, 62),
          8,
        ) +
          k.line(
            [
              [590, 120],
              [612, 150],
              [590, 180],
            ],
            hsl(205, 90, 62),
            8,
          ),
        5,
        0.8,
      ) +
      k.rect(450, 230, 50, 40, 0, '#2a2e35') +
      k.rect(420, 266, 110, 10, 4, '#2a2e35'),
  ),
  // FTL: a little ship mid-jump, warp streaks behind it.
  talk(
    'P4Um97AUqp4',
    230,
    (k) =>
      [0, 1, 2, 3, 4, 5]
        .map((i) =>
          k.line(
            [
              [300 + i * 8, 120 + i * 16],
              [420, 140 + i * 10],
            ],
            `rgba(200,230,255,${0.2 + i * 0.08})`,
            2,
          ),
        )
        .join('') +
      k.path(
        'M420 130h90l50 30-50 30h-90l-20-14v-32z',
        k.lin(0, 130, 0, 190, [
          [0, '#e9edf2'],
          [1, '#8d97a4'],
        ]),
      ) +
      k.rect(440, 146, 50, 28, 6, hsl(0, 70, 48)) +
      k.circle(530, 160, 8, hsl(195, 100, 70)) +
      k.glow(k.ellipse(400, 160, 14, 10, hsl(200, 100, 70)), 6, 1),
    false,
  ),
  // The Twilio demo: a phone ringing with a crowd's worth of waves.
  talk(
    '-VuXIgp9S7o',
    0,
    (k) =>
      k.slab(430, 70, 76, 150, 14, { face: ['#2b303b', '#0d0f14'], depth: 6 }) +
      k.screen(
        438,
        82,
        60,
        120,
        6,
        k.rect(438, 82, 60, 120, 0, hsl(140, 60, 40)) +
          k.orb(468, 130, 14, 140, 60),
      ) +
      [30, 52, 74]
        .map((r) =>
          k.path(
            `M${520 + r * 0.3} ${110 - r * 0.6}a${r} ${r} 0 0 1 0 ${r * 1.2}`,
            'none',
            `stroke="${hsl(0, 90, 65)}" stroke-width="4" stroke-linecap="round"`,
          ),
        )
        .join('') +
      [0, 1, 2, 3, 4, 5]
        .map(
          (i) =>
            k.circle(380 + i * 34, 270, 14, '#0a0b10') +
            k.rect(366 + i * 34, 282, 28, 30, 10, '#0a0b10'),
        )
        .join(''),
    false,
  ),
  // A laptop made from scratch: the board, the screen and a soldering iron.
  talk(
    'fks3PBodyiE',
    160,
    (k) =>
      `${
        k.slab(380, 90, 180, 116, 6, {
          face: ['#3a404c', '#161a20'],
          depth: 4,
        }) +
        k.screen(
          388,
          98,
          164,
          100,
          3,
          k.bars(398, 112, 140, 5, {
            colors: [hsl(160, 80, 60)],
            height: 4,
            lead: 13,
          }),
        ) +
        k.path('M366 214h208l10 30h-228z', hsl(150, 60, 30)) +
        [0, 1, 2, 3]
          .map((i) => k.rect(390 + i * 44, 220, 28, 14, 2, '#111'))
          .join('') +
        k.line(
          [
            [380, 226],
            [570, 226],
          ],
          hsl(45, 90, 60, 0.7),
          1.5,
        )
      }<g transform="rotate(-30 590 180)">${k.rect(584, 150, 12, 70, 5, hsl(40, 90, 50))}${k.rect(587, 220, 6, 34, 2, '#c9d0d9')}</g>`,
  ),
  // The big OOPs: a class hierarchy cracking at its root.
  talk(
    'wo84LFzx5nI',
    260,
    (k) => {
      const box = (x: number, y: number, w: number) =>
        k.slab(x, y, w, 40, 4, { face: ['#ffffff', '#d8dde6'], depth: 4 }) +
        k.rect(x, y + 13, w, 1.5, 0, '#9aa3ad') +
        k.rect(x + 8, y + 20, w * 0.6, 5, 2.5, ink)
      return (
        box(430, 60, 80) +
        [
          [370, 140],
          [460, 140],
          [550, 140],
        ]
          .map(
            ([x, y]) =>
              k.line(
                [
                  [470, 104],
                  [x + 30, y],
                ],
                'rgba(255,255,255,.55)',
                2,
              ) + box(x - 10, y, 80),
          )
          .join('') +
        [
          [340, 220],
          [420, 220],
          [520, 220],
        ]
          .map(
            ([x, y]) =>
              k.line(
                [
                  [x + 40, 184],
                  [x + 30, y],
                ],
                'rgba(255,255,255,.4)',
                2,
              ) + box(x, y, 64),
          )
          .join('') +
        k.glow(
          k.line(
            [
              [440, 60],
              [452, 76],
              [446, 84],
              [460, 100],
            ],
            hsl(0, 100, 62),
            3,
          ),
          4,
          1,
        )
      )
    },
    false,
  ),
]
