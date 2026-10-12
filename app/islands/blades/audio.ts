/**
 * Interface sound, all synthesized: band-passed noise swishes panned with the
 * direction of travel, FM bells, and a convolution reverb whose impulse
 * response is generated noise. Nothing is sampled, so nothing is fetched.
 *
 * Loaded only when the visitor turns sound on, which is also the user gesture
 * an AudioContext needs before it may start.
 */

type Bus = { g: GainNode; p: StereoPannerNode | null }

export class Synth {
  private ctx: AudioContext
  private master: GainNode
  private verb: ConvolverNode
  private noise: AudioBuffer

  constructor(ctx: AudioContext) {
    this.ctx = ctx
    const out = ctx.createDynamicsCompressor()
    out.threshold.value = -14
    out.ratio.value = 4
    out.connect(ctx.destination)
    this.master = ctx.createGain()
    this.master.gain.value = 0.55
    this.master.connect(out)

    // A stereo impulse: exponentially decaying noise, darker towards the tail.
    const len = ctx.sampleRate * 2.6
    const ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch)
      let lp = 0
      for (let i = 0; i < len; i++) {
        const t = i / len
        lp += (Math.random() * 2 - 1 - lp) * (0.9 - t * 0.75)
        d[i] = lp * Math.pow(1 - t, 3.2) * (i < 90 ? i / 90 : 1)
      }
    }
    this.verb = ctx.createConvolver()
    this.verb.buffer = ir
    const wet = ctx.createGain()
    wet.gain.value = 0.32
    this.verb.connect(wet)
    wet.connect(out)

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const nd = this.noise.getChannelData(0)
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
  }

  get running(): boolean {
    return this.ctx.state === 'running'
  }

  resume(): Promise<void> {
    return this.ctx.resume()
  }

  close(): void {
    void this.ctx.close()
  }

  private bus(pan = 0, send = 0.5): Bus {
    const c = this.ctx
    const g = c.createGain()
    g.gain.value = 0
    const p = c.createStereoPanner ? c.createStereoPanner() : null
    if (p) {
      p.pan.value = pan
      g.connect(p)
      p.connect(this.master)
    } else {
      g.connect(this.master)
    }
    const sd = c.createGain()
    sd.gain.value = send
    g.connect(sd)
    sd.connect(this.verb)
    return { g, p }
  }

  private bell(f: number, t: number, vol = 0.12, dur = 1.2, ratio = 3.51) {
    const c = this.ctx
    const car = c.createOscillator()
    const mod = c.createOscillator()
    const mg = c.createGain()
    car.frequency.value = f
    mod.frequency.value = f * ratio
    mg.gain.setValueAtTime(f * 1.4, t)
    mg.gain.exponentialRampToValueAtTime(f * 0.02, t + dur * 0.6)
    mod.connect(mg)
    mg.connect(car.frequency)
    const { g } = this.bus(0, 0.7)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    const sub = c.createOscillator()
    sub.type = 'triangle'
    sub.frequency.value = f / 2
    const sg = c.createGain()
    sg.gain.value = 0.25
    sub.connect(sg)
    sg.connect(g)
    car.connect(g)
    for (const o of [car, mod, sub]) {
      o.start(t)
      o.stop(t + dur + 0.05)
    }
  }

  private sweep(from: number, to: number, q: number, dur: number) {
    const c = this.ctx
    const t = c.currentTime
    const src = c.createBufferSource()
    src.buffer = this.noise
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = q
    bp.frequency.setValueAtTime(from, t)
    bp.frequency.exponentialRampToValueAtTime(to, t + dur * 0.75)
    return { src, bp, t }
  }

  /** A blade passing: noise swept up or down, panned the way it travels. */
  swish(dir: number) {
    const { src, bp, t } = this.sweep(
      dir > 0 ? 500 : 2600,
      dir > 0 ? 3400 : 450,
      1.1,
      0.34,
    )
    const lp = this.ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 6000
    const { g, p } = this.bus(-0.5 * dir, 0.55)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.55, t + 0.07)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34)
    if (p) {
      p.pan.setValueAtTime(-0.6 * dir, t)
      p.pan.linearRampToValueAtTime(0.6 * dir, t + 0.3)
    }
    src.connect(bp)
    bp.connect(lp)
    lp.connect(g)
    src.start(t, Math.random() * 0.5)
    src.stop(t + 0.4)
    this.bell(dir > 0 ? 1567.98 : 1318.51, t + 0.05, 0.05, 0.5)
  }

  tick() {
    this.bell(2093, this.ctx.currentTime, 0.045, 0.18, 2.0)
  }

  chime() {
    const t = this.ctx.currentTime
    this.bell(1318.51, t, 0.11, 1.4)
    this.bell(1975.53, t + 0.075, 0.09, 1.6)
    this.bell(2637.02, t + 0.15, 0.05, 1.8)
  }

  back() {
    const t = this.ctx.currentTime
    this.bell(1567.98, t, 0.08, 0.6)
    this.bell(1174.66, t + 0.07, 0.07, 0.8)
  }

  toast() {
    const t = this.ctx.currentTime
    this.bell(987.77, t, 0.07, 1.2, 2.0)
    this.bell(1479.98, t + 0.12, 0.07, 1.5, 2.0)
  }

  guide() {
    const { src, bp, t } = this.sweep(300, 4200, 3, 0.6)
    const { g } = this.bus(0, 0.8)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.3, t + 0.2)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    src.connect(bp)
    bp.connect(g)
    src.start(t)
    src.stop(t + 0.65)
    ;[659.25, 987.77, 1318.51, 1661.22].forEach((f, i) =>
      this.bell(f, t + 0.18 + i * 0.045, 0.06, 1.8, 2.0),
    )
  }
}

export type Cue =
  | 'swish+'
  | 'swish-'
  | 'tick'
  | 'chime'
  | 'back'
  | 'toast'
  | 'guide'

export function play(audio: Synth, cue: Cue): void {
  if (!audio.running) return
  if (cue === 'swish+') audio.swish(1)
  else if (cue === 'swish-') audio.swish(-1)
  else audio[cue]()
}
