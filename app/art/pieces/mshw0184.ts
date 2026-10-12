import { art, FLOOR, hsl, Kit } from '../kit'

/** Ambient light support on Linux: a kickstand tablet whose light sensor
 *  drinks in a sunbeam, the screen brightening from its sensor outward, and
 *  the sensor's little I2C chip lit up on a trace beside it. */
export default art(
  ['blog:MSHW0184', 'project:mshw0184-driver-for-linux-kernel'],
  () => {
    const k = new Kit({ hue: 45, hue2: 210, spot: [470, 110] })
    k.stage()
    // Sunbeam from the upper right.
    k.add(
      k.poly(
        [
          [640, -20],
          [700, 40],
          [470, 112],
          [458, 100],
        ],
        hsl(50, 100, 80, 0.22),
        `filter="${k.blur(6)}"`,
      ),
      k.orb(590, 50, 32, 45, 66),
      k.circle(590, 50, 52, hsl(45, 100, 70, 0.3), `filter="${k.blur(14)}"`),
    )
    const x = 300
    const y = 104
    const w = 280
    const h = 180
    const screen =
      k.rect(
        x,
        y,
        w,
        h,
        0,
        k.rad(x + w * 0.6, y, w, [
          [0, hsl(205, 70, 78)],
          [0.6, hsl(220, 60, 38)],
          [1, hsl(230, 50, 18)],
        ]),
      ) +
      k.window(x + 20, y + 24, 140, 96, {
        bar: '#e9edf2',
        body: '#f8f9fb',
        content: k.bars(x + 30, y + 50, 120, 5, {
          colors: ['rgba(20,24,36,.35)'],
          height: 4,
          lead: 12,
        }),
      }) +
      // A brightness slider.
      k.rect(x + 180, y + 140, 84, 8, 4, 'rgba(255,255,255,.3)') +
      k.rect(x + 180, y + 140, 62, 8, 4, hsl(45, 100, 64)) +
      k.circle(x + 242, y + 144, 8, '#fff')
    const tablet =
      k.poly(
        [
          [x + w * 0.62, y + h],
          [x + w * 0.74, y + 20],
          [x + w * 0.86, FLOOR],
          [x + w * 0.6, FLOOR],
        ],
        '#1d2028',
      ) +
      k.slab(x - 12, y - 12, w + 24, h + 24, 10, {
        face: ['#c9ced6', '#7c838e'],
        side: '#3a3f47',
        depth: 6,
      }) +
      k.screen(x, y, w, h, 3, screen) +
      k.circle(x + w * 0.62, y - 6, 3, '#111') +
      k.glow(k.circle(x + w * 0.62 + 10, y - 6, 2.5, hsl(50, 100, 70)), 4, 1)
    k.standing(tablet, x + w / 2, 170)
    // The chip.
    const cx = 250
    const cy = 236
    k.add(
      k.line(
        [
          [cx + 30, cy + 10],
          [cx + 46, cy + 10],
          [cx + 46, cy - 46],
          [x - 2, cy - 46],
        ],
        hsl(45, 100, 65, 0.8),
        3,
      ),
      k.slab(cx - 30, cy - 20, 60, 46, 4, {
        face: ['#2a2e36', '#101216'],
        side: '#050607',
        depth: 4,
      }),
      ...[0, 1, 2, 3].map(
        (i) =>
          k.rect(cx - 24 + i * 14, cy + 26, 6, 10, 1, '#b8bec7') +
          k.rect(cx - 24 + i * 14, cy - 30, 6, 10, 1, '#b8bec7'),
      ),
      k.circle(cx - 18, cy - 10, 3, 'rgba(255,255,255,.35)'),
    )
    k.add(k.sparkles(4, [460, 70, 140, 60]))
    return k.vignette().toString()
  },
)
