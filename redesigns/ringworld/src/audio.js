// ---------------------------------------------------------------------------
// Sound: everything synthesized. Choir pad = detuned saws through a formant
// filter bank into a generated convolution reverb. Nothing plays until the
// visitor turns sound on, and the AudioContext is created inside that gesture.
// ---------------------------------------------------------------------------
const Sound = (() => {
  let ctx = null, master, musicBus, sfxBus, verb, padTimer = null
  let enabled = false, musicVol = 0.7, sfxVol = 0.8, nextChord = 0, chordIx = 0, cycle = 0
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)

  // Formants (Hz, relative gain) for sung vowels.
  const VOWELS = {
    a: [[780, 1], [1150, 0.5], [2800, 0.16]],
    o: [[480, 1], [820, 0.45], [2750, 0.1]],
    u: [[330, 1], [720, 0.28], [2500, 0.06]],
    e: [[420, 1], [1750, 0.32], [2600, 0.14]],
  }
  // Original progression in D minor (i - VI - iv - V - III - VII - VI - v), voiced wide.
  const CHORDS = [
    { bass: 38, notes: [50, 57, 62, 65, 69], v: 'a', mel: [[74, 0, 4], [76, 4.2, 4]] },
    { bass: 34, notes: [53, 58, 62, 65, 69], v: 'o', mel: [[77, 0, 5], [74, 5.2, 3.5]] },
    { bass: 31, notes: [50, 55, 58, 62, 67], v: 'a', mel: [[74, 0, 3.5], [70, 3.8, 4.5]] },
    { bass: 33, notes: [52, 57, 61, 64, 69], v: 'e', mel: [[73, 0, 6], [76, 6.2, 2.4]] },
    { bass: 29, notes: [48, 53, 57, 60, 65], v: 'o', mel: [[72, 0, 4], [69, 4.2, 4]] },
    { bass: 36, notes: [48, 55, 60, 64, 67], v: 'a', mel: [[67, 0, 3], [72, 3.2, 5]] },
    { bass: 34, notes: [50, 53, 58, 62, 69], v: 'u', mel: [[74, 0, 4], [77, 4.2, 4]] },
    { bass: 33, notes: [52, 57, 60, 64, 69], v: 'e', mel: [[76, 0, 5], [72, 5.2, 3]] },
  ]
  const CH_DUR = 8.5

  function impulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0
      for (let i = 0; i < len; i++) {
        const t = i / len
        const k = 0.15 + 0.8 * t // darker as it decays
        lp += ((Math.random() * 2 - 1) - lp) * (1 - k)
        d[i] = lp * Math.pow(1 - t, decay) * (i < 400 ? i / 400 : 1)
      }
      // a few early reflections
      for (let r = 0; r < 6; r++) { const at = Math.floor(ctx.sampleRate * (0.012 + r * 0.017 + ch * 0.005)); if (at < len) d[at] += (0.5 - r * 0.07) * (Math.random() > 0.5 ? 1 : -1) }
    }
    return buf
  }

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain(); master.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.4
    master.connect(comp).connect(ctx.destination)
    verb = ctx.createConvolver(); verb.buffer = impulse(6, 2.4)
    const wet = ctx.createGain(); wet.gain.value = 0.85
    verb.connect(wet).connect(master)
    musicBus = ctx.createGain(); musicBus.gain.value = musicVol * 0.55
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200; lp.Q.value = 0.4
    const dry = ctx.createGain(); dry.gain.value = 0.3
    musicBus.connect(lp); lp.connect(dry).connect(master); lp.connect(verb)
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVol * 0.5
    sfxBus.connect(master)
    const send = ctx.createGain(); send.gain.value = 0.18; sfxBus.connect(send).connect(verb)
  }

  // One sung note: 3 detuned saws with vibrato, through a vowel formant bank.
  function voice(midi, t0, dur, gain, vowel, toVowel, att = 3.2, rel = 3.8) {
    const out = ctx.createGain(); out.gain.value = 0
    out.gain.setValueAtTime(0, t0)
    out.gain.linearRampToValueAtTime(gain, t0 + att)
    out.gain.setValueAtTime(gain, t0 + Math.max(att, dur - rel))
    out.gain.linearRampToValueAtTime(0, t0 + dur)
    out.connect(musicBus)
    const V = VOWELS[vowel], V2 = VOWELS[toVowel || vowel]
    const bank = V.map(([f, g], i) => {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 7 + i * 2
      bp.frequency.setValueAtTime(f, t0); bp.frequency.linearRampToValueAtTime(V2[i][0], t0 + dur * 0.8)
      const gg = ctx.createGain(); gg.gain.value = g * 2.6
      bp.connect(gg).connect(out); return bp
    })
    const f = mtof(midi)
    for (const cents of [-11, 0, 9]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f
      o.detune.value = cents + (Math.random() - 0.5) * 5
      const lfo = ctx.createOscillator(); lfo.frequency.value = 4.6 + Math.random() * 0.9
      const lg = ctx.createGain(); lg.gain.value = 0
      lg.gain.setValueAtTime(0, t0); lg.gain.linearRampToValueAtTime(7, t0 + att * 1.2)
      lfo.connect(lg).connect(o.detune)
      bank.forEach((b) => o.connect(b))
      o.start(t0); lfo.start(t0); o.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05)
    }
  }

  function sub(midi, t0, dur, gain) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(midi)
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 3); g.gain.setValueAtTime(gain, t0 + dur - 3.5); g.gain.linearRampToValueAtTime(0, t0 + dur)
    o.connect(g).connect(musicBus); o.start(t0); o.stop(t0 + dur + 0.05)
  }

  function shimmer(t0) {
    const pent = [81, 84, 86, 88, 91, 93]
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(pent[Math.floor(Math.random() * pent.length)])
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.03, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.5)
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; o.connect(g).connect(pan).connect(verb) } else o.connect(g).connect(verb)
    o.start(t0); o.stop(t0 + 2.6)
  }

  function schedule() {
    if (!ctx || !enabled) return
    while (nextChord < ctx.currentTime + 3) {
      const C = CHORDS[chordIx]
      const t0 = Math.max(nextChord, ctx.currentTime + 0.05), dur = CH_DUR + 4
      const nextV = CHORDS[(chordIx + 1) % CHORDS.length].v
      C.notes.forEach((m, i) => voice(m, t0 + i * 0.12, dur, 0.05 - i * 0.004, C.v, nextV))
      sub(C.bass, t0, dur, 0.09)
      if (cycle % 2 === 1) C.mel.forEach(([m, at, d]) => voice(m, t0 + 1 + at, d + 2, 0.045, 'a', 'o', 1.2, 1.8))
      for (let k = 0; k < 2; k++) if (Math.random() > 0.35) shimmer(t0 + 1 + Math.random() * CH_DUR)
      nextChord = t0 + CH_DUR
      chordIx = (chordIx + 1) % CHORDS.length
      if (chordIx === 0) cycle++
    }
  }

  function blip(kind) {
    if (!ctx || !enabled) return
    const t = ctx.currentTime
    const tone = (type, f0, f1, dur, peak, at = 0) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = type; o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(f1, t + at + dur * 0.6)
      g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(peak, t + at + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur)
      o.connect(g).connect(sfxBus); o.start(t + at); o.stop(t + at + dur + 0.02)
    }
    const noise = (dur, f0, f1, peak, at = 0) => {
      const len = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      const s = ctx.createBufferSource(); s.buffer = b
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2
      bp.frequency.setValueAtTime(f0, t + at); bp.frequency.exponentialRampToValueAtTime(f1, t + at + dur)
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(peak, t + at + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur)
      s.connect(bp).connect(g).connect(sfxBus); s.start(t + at)
    }
    switch (kind) {
      case 'move': tone('sine', 1560, 2100, 0.07, 0.16); tone('triangle', 3120, 3300, 0.03, 0.03); break
      case 'select': tone('sine', 880, 1320, 0.12, 0.2); tone('sine', 1320, 1980, 0.16, 0.16, 0.05); noise(0.32, 600, 4200, 0.05, 0.02); break
      case 'back': tone('sine', 1400, 700, 0.14, 0.17); noise(0.22, 3000, 500, 0.03); break
      case 'tick': tone('square', 2600, 2600, 0.018, 0.02); break
      case 'found': [0, 0.09, 0.18].forEach((at, i) => tone('sine', [988, 1319, 1976][i], [988, 1319, 1976][i] * 1.002, 0.6, 0.12, at)); break
      case 'start': tone('sine', 220, 880, 1.6, 0.18); noise(1.8, 200, 6000, 0.08); tone('sine', 1760, 1760, 1.2, 0.05, 0.4); break
      case 'error': tone('square', 220, 180, 0.18, 0.05); break
    }
  }

  return {
    get enabled() { return enabled },
    get ready() { return !!ctx },
    setEnabled(on) {
      if (on && !ctx) init()
      enabled = !!on
      if (!ctx) return
      if (ctx.state === 'suspended') ctx.resume()
      const t = ctx.currentTime
      master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(enabled ? 0.9 : 0, t + (enabled ? 1.2 : 0.3))
      if (enabled) { if (nextChord < t) nextChord = t + 0.1; schedule(); clearInterval(padTimer); padTimer = setInterval(schedule, 1000) }
      else { clearInterval(padTimer) }
    },
    setMusic(v) { musicVol = v; if (musicBus) musicBus.gain.setTargetAtTime(v * 0.55, ctx.currentTime, 0.2) },
    setSfx(v) { sfxVol = v; if (sfxBus) sfxBus.gain.setTargetAtTime(v * 0.5, ctx.currentTime, 0.05) },
    get musicVol() { return musicVol },
    get sfxVol() { return sfxVol },
    blip,
  }
})()
