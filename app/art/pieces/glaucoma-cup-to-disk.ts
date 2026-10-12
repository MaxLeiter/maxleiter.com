import { art, hsl, Kit } from '../kit'

/** Grading the vertical cup-to-disk ratio from retinal photographs: a
 *  fundus image -- the warm retina, its veins, the pale optic disc and the
 *  brighter cup inside it -- with the grader's two measuring rings and the
 *  vertical calipers laid over it. */
export default art(
  [
    'project:accuracy-of-computer-assisted-vertical-cup-to-disk-ratio-grading-for-glaucoma-screening',
  ],
  () => {
    const k = new Kit({ hue: 15, hue2: 240, spot: [430, 150], floor: false })
    k.stage()
    const cx = 430
    const cy = 190
    const R = 150
    const eye = k.circle(cx, cy, R, '#fff')
    const c = k.clip(eye)
    const veins = [
      [
        [470, 180],
        [520, 120],
        [560, 90],
        [600, 80],
      ],
      [
        [470, 200],
        [530, 250],
        [570, 300],
        [600, 330],
      ],
      [
        [460, 172],
        [430, 110],
        [380, 70],
        [330, 56],
      ],
      [
        [460, 208],
        [420, 270],
        [360, 320],
      ],
      [
        [470, 190],
        [400, 180],
        [330, 196],
        [290, 190],
      ],
    ] as [number, number][][]
    k.add(
      k.circle(cx, cy, R + 14, '#0b0507'),
      `<g clip-path="${c}">${k.rect(
        cx - R,
        cy - R,
        R * 2,
        R * 2,
        0,
        k.rad(cx + 30, cy, R * 1.1, [
          [0, hsl(28, 95, 58)],
          [0.6, hsl(14, 85, 42)],
          [1, hsl(5, 80, 18)],
        ]),
      )}${veins
        .map(
          (v) =>
            k.curve(v, hsl(355, 80, 28), 5) +
            k.curve(v, hsl(355, 90, 45, 0.7), 2),
        )
        .join('')}${k.circle(
        cx + 40,
        cy,
        40,
        k.rad(cx + 40, cy, 40, [
          [0, hsl(48, 100, 88)],
          [0.7, hsl(38, 90, 70)],
          [1, hsl(30, 80, 56)],
        ]),
      )}${k.ellipse(cx + 44, cy, 17, 22, hsl(55, 100, 95))}</g>`,
      k.circle(
        cx,
        cy,
        R,
        'none',
        'stroke="rgba(255,255,255,.18)" stroke-width="2"',
      ),
    )
    // The grader's overlay.
    const ov = hsl(185, 100, 70)
    k.add(
      k.glow(
        k.ellipse(
          cx + 40,
          cy,
          42,
          42,
          'none',
          `stroke="${ov}" stroke-width="2.5"`,
        ) +
          k.ellipse(
            cx + 44,
            cy,
            19,
            24,
            'none',
            `stroke="${hsl(60, 100, 70)}" stroke-width="2.5" stroke-dasharray="5 4"`,
          ),
        3,
        0.9,
      ),
      k.line(
        [
          [cx + 100, cy - 42],
          [cx + 100, cy + 42],
        ],
        ov,
        2,
      ),
      k.line(
        [
          [cx + 92, cy - 42],
          [cx + 108, cy - 42],
        ],
        ov,
        2,
      ),
      k.line(
        [
          [cx + 92, cy + 42],
          [cx + 108, cy + 42],
        ],
        ov,
        2,
      ),
      k.line(
        [
          [cx + 120, cy - 24],
          [cx + 120, cy + 24],
        ],
        hsl(60, 100, 70),
        2,
      ),
      k.line(
        [
          [cx + 112, cy - 24],
          [cx + 128, cy - 24],
        ],
        hsl(60, 100, 70),
        2,
      ),
      k.line(
        [
          [cx + 112, cy + 24],
          [cx + 128, cy + 24],
        ],
        hsl(60, 100, 70),
        2,
      ),
    )
    k.add(k.sparkles(3, [560, 40, 60, 60]))
    return k.vignette().toString()
  },
)
