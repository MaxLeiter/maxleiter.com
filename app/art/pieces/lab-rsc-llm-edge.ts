import { art, hsl, Kit } from '../kit'

/** Streaming LLM responses from server components at the edge: a server
 *  rack on a cliff's edge pouring a stream of component blocks down to a
 *  browser window waiting below. */
export default art(['lab:rsc-llm-edge'], () => {
  const k = new Kit({ hue: 280, hue2: 230, spot: [430, 130] })
  k.stage()
  // The ledge.
  k.add(
    k.path(
      'M240 120h170l-14 184h-156z',
      k.lin(240, 0, 410, 0, [
        [0, hsl(260, 30, 26)],
        [1, hsl(260, 30, 16)],
      ]),
    ),
    k.rect(240, 116, 176, 8, 3, hsl(260, 30, 40)),
  )
  // A rack on top.
  k.add(
    k.slab(290, 40, 76, 78, 6, {
      face: ['#3a404c', '#14171d'],
      side: '#06070a',
      depth: 4,
    }),
    ...[0, 1, 2].map(
      (i) =>
        k.rect(298, 48 + i * 22, 60, 14, 3, '#0c0e12') +
        k.circle(350, 55 + i * 22, 3, hsl(280, 100, 70)) +
        k.rect(304, 53 + i * 22, 28, 4, 2, 'rgba(255,255,255,.3)'),
    ),
  )
  // The stream falling off the edge.
  const pts: [number, number][] = [
    [370, 90],
    [430, 96],
    [470, 140],
    [490, 190],
  ]
  k.add(k.glow(k.curve(pts, hsl(280, 100, 72, 0.6), 14), 10, 0.6))
  const hues = [280, 200, 330, 50, 160]
  k.add(
    ...[
      [400, 90],
      [436, 102],
      [462, 128],
      [478, 156],
      [488, 184],
    ].map(
      ([x, y], i) =>
        `<g transform="rotate(${i * 14} ${x} ${y})">${k.slab(x - 12, y - 9, 24, 18, 4, { face: [hsl(hues[i], 85, 66), hsl(hues[i], 80, 44)], depth: 3 })}</g>`,
    ),
  )
  // The browser.
  const bx = 420
  const by = 212
  k.standing(
    k.window(bx, by, 160, 92, {
      bar: '#e9edf3',
      body: '#f7f9fc',
      content:
        k.rect(bx + 10, by + 24, 60, 26, 5, hsl(280, 80, 66)) +
        k.rect(bx + 76, by + 24, 74, 26, 5, hsl(200, 80, 62)) +
        k.rect(bx + 10, by + 58, 140, 10, 5, hsl(330, 80, 68, 0.5)) +
        k.rect(bx + 10, by + 74, 60, 8, 4, 'rgba(20,24,36,.2)'),
    }),
    bx + 80,
    90,
  )
  k.add(k.sparkles(4, [460, 40, 140, 60]))
  return k.vignette().toString()
})
