import { art, hsl, Kit } from '../kit'

/** Drift, a self-hosted Gist: pastes of code drifting on a current of
 *  light, the front one pinned open like a card on a corkboard. */
export default art(['blog:introducing-drift', 'project:drift'], () => {
  const k = new Kit({ hue: 190, hue2: 230, spot: [420, 160] })
  k.stage()
  k.add(
    k.curve(
      [
        [200, 280],
        [300, 240],
        [420, 270],
        [560, 220],
        [660, 240],
      ],
      hsl(190, 100, 70, 0.35),
      26,
      `filter="${k.blur(10)}"`,
    ),
    k.curve(
      [
        [200, 250],
        [320, 205],
        [440, 235],
        [560, 185],
        [660, 200],
      ],
      hsl(170, 100, 75, 0.25),
      14,
      `filter="${k.blur(6)}"`,
    ),
  )
  const paste = (
    x: number,
    y: number,
    w: number,
    h: number,
    rot: number,
    dark: boolean,
  ) =>
    `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})">${k.slab(
      x,
      y,
      w,
      h,
      8,
      {
        face: dark ? ['#20262f', '#0d1117'] : ['#ffffff', '#dfe5ec'],
        side: dark ? '#05070a' : '#7b8590',
        depth: 5,
      },
    )}${k.rect(
      x,
      y,
      w,
      18,
      0,
      dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)',
      `clip-path="${k.clip(k.rect(x, y, w, h, 8, '#fff'))}"`,
    )}${k.circle(x + 11, y + 9, 3, hsl(190, 90, 55))}${k.rect(
      x + 20,
      y + 6.5,
      50,
      5,
      2.5,
      dark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.25)',
    )}${k.bars(x + 12, y + 28, w - 24, Math.floor((h - 36) / 11), {
      colors: dark
        ? ['#ff7b72', '#79c0ff', '#d2a8ff', 'rgba(230,237,243,.7)']
        : ['#cf222e', '#0550ae', '#8250df', 'rgba(36,41,47,.5)'],
      indent: [0, 1, 2, 1, 0, 1],
      height: 4,
      lead: 11,
    })}</g>`
  k.add(
    paste(270, 150, 120, 96, -12, false),
    paste(500, 70, 110, 90, 10, false),
  )
  k.add(paste(355, 82, 170, 150, -4, true))
  // A paper boat riding the current.
  const bx = 300
  const by = 262
  k.add(
    k.poly(
      [
        [bx - 44, by - 6],
        [bx + 44, by - 6],
        [bx + 30, by + 14],
        [bx - 30, by + 14],
      ],
      k.lin(0, by - 6, 0, by + 14, [
        [0, '#ffffff'],
        [1, '#c9d2dc'],
      ]),
    ),
    k.poly(
      [
        [bx - 18, by - 6],
        [bx + 4, by - 52],
        [bx + 26, by - 6],
      ],
      '#f4f7fa',
    ),
    k.poly(
      [
        [bx + 4, by - 52],
        [bx + 26, by - 6],
        [bx + 8, by - 6],
      ],
      '#cdd5df',
    ),
    k.curve(
      [
        [bx - 60, by + 16],
        [bx, by + 22],
        [bx + 70, by + 14],
      ],
      hsl(190, 100, 80, 0.6),
      2.5,
    ),
  )
  k.add(k.sparkles(5, [300, 40, 300, 80]))
  return k.vignette().toString()
})
