import { art, hsl, Kit } from '../kit'

/** SortableJS for Vue 3, drag-and-drop lists: a stack of list cards with
 *  one lifted out by a grabbing hand, a glowing drop slot waiting below. */
export default art(['project:sortablejs-vue3'], () => {
  const k = new Kit({ hue: 150, hue2: 200, spot: [430, 140] })
  k.stage()
  const x = 320
  const card = (y: number, hue: number, lift = 0) =>
    k.slab(x + lift, y, 220, 38, 8, {
      face: ['#ffffff', '#dde3ea'],
      side: '#5d6672',
      depth: 5,
    }) +
    [0, 1, 2]
      .map(
        (i) =>
          k.circle(x + lift + 14, y + 12 + i * 7, 2, '#a3acb7') +
          k.circle(x + lift + 20, y + 12 + i * 7, 2, '#a3acb7'),
      )
      .join('') +
    k.rect(x + lift + 32, y + 12, 14, 14, 4, hsl(hue, 70, 52)) +
    k.rect(x + lift + 56, y + 16, 110, 6, 3, 'rgba(20,24,36,.4)')
  const list =
    card(128, 150) +
    k.rect(
      x,
      176,
      220,
      38,
      8,
      hsl(150, 100, 60, 0.12),
      `stroke="${hsl(150, 100, 70)}" stroke-width="2" stroke-dasharray="7 5"`,
    ) +
    card(224, 40) +
    card(266, 280)
  k.standing(`<g transform="translate(0 -6)">${list}</g>`, x + 110, 150)
  // The lifted card, tilted, with its shadow and the hand.
  k.add(
    k.rect(x + 50, 112, 220, 38, 8, 'rgba(0,0,0,.4)', `filter="${k.blur(8)}"`),
    `<g transform="rotate(-6 ${x + 140} 80)">${card(66, 200, 40)}</g>`,
  )
  const hx = x + 196
  const hy = 72
  k.add(
    k.path(
      `M${hx} ${hy + 10}c0-6 8-6 8 0v-4c0-6 8-6 8 0v2c0-6 8-6 8 0v4c0-5 7-5 7 0v14c0 12-8 20-18 20h-4c-9 0-14-6-17-12l-5-10c-2-5 4-8 7-4l6 7z`,
      '#fff',
      'stroke="#111" stroke-width="2.5" stroke-linejoin="round"',
    ),
  )
  k.add(
    k.glow(
      k.line(
        [
          [x + 240, 120],
          [x + 240, 170],
        ],
        hsl(150, 100, 75),
        3,
      ) +
        k.poly(
          [
            [x + 232, 166],
            [x + 248, 166],
            [x + 240, 178],
          ],
          hsl(150, 100, 75),
        ),
      4,
      0.7,
    ),
  )
  k.add(k.sparkles(4, [x + 40, 20, 200, 40]))
  return k.vignette().toString()
})
