import { art, hsl, Kit } from '../kit'

/** Sending a chat message with plain fetch: a message assembled from
 *  stacked blocks -- header, section, button -- launched off as a paper
 *  plane on a dotted flight path toward the channel it posts to. */
export default art(['note:slack-message-fetch'], () => {
  const k = new Kit({ hue: 290, hue2: 220, spot: [430, 140] })
  k.stage()
  // The message, made of blocks.
  const mx = 290
  const my = 120
  const msg =
    k.bubble(mx, my, 190, 140, ['#ffffff', '#e2e6ee']) +
    k.slab(mx + 14, my + 14, 162, 26, 5, {
      face: [hsl(290, 70, 58), hsl(280, 60, 40)],
      depth: 3,
    }) +
    k.rect(
      mx + 14,
      my + 50,
      162,
      40,
      5,
      '#f2f4f8',
      'stroke="#d3d8e0" stroke-width="1.5"',
    ) +
    k.bars(mx + 22, my + 58, 140, 2, {
      colors: ['rgba(30,40,60,.4)'],
      height: 5,
      lead: 13,
    }) +
    k.slab(mx + 14, my + 100, 74, 24, 12, {
      face: [hsl(150, 70, 52), hsl(155, 70, 36)],
      depth: 3,
    }) +
    k.slab(mx + 96, my + 100, 74, 24, 12, {
      face: ['#fdfdff', '#d8dde6'],
      depth: 3,
    })
  k.standing(`<g transform="translate(0 6)">${msg}</g>`, mx + 95, 120, 0.25)
  // The flight path and the plane.
  k.add(
    k.curve(
      [
        [mx + 170, my + 10],
        [500, 70],
        [560, 90],
        [590, 60],
      ],
      'rgba(255,255,255,.55)',
      2.5,
      'stroke-dasharray="2 8"',
    ),
  )
  const px = 520
  const py = 48
  k.add(
    k.poly(
      [
        [px - 50, py + 30],
        [px + 46, py - 10],
        [px - 4, py + 46],
      ],
      '#ffffff',
    ),
    k.poly(
      [
        [px - 4, py + 46],
        [px + 46, py - 10],
        [px + 2, py + 30],
      ],
      '#c7cdd8',
    ),
    k.poly(
      [
        [px - 50, py + 30],
        [px + 46, py - 10],
        [px - 14, py + 36],
      ],
      '#e9edf3',
    ),
  )
  // The hash of the channel, as a glossy badge.
  k.add(
    k.orb(590, 150, 26, 290, 56),
    k.line(
      [
        [582, 138],
        [578, 164],
      ],
      '#fff',
      4,
    ),
    k.line(
      [
        [598, 138],
        [594, 164],
      ],
      '#fff',
      4,
    ),
    k.line(
      [
        [574, 146],
        [604, 146],
      ],
      '#fff',
      4,
    ),
    k.line(
      [
        [572, 156],
        [602, 156],
      ],
      '#fff',
      4,
    ),
  )
  k.add(k.sparkles(4, [320, 30, 180, 60]))
  return k.vignette().toString()
})
