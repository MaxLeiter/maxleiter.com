/* Every sound here is synthesized. Nothing is sampled. The AudioContext is
   only created inside a user gesture, and stays silent until sound is on. */
const Sound = (() => {
  let ctx = null, master, sfxBus, musicBus, verb, verbSend, analyser, noiseBuf
  let on = false
  const listeners = new Set()

  function ensure() {
    if (ctx) return ctx
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain(); master.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18; comp.ratio.value = 3
    master.connect(comp).connect(ctx.destination)
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master)
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 5200
    musicBus.connect(tone).connect(master)
    analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.78
    tone.connect(analyser)
    // a generated room: decaying stereo noise
    verb = ctx.createConvolver()
    const len = ctx.sampleRate * 2.4, ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
    }
    verb.buffer = ir
    verbSend = ctx.createGain(); verbSend.gain.value = 0.32
    verbSend.connect(verb).connect(master)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
    return ctx
  }

  function setOn(v) {
    on = !!v
    if (on) { ensure(); if (!ctx) return; ctx.resume() }
    if (ctx) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05)
    if (on && !Jingle.playing && Jingle.wanted) Jingle.start()
    if (!on && Jingle.playing) Jingle.stop(true)
    listeners.forEach((f) => f())
  }

  const live = () => on && ctx && ctx.state === 'running'

  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec)
  }

  function voice(type, f0, f1, t, dur, peak, dest, send) {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6)
    env(g, t, 0.006, peak, dur)
    o.connect(g).connect(dest || sfxBus)
    if (send) g.connect(verbSend)
    o.start(t); o.stop(t + dur + 0.1)
  }

  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12)

  return {
    get on() { return on },
    get ctx() { return ctx },
    get analyser() { return analyser },
    get musicBus() { return musicBus },
    get verbSend() { return verbSend },
    get noise() { return noiseBuf },
    ensure, setOn, hz,
    onChange(f) { listeners.add(f) },
    bloop(i = 0) {
      if (!live()) return
      const t = ctx.currentTime, f = hz(72 + PENTA[i % PENTA.length])
      voice('sine', f * 0.75, f, t, 0.16, 0.12, null, true)
      voice('triangle', f * 2, f * 2, t, 0.05, 0.025)
    },
    tick() {
      if (!live()) return
      const t = ctx.currentTime
      voice('sine', 1900, 1500, t, 0.03, 0.03)
    },
    select() {
      if (!live()) return
      const t = ctx.currentTime
      voice('sine', hz(84), hz(84), t, 0.5, 0.12, null, true)
      voice('sine', hz(91), hz(91), t + 0.07, 0.6, 0.09, null, true)
      voice('triangle', hz(96), hz(96), t + 0.07, 0.25, 0.02)
    },
    whoosh(up = true) {
      if (!live()) return
      const t = ctx.currentTime, s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain()
      s.buffer = noiseBuf; bp.type = 'bandpass'; bp.Q.value = 1.4
      bp.frequency.setValueAtTime(up ? 380 : 2400, t)
      bp.frequency.exponentialRampToValueAtTime(up ? 2600 : 340, t + 0.42)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.12)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
      s.connect(bp).connect(g).connect(sfxBus); g.connect(verbSend)
      s.start(t); s.stop(t + 0.55)
      voice('sine', up ? hz(67) : hz(79), up ? hz(79) : hz(67), t + 0.05, 0.35, 0.05, null, true)
    },
    back() {
      if (!live()) return
      const t = ctx.currentTime
      voice('sine', hz(79), hz(72), t, 0.18, 0.1, null, true)
      voice('sine', hz(72), hz(67), t + 0.08, 0.25, 0.08, null, true)
    },
  }
})()

/* ---------- the ambient jingle: an original 8-bar loop, composed in code ----------
   Chords are fixed; the melody is grown from a seed with motif repetition, so
   "Remix" gives a new tune over the same changes. Seed 2006 is the house tune. */
