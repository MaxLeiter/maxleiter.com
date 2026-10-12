/**
 * A damped spring, integrated with semi-implicit Euler at a fixed 1/240 s
 * substep so its feel does not depend on the display's frame rate.
 *
 * One float drives every blade: `layout()` in ../blades.ts maps the spring's
 * position onto each blade's translate, hinge swing and shade.
 */
export class Spring {
  x: number
  v = 0
  target: number

  constructor(
    x: number,
    readonly k = 190,
    readonly c = 21,
  ) {
    this.x = x
    this.target = x
  }

  private step(dt: number): void {
    const a = this.k * (this.target - this.x) - this.c * this.v
    this.v += a * dt
    this.x += this.v * dt
  }

  /** A rAF timestamp can predate a `performance.now()` taken just before. */
  advance(dt: number): void {
    if (!(dt > 0)) return
    let n = Math.ceil(dt * 240)
    const h = dt / n
    while (n-- > 0) this.step(h)
  }

  get settled(): boolean {
    return Math.abs(this.v) < 2e-3 && Math.abs(this.target - this.x) < 5e-4
  }

  snap(): void {
    this.x = this.target
    this.v = 0
  }
}

/**
 * The same integrator sampled into a CSS `linear()` easing, so the list's
 * transitions and the reader's view transition share the blades' feel.
 */
export function springEasing(): string {
  const s = new Spring(0, 210, 19)
  s.target = 1
  const points: number[] = []
  for (let i = 0; i <= 60; i++) {
    points.push(Number(s.x.toFixed(4)))
    s.advance((1 / 60) * 0.9)
  }
  points[points.length - 1] = 1
  return `linear(${points.join(',')})`
}

export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v))
