import { art, hsl, Kit } from '../kit'

/** GitKV, a key-value store backed by a git repository: a big glossy key
 *  turning in a lock shaped like a commit node, and the history behind it
 *  holding every value it was ever set to. */
export default art(['lab:gitkv'], () => {
  const k = new Kit({ hue: 20, hue2: 260, spot: [430, 140] })
  k.stage()
  // History: a commit line with value cards.
  const ly = 90
  k.add(
    k.line(
      [
        [280, ly],
        [600, ly],
      ],
      hsl(20, 90, 65, 0.6),
      4,
    ),
  )
  k.add(
    ...[0, 1, 2, 3, 4].map(
      (i) =>
        k.orb(300 + i * 72, ly, 9, 20 + i * 8, 56) +
        k.rect(
          300 + i * 72 - 22,
          ly + 18,
          44,
          24,
          5,
          i === 4 ? hsl(20, 90, 62) : 'rgba(255,255,255,.18)',
          'stroke="rgba(255,255,255,.4)" stroke-width="1"',
        ),
    ),
  )
  // The lock: a big commit node with a keyhole.
  const cx = 470
  const cy = 216
  const lock =
    k.orb(cx, cy, 62, 20, 56) +
    k.circle(cx, cy - 10, 12, '#1a0c06') +
    k.path(`M${cx - 7} ${cy - 2}h14l6 32h-26z`, '#1a0c06')
  k.standing(`<g transform="translate(0 26)">${lock}</g>`, cx, 70)
  // The key.
  const key =
    k.circle(
      330,
      242,
      34,
      k.lin(296, 208, 364, 276, [
        [0, hsl(48, 100, 72)],
        [1, hsl(36, 90, 42)],
      ]),
      'stroke="rgba(255,255,255,.6)" stroke-width="2"',
    ) +
    k.circle(330, 242, 13, 'rgba(0,0,0,.6)') +
    k.rect(
      360,
      234,
      96,
      16,
      4,
      k.lin(0, 234, 0, 250, [
        [0, hsl(48, 100, 72)],
        [1, hsl(36, 90, 40)],
      ]),
    ) +
    k.rect(420, 250, 10, 16, 2, hsl(40, 90, 50)) +
    k.rect(438, 250, 10, 22, 2, hsl(40, 90, 50)) +
    k.ellipse(316, 226, 12, 6, 'rgba(255,255,255,.6)')
  k.add(
    k.ellipse(380, 302, 90, 7, 'rgba(0,0,0,.45)', `filter="${k.blur(5)}"`),
    `<g transform="rotate(-6 400 242)">${key}</g>`,
  )
  k.add(k.sparkles(4, [500, 140, 100, 50]))
  return k.vignette().toString()
})