const Jingle = (() => {
  const BPM = 94, SPB = 60 / BPM, SWING = 0.6
  // [bass midi, voicing midis, name]
  const CHORDS = [
    [41, [57, 60, 64, 67], 'Fmaj9'],
    [40, [55, 59, 62, 67], 'Em7'],
    [45, [55, 59, 60, 64], 'Am9'],
    [38, [54, 57, 60, 64], 'D9'],
    [38, [53, 57, 60, 64], 'Dm9'],
    [43, [53, 59, 64, 69], 'G13'],
    [36, [52, 55, 59, 62], 'Cmaj9'],
    [44, [55, 60, 63, 67], 'Abmaj7'],
  ]
  const SCALE = [0, 2, 4, 5, 7, 9, 11]
  const RHYTHMS = [
    [[0, 3], [3, 1], [4, 2], [6, 2]],
    [[0, 2], [2, 2], [5, 3]],
    [[1, 1], [2, 1], [3, 1], [4, 4]],
    [[0, 4], [5, 1], [6, 2]],
    [[0, 1], [1, 1], [2, 2], [4, 1], [5, 3]],
    [[2, 2], [4, 2], [6, 2]],
  ]
  let seed = 2006, notes = [], wanted = false, playing = false
  let timer = 0, startAt = 0, nextBar = 0, barIdx = 0

  function rng(a) {
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  }
  const inScale = (m) => SCALE.includes(((m % 12) + 12) % 12)
  function snap(m, chord, prefer) {
    const tones = chord[1].map((x) => x % 12)
    let best = m, bd = 99
    for (let d = -3; d <= 3; d++) {
      const c = m + d, pc = ((c % 12) + 12) % 12
      const score = Math.abs(d) + (tones.includes(pc) ? 0 : prefer ? 2.5 : 0.8) + (inScale(c) || tones.includes(pc) ? 0 : 9)
      if (score < bd) { bd = score; best = c }
    }
    return Math.max(70, Math.min(86, best))
  }

  function compose(s) {
    const r = rng(s), out = []
    let pitch = 76
    const bars = []
    for (let b = 0; b < 8; b++) {
      const chord = CHORDS[b]
      let rhythm, contour
      if (b === 4 || b === 5) { rhythm = bars[b - 4].rhythm; contour = bars[b - 4].contour }
      else if (b === 7) { rhythm = [[0, 2], [2, 6]]; contour = [-2, -1] }
      else {
        rhythm = RHYTHMS[Math.floor(r() * RHYTHMS.length)]
        contour = rhythm.map(() => Math.round((r() - 0.5) * 5))
      }
      bars.push({ rhythm, contour })
      rhythm.forEach(([at, len], i) => {
        pitch = snap(pitch + contour[i], chord, i === 0 || len >= 3)
        if (b === 7 && i === rhythm.length - 1) pitch = snap(72 + (r() < 0.5 ? 7 : 4), chord, true)
        out.push({ bar: b, at, len, midi: pitch })
      })
      if (pitch > 82) pitch -= 3
      if (pitch < 72) pitch += 3
    }
    return out
  }
  notes = compose(seed)

  // eighth-note slot -> seconds from bar start, swung
  const slot = (i) => Math.floor(i / 2) * SPB + (i % 2 ? SPB * 2 * SWING : 0)

  function epiano(ctx, t, midi, dur, vel) {
    const f = Sound.hz(midi), car = ctx.createOscillator(), mod = ctx.createOscillator()
    const mg = ctx.createGain(), g = ctx.createGain()
    car.frequency.value = f; mod.frequency.value = f
    mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.15, t + 0.5)
    mod.connect(mg).connect(car.frequency)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vel, t + 0.008)
    g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.25)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6)
    car.connect(g).connect(Sound.musicBus); g.connect(Sound.verbSend)
    car.start(t); mod.start(t); car.stop(t + dur + 0.7); mod.stop(t + dur + 0.7)
  }
  function mallet(ctx, t, midi, dur, vel) {
    const f = Sound.hz(midi)
    for (const [mul, v, d] of [[1, vel, dur + 0.5], [4, vel * 0.22, 0.12], [10, vel * 0.05, 0.04]]) {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = f * mul
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d)
      o.connect(g).connect(Sound.musicBus); g.connect(Sound.verbSend)
      o.start(t); o.stop(t + d + 0.05)
    }
  }
  function bass(ctx, t, midi, dur) {
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain()
    o.type = 'triangle'; o.frequency.value = Sound.hz(midi)
    lp.type = 'lowpass'; lp.frequency.value = 700
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(lp).connect(g).connect(Sound.musicBus)
    o.start(t); o.stop(t + dur + 0.05)
  }
  function brush(ctx, t, v) {
    const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain()
    s.buffer = Sound.noise; hp.type = 'highpass'; hp.frequency.value = 6500
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
    s.connect(hp).connect(g).connect(Sound.musicBus)
    s.start(t, Math.random() * 0.5); s.stop(t + 0.1)
  }

  function scheduleBar(ctx, b, t0) {
    const [root, voicing] = CHORDS[b]
    // comp: beat 1 and the and-of-2
    for (const [sl, len, v] of [[0, 1.6, 0.05], [3, 1.2, 0.035]]) voicing.forEach((m, i) => epiano(ctx, t0 + slot(sl) + i * 0.012, m, len * SPB, v))
    bass(ctx, t0, root, SPB * 1.8)
    bass(ctx, t0 + 2 * SPB, root + 7, SPB * 1.4)
    const nextRoot = CHORDS[(b + 1) % 8][0]
    bass(ctx, t0 + 3 * SPB + SPB * SWING * 0.0, nextRoot + (nextRoot > root ? -1 : 1), SPB * 0.9)
    for (let i = 0; i < 8; i++) brush(ctx, t0 + slot(i), i % 2 ? 0.012 : (i % 4 === 2 ? 0.03 : 0.018))
    for (const n of notes) if (n.bar === b) mallet(ctx, t0 + slot(n.at), n.midi, n.len * SPB * 0.5, 0.075)
  }

  function pump() {
    const ctx = Sound.ctx
    if (!ctx || !playing) return
    while (nextBar < ctx.currentTime + 0.25) {
      scheduleBar(ctx, barIdx, nextBar)
      nextBar += 4 * SPB
      barIdx = (barIdx + 1) % 8
    }
  }

  return {
    CHORDS, SPB, slot,
    get notes() { return notes },
    get seed() { return seed },
    get playing() { return playing },
    get wanted() { return wanted },
    set wanted(v) { wanted = v },
    /** position in the 8-bar loop, in bars (0..8), or -1 */
    position() {
      const ctx = Sound.ctx
      if (!playing || !ctx) return -1
      const p = (ctx.currentTime - startAt) / (4 * SPB)
      return p < 0 ? -1 : p % 8
    },
    start() {
      wanted = true
      const ctx = Sound.ctx
      if (!ctx || !Sound.on || playing) return
      playing = true
      startAt = nextBar = ctx.currentTime + 0.08; barIdx = 0
      pump(); timer = setInterval(pump, 40)
    },
    stop(keepWanted) {
      if (!keepWanted) wanted = false
      playing = false; clearInterval(timer)
    },
    remix() {
      seed = (Math.random() * 1e9) | 0
      notes = compose(seed)
      if (playing) { this.stop(true); this.start() }
    },
    reset() { seed = 2006; notes = compose(seed); if (playing) { this.stop(true); this.start() } },
  }
})()
