/**
 * The ambient background: drifting bokeh and slow light ribbons in the active
 * blade's colour, drawn at half resolution.
 *
 * It runs in a worker on an OffscreenCanvas where it can, so the blade swing
 * never shares a frame budget with it, and on the main thread otherwise. The
 * worker is built from this module's own functions (`String(fn)`), which is
 * why `createRenderer` and `workerMain` close over nothing: every name they
 * use is a parameter, a local or a global.
 *
 * Loaded with a dynamic import by the island, after the dashboard is already
 * interactive.
 */

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
type RGB = readonly [number, number, number]

interface Renderer {
  resize(w: number, h: number): void
  setColor(c: RGB, jump: boolean): void
  frame(dt: number): void
}

function createRenderer(ctx: Ctx2D): Renderer {
  let W = 1
  let H = 1
  let t = 0
  let cur = [120, 220, 60]
  let tgt = [120, 220, 60]
  let s = 1234567
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const ribbons = Array.from({ length: 7 }, (_, i) => ({
    y: 0.16 + i * 0.105 + rnd() * 0.05,
    a: 0.05 + rnd() * 0.11,
    f: 0.45 + rnd() * 0.9,
    sp: 0.018 + rnd() * 0.04,
    p: rnd() * 6.283,
    th: 0.018 + rnd() * 0.05,
    f2: 1.4 + rnd() * 2.2,
    sp2: 0.02 + rnd() * 0.05,
    white: rnd() * 0.6,
    al: 0.14 + rnd() * 0.18,
  }))
  const orbs = Array.from({ length: 22 }, () => ({
    x: rnd(),
    y: rnd(),
    r: 0.015 + rnd() * rnd() * 0.11,
    vx: (rnd() - 0.5) * 0.012,
    vy: -(0.004 + rnd() * 0.01),
    a: 0.05 + rnd() * 0.16,
    ph: rnd() * 6.283,
  }))
  const mix = (a: number[], b: number[], k: number) =>
    a.map((v, i) => Math.round(v + (b[i] - v) * k))
  const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
  return {
    resize(w, h) {
      W = ctx.canvas.width = Math.max(1, w | 0)
      H = ctx.canvas.height = Math.max(1, h | 0)
    },
    setColor(c, jump) {
      tgt = [...c]
      if (jump) cur = [...c]
    },
    frame(dt) {
      t += dt
      const k = Math.min(1, dt * 2.2)
      for (let i = 0; i < 3; i++) cur[i] += (tgt[i] - cur[i]) * (dt ? k : 1)
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'
      const tint = mix(cur, [255, 255, 255], 0.35)
      for (const o of orbs) {
        o.x += o.vx * dt
        o.y += o.vy * dt
        if (o.y < -0.15) {
          o.y = 1.15
          o.x = Math.random()
        }
        if (o.x < -0.15) o.x = 1.15
        if (o.x > 1.15) o.x = -0.15
        const x = o.x * W
        const y = o.y * H
        const r = o.r * H * (1 + 0.15 * Math.sin(t * 0.7 + o.ph))
        const a = o.a * (0.7 + 0.3 * Math.sin(t * 0.9 + o.ph))
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, rgba(tint, a))
        g.addColorStop(0.55, rgba(tint, a * 0.35))
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, r, 0, 6.2832)
        ctx.fill()
      }
      // Each ribbon: an asymmetric band, then a bright core line along it.
      const step = W / 56
      for (const rb of ribbons) {
        const top: number[] = []
        const bot: number[] = []
        for (let x = -step; x <= W + step; x += step) {
          const u = x / W
          const y =
            H *
            (rb.y +
              rb.a * Math.sin(u * rb.f * 6.283 + t * rb.sp * 6.283 + rb.p) +
              0.028 * Math.sin(u * rb.f2 * 6.283 - t * rb.sp2 * 6.283))
          const th =
            H *
            rb.th *
            (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(u * 2.6 + t * 0.21 + rb.p)))
          top.push(x, y - th)
          bot.push(x, y + th * 0.35)
        }
        const c = mix(cur, [255, 255, 255], rb.white)
        const g = ctx.createLinearGradient(0, 0, W, 0)
        g.addColorStop(0, rgba(c, 0))
        g.addColorStop(0.3, rgba(c, rb.al))
        g.addColorStop(0.7, rgba(c, rb.al * 0.8))
        g.addColorStop(1, rgba(c, 0))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(top[0], top[1])
        for (let i = 2; i < top.length; i += 2) ctx.lineTo(top[i], top[i + 1])
        for (let i = bot.length - 2; i >= 0; i -= 2) {
          ctx.lineTo(bot[i], bot[i + 1])
        }
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = `rgba(255,255,255,${rb.al * 0.9})`
        ctx.lineWidth = Math.max(1, H / 500)
        ctx.beginPath()
        ctx.moveTo(bot[0], bot[1])
        for (let i = 2; i < bot.length; i += 2) ctx.lineTo(bot[i], bot[i + 1])
        ctx.stroke()
      }
    },
  }
}

