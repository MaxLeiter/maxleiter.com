import { art, hsl, Kit } from '../kit'

/** gboy.ts, a handheld game console emulator written in TypeScript: a
 *  chunky, generic handheld standing on the stage, its green screen showing
 *  a tiny platformer frame mid-jump. */
export default art(['lab:gboy-ts'], () => {
  const k = new Kit({ hue: 135, hue2: 250, spot: [430, 120] })
  k.stage()
  const x = 360
  const y = 36
  const w = 160
  const h = 262
  const sx = x + 22
  const sy = y + 24
  const sw = w - 44
  const sh = 96
  const lcd = [
    hsl(90, 45, 70),
    hsl(95, 40, 52),
    hsl(100, 40, 34),
    hsl(110, 40, 18),
  ]
  const frame =
    k.rect(sx, sy, sw, sh, 0, lcd[0]) +
    k.rect(sx, sy + sh - 18, sw, 18, 0, lcd[2]) +
    k.rect(sx + 20, sy + sh - 30, 24, 12, 0, lcd[2]) +
    k.rect(sx + 70, sy + sh - 44, 30, 8, 0, lcd[2]) +
    k.circle(sx + 86, sy + 24, 8, lcd[1]) +
    // The hero mid-jump.
    k.rect(sx + 50, sy + 40, 10, 10, 0, lcd[3]) +
    k.rect(sx + 48, sy + 50, 14, 10, 0, lcd[3]) +
    k.rect(sx + 46, sy + 60, 6, 4, 0, lcd[3]) +
    k.rect(sx + 58, sy + 60, 6, 4, 0, lcd[3]) +
    k.rect(sx + 30, sy + 30, 6, 6, 0, lcd[2])
  const device =
    k.path(
      `M${x} ${y + 14}q0-14 14-14h${w - 28}q14 0 14 14v${h - 40}q0 26-40 26h-${w - 54}q-14 0-14-14z`,
      k.lin(x, y, x + w, y + h, [
        [0, hsl(175, 55, 62)],
        [1, hsl(190, 60, 36)],
      ]),
    ) +
    k.gloss(
      k.path(
        `M${x} ${y + 14}q0-14 14-14h${w - 28}q14 0 14 14v${h - 40}q0 26-40 26h-${w - 54}q-14 0-14-14z`,
        '#fff',
      ),
      y,
      h,
      0.25,
    ) +
    k.rect(sx - 10, sy - 10, sw + 20, sh + 26, 8, '#4a4a56') +
    k.screen(sx, sy, sw, sh, 2, frame) +
    k.circle(sx - 4, sy + 30, 3, hsl(0, 90, 55)) +
    // D-pad and buttons.
    k.rect(x + 22, y + 176, 42, 14, 3, '#2a2a30') +
    k.rect(x + 36, y + 162, 14, 42, 3, '#2a2a30') +
    k.orb(x + 112, y + 188, 11, 330, 46) +
    k.orb(x + 136, y + 172, 11, 330, 46) +
    k.rect(x + 54, y + 222, 22, 6, 3, '#6a6670') +
    k.rect(x + 84, y + 222, 22, 6, 3, '#6a6670') +
    [0, 1, 2, 3]
      .map((i) =>
        k.line(
          [
            [x + 110 + i * 8, y + 248],
            [x + 118 + i * 8, y + 236],
          ],
          '#8a857c',
          2.5,
        ),
      )
      .join('')
  k.standing(device, x + w / 2, 100)
  k.add(k.sparkles(4, [520, 40, 90, 120]))
  return k.vignette().toString()
})
