import { art, FLOOR, hsl, Kit } from '../kit'

/** The profile card is a character-select screen: the same cartoon as the
 *  top bar's picture, drawn large on a lit pedestal, with a controller
 *  hovering beside him and "player one" stars overhead. */
export default art(['profile:max-leiter'], () => {
  const k = new Kit({ hue: 205, hue2: 240, spot: [430, 120] })
  k.stage()
  const cx = 430
  // Pedestal.
  const ped =
    k.ellipse(
      cx,
      FLOOR - 4,
      120,
      26,
      k.lin(0, FLOOR - 30, 0, FLOOR + 20, [
        [0, hsl(205, 30, 40)],
        [1, hsl(205, 30, 16)],
      ]),
    ) +
    k.ellipse(
      cx,
      FLOOR - 14,
      120,
      26,
      k.lin(0, FLOOR - 40, 0, FLOOR + 10, [
        [0, hsl(205, 50, 70)],
        [1, hsl(205, 40, 40)],
      ]),
    ) +
    k.ellipse(
      cx,
      FLOOR - 14,
      120,
      26,
      'none',
      `stroke="${hsl(190, 100, 80, 0.8)}" stroke-width="2"`,
    )
  // The character: same proportions and palette as the avatar, at 4x.
  const s = 2.3
  const ox = cx - 48 * s
  const oy = FLOOR - 22 - 100 * s
  const P = (x: number) => ox + x * s
  const Q = (y: number) => oy + y * s
  const body = `${
    k.path(
      `M${P(7.7)} ${Q(100)}a${40.3 * s} ${30.7 * s} 0 0 1 ${80.6 * s} 0z`,
      k.lin(0, Q(70), 0, Q(100), [
        [0, hsl(14, 80, 60)],
        [1, hsl(10, 70, 40)],
      ]),
    ) +
    k.ellipse(
      P(48),
      Q(48),
      25 * s,
      27.8 * s,
      k.rad(P(42), Q(40), 34 * s, [
        [0, '#f6d4b6'],
        [1, '#e2a984'],
      ]),
    ) +
    k.path(
      `M${P(20.2)} ${Q(34.6)}a${27.8 * s} ${19.2 * s} 0 0 1 ${55.6 * s} 0z`,
      '#3a2a22',
    )
  }<ellipse cx="${P(41.3)}" cy="${Q(28.8)}" rx="${19.2 * s}" ry="${9.6 * s}" transform="rotate(-22.9 ${P(41.3)} ${Q(28.8)})" fill="#3a2a22"/>${k.ellipse(
    P(39.4),
    Q(49.9),
    2.9 * s,
    4.3 * s,
    '#1a1a1a',
  )}${k.ellipse(
    P(56.6),
    Q(49.9),
    2.9 * s,
    4.3 * s,
    '#1a1a1a',
  )}${k.circle(P(38.4), Q(48.2), 1 * s, '#fff')}${k.circle(
    P(55.6),
    Q(48.2),
    1 * s,
    '#fff',
  )}${k.path(
    `M${P(54.4)} ${Q(59.6)}a${6.7 * s} ${6.7 * s} 0 0 1 ${-12.8 * s} 0`,
    'none',
    `stroke="#8a4a3a" stroke-width="${2.4 * s}" stroke-linecap="round"`,
  )}${k.ellipse(P(32), Q(56), 4 * s, 2.4 * s, 'rgba(240,120,110,.35)')}${k.ellipse(P(64), Q(56), 4 * s, 2.4 * s, 'rgba(240,120,110,.35)')}`
  k.standing(ped + body, cx, 130, 0.25)
  // Controller, floating to the right.
  const gx = 580
  const gy = 150
  k.add(
    `<g transform="rotate(14 ${gx} ${gy})">${k.path(
      `M${gx - 44} ${gy - 14}q4-14 20-14h48q16 0 20 14l8 30q4 16-10 18q-10 2-18-10l-6-8h-36l-6 8q-8 12-18 10q-14-2-10-18z`,
      k.lin(0, gy - 30, 0, gy + 36, [
        [0, '#f2f4f7'],
        [1, '#9aa3ae'],
      ]),
      'stroke="rgba(255,255,255,.7)" stroke-width="1.5"',
    )}${k.rect(gx - 32, gy - 6, 18, 6, 2, '#2a2f38')}${k.rect(
      gx - 26,
      gy - 12,
      6,
      18,
      2,
      '#2a2f38',
    )}${k.circle(gx + 20, gy - 8, 4.5, hsl(0, 80, 55))}${k.circle(gx + 30, gy - 2, 4.5, hsl(140, 70, 45))}${k.circle(gx + 10, gy - 2, 4.5, hsl(210, 80, 55))}${k.circle(
      gx + 20,
      gy + 4,
      4.5,
      hsl(45, 90, 55),
    )}</g>`,
  )
  k.add(
    k.sparkle(cx - 30, 40, 9, hsl(50, 100, 80)),
    k.sparkle(cx, 30, 12, hsl(50, 100, 85)),
    k.sparkle(cx + 30, 40, 9, hsl(50, 100, 80)),
  )
  return k.vignette().toString()
})