type Message =
  | {
      type: 'init'
      canvas: OffscreenCanvas
      w: number
      h: number
      color: RGB
      still: boolean
    }
  | { type: 'resize'; w: number; h: number }
  | { type: 'color'; color: RGB }
  | { type: 'still'; still: boolean }

/** The worker's whole program. Serialized with `String()`; see the docblock. */
function workerMain(create: typeof createRenderer): void {
  const scope = self as unknown as {
    onmessage: ((event: MessageEvent<Message>) => void) | null
    requestAnimationFrame?: (cb: (now: number) => void) => number
  }
  let r: Renderer | null = null
  let still = false
  let last = 0
  const raf = (cb: (now: number) => void) =>
    scope.requestAnimationFrame
      ? scope.requestAnimationFrame(cb)
      : setTimeout(() => cb(performance.now()), 16)
  const loop = (now: number) => {
    const dt = last ? Math.max(0, Math.min(0.05, (now - last) / 1000)) : 0.016
    last = now
    r?.frame(dt)
    if (!still) raf(loop)
    else last = 0
  }
  scope.onmessage = (event) => {
    const m = event.data
    if (m.type === 'init') {
      const ctx = m.canvas.getContext('2d')
      if (!ctx) return
      r = create(ctx)
      r.resize(m.w, m.h)
      r.setColor(m.color, true)
      still = m.still
      r.frame(0.016)
      if (!still) raf(loop)
    } else if (!r) {
      // A message before init; nothing to draw on yet.
    } else if (m.type === 'resize') {
      r.resize(m.w, m.h)
      r.frame(0)
    } else if (m.type === 'color') {
      r.setColor(m.color, still)
      if (still) r.frame(0)
    } else {
      const was = still
      still = m.still
      if (was && !still) raf(loop)
      else r.frame(0)
    }
  }
}

export interface Ambient {
  color(c: RGB): void
  resize(): void
  still(on: boolean): void
  dispose(): void
}

/** Half resolution, capped at 1.5x density: it is a blur behind glass. */
function size(): [number, number] {
  const k = Math.min(devicePixelRatio || 1, 1.5) * 0.5
  return [innerWidth * k, innerHeight * k]
}

export function startAmbient(
  canvas: HTMLCanvasElement,
  color: RGB,
  still: boolean,
): Ambient {
  if (typeof canvas.transferControlToOffscreen === 'function') {
    try {
      const source = `(${String(workerMain)})(${String(createRenderer)})`
      const url = URL.createObjectURL(
        new Blob([source], { type: 'text/javascript' }),
      )
      const worker = new Worker(url)
      URL.revokeObjectURL(url)
      const off = canvas.transferControlToOffscreen()
      const [w, h] = size()
      worker.postMessage({ type: 'init', canvas: off, w, h, color, still }, [
        off,
      ])
      canvas.dataset.mode = 'worker'
      const post = (m: Message) => worker.postMessage(m)
      return {
        color: (c) => post({ type: 'color', color: c }),
        resize: () => {
          const [w2, h2] = size()
          post({ type: 'resize', w: w2, h: h2 })
        },
        still: (on) => post({ type: 'still', still: on }),
        dispose: () => worker.terminate(),
      }
    } catch {
      // A worker the page cannot start (a blocked blob: URL); draw here.
    }
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    const noop = () => undefined
    return { color: noop, resize: noop, still: noop, dispose: noop }
  }
  const r = createRenderer(ctx)
  const [w, h] = size()
  r.resize(w, h)
  r.setColor(color, true)
  r.frame(0.016)
  canvas.dataset.mode = 'main'
  let frozen = still
  let raf = 0
  let last = 0
  const loop = (now: number) => {
    const dt = last ? Math.max(0, Math.min(0.05, (now - last) / 1000)) : 0.016
    last = now
    r.frame(dt)
    if (!frozen) raf = requestAnimationFrame(loop)
    else last = 0
  }
  if (!frozen) raf = requestAnimationFrame(loop)
  return {
    color: (c) => {
      r.setColor(c, frozen)
      if (frozen) r.frame(0)
    },
    resize: () => {
      const [w2, h2] = size()
      r.resize(w2, h2)
      r.frame(0)
    },
    still: (on) => {
      const was = frozen
      frozen = on
      if (was && !on) raf = requestAnimationFrame(loop)
    },
    dispose: () => cancelAnimationFrame(raf),
  }
}
