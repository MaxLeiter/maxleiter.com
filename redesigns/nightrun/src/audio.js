// NIGHTRUN audio: everything synthesized with WebAudio. No samples.
// Music: 132 BPM electro breakbeat in F minor (noise/osc drums, saw bass, filtered arp, pad).
;(function () {
  'use strict'
  const A = { music: false, sfx: false, vol: 0.7 }
  let ctx, master, mus, fx, comp, noiseBuf, verb, timer, step = 0, nextT = 0
  const BPM = 132, S16 = 60 / BPM / 4
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return false
    ctx = new AC()
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18
    master = ctx.createGain(); master.gain.value = A.vol
    mus = ctx.createGain(); mus.gain.value = 0; fx = ctx.createGain(); fx.gain.value = 0.9
    mus.connect(comp); fx.connect(comp); comp.connect(master); master.connect(ctx.destination)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    // procedural plate reverb impulse
    const len = ctx.sampleRate * 1.8, ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) }
    verb = ctx.createConvolver(); verb.buffer = ir
    const vg = ctx.createGain(); vg.gain.value = 0.22; verb.connect(vg); vg.connect(comp)
    return true
  }
  const env = (g, t, a, peak, d, sus = 0.0001) => { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + d) }
  function noise(t, dur, type, freq, q, peak, dest, dec) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q
    const g = ctx.createGain(); env(g, t, 0.002, peak, dec || dur)
    s.connect(f); f.connect(g); g.connect(dest || mus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05)
    return { f, g }
  }
  function osc(t, type, f0, f1, dur, peak, dest, a = 0.003) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6)
    const g = ctx.createGain(); env(g, t, a, peak, dur)
    o.connect(g); g.connect(dest || mus); o.start(t); o.stop(t + dur + 0.05)
    return { o, g }
  }
  // ---- drums
  const kick = (t) => { osc(t, 'sine', 150, 42, 0.32, 0.95); noise(t, 0.02, 'highpass', 3000, 0.7, 0.18) }
  const snare = (t, v = 1) => { noise(t, 0.2, 'bandpass', 1900, 0.9, 0.5 * v, null, 0.17); osc(t, 'triangle', 240, 180, 0.09, 0.25 * v); const r = noise(t, 0.25, 'bandpass', 2400, 1, 0.12 * v); r.g.connect(verb) }
  const hat = (t, v = 1, open) => noise(t, open ? 0.22 : 0.04, 'highpass', 8200, 0.8, 0.16 * v, null, open ? 0.2 : 0.035)
  const clap = (t) => { for (let i = 0; i < 3; i++) noise(t + i * 0.011, 0.05, 'bandpass', 1300, 1.4, 0.22); const r = noise(t + 0.03, 0.2, 'bandpass', 1200, 1.2, 0.18); r.g.connect(verb) }
  // ---- pitched
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)
  function bass(t, n, len) {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(); o1.type = 'sawtooth'; o2.type = 'square'
    o1.frequency.value = mtof(n); o2.frequency.value = mtof(n - 12) * 1.003
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 9
    f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(140, t + len * 0.9)
    const g = ctx.createGain(); env(g, t, 0.004, 0.32, len)
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(mus); o1.start(t); o2.start(t); o1.stop(t + len + 0.05); o2.stop(t + len + 0.05)
  }
  let arpF
  function arp(t, n, bar) {
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = mtof(n)
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6
    const sweep = 900 + 2600 * (0.5 + 0.5 * Math.sin((bar * 16 + step % 16) / 64 * Math.PI * 2))
    f.frequency.setValueAtTime(sweep * 1.6, t); f.frequency.exponentialRampToValueAtTime(sweep * 0.4, t + 0.12)
    const g = ctx.createGain(); env(g, t, 0.003, 0.07, 0.13)
    const dl = ctx.createDelay(); dl.delayTime.value = S16 * 3; const fb = ctx.createGain(); fb.gain.value = 0.3
    o.connect(f); f.connect(g); g.connect(mus); g.connect(dl); dl.connect(fb); fb.connect(dl); fb.connect(verb)
    o.start(t); o.stop(t + 0.2)
  }
  function pad(t, notes, len) {
    for (const n of notes) for (const det of [-7, 7]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = det
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + len * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + len)
      o.connect(f); f.connect(g); g.connect(mus); g.connect(verb); o.start(t); o.stop(t + len + 0.05)
    }
  }
  // 4-bar progression: Fm - Db - Eb - Cm
  const CH = [[53, 56, 60, 65], [49, 53, 56, 61], [51, 55, 58, 63], [48, 51, 55, 60]]
  const ROOT = [29, 25, 27, 24]
  const K = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]
  const SN = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0.35, 0, 0, 0, 0, 0, 1, 0, 0, 0.3, 0, 0, 0, 0, 1, 0, 0.4, 0.5]
  const BL = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1]
  const BO = [0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 3, 0]
  function schedule() {
    while (nextT < ctx.currentTime + 0.12) {
      const s32 = step % 32, s16 = step % 16, bar = Math.floor(step / 16) % 4, t = nextT
      if (K[s32]) kick(t)
      if (SN[s32]) snare(t, SN[s32])
      if (s16 % 2 === 0 || Math.random() < 0.25) hat(t, s16 % 4 === 2 ? 1 : 0.55, s16 === 14)
      if (s32 === 28) clap(t)
      if (BL[s16]) bass(t, ROOT[bar] + 12 + BO[s16], S16 * 1.6)
      const ch = CH[bar]; arp(t, ch[(s16 * 3) % 4] + 12 * (s16 % 8 > 5 ? 1 : 0), bar)
      if (s16 === 0) pad(t, ch, S16 * 16)
      nextT += S16; step++
    }
  }
  A.setMusic = function (on) {
    A.music = on
    if (on) {
      if (!ensure()) return
      mus.gain.cancelScheduledValues(ctx.currentTime); mus.gain.setTargetAtTime(0.8, ctx.currentTime, 0.4)
      if (!timer) { nextT = ctx.currentTime + 0.08; step = 0; timer = setInterval(schedule, 25) }
    } else if (ctx) {
      mus.gain.setTargetAtTime(0, ctx.currentTime, 0.15)
      clearInterval(timer); timer = null
    }
  }
  A.setSfx = function (on) { A.sfx = on; if (on) ensure() }
  A.setVol = function (v) { A.vol = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05) }
  // ---- UI sounds
  A.play = function (name) {
    if (!A.sfx || !ensure()) return
    const t = ctx.currentTime + 0.005
    if (name === 'move') { osc(t, 'square', 1700, 1500, 0.035, 0.05, fx) }
    else if (name === 'whoosh' || name === 'back') {
      const r = name === 'back'
      const s = ctx.createBufferSource(); s.buffer = noiseBuf
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.6
      f.frequency.setValueAtTime(r ? 3200 : 380, t); f.frequency.exponentialRampToValueAtTime(r ? 300 : 3600, t + 0.22); f.frequency.exponentialRampToValueAtTime(r ? 200 : 900, t + 0.42)
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.16); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null
      s.connect(f); f.connect(g)
      if (p) { p.pan.setValueAtTime(r ? 0.7 : -0.7, t); p.pan.linearRampToValueAtTime(r ? -0.7 : 0.7, t + 0.42); g.connect(p); p.connect(fx) } else g.connect(fx)
      s.start(t); s.stop(t + 0.5)
    } else if (name === 'clunk') {
      osc(t, 'sine', 110, 46, 0.16, 0.6, fx); noise(t, 0.03, 'lowpass', 1800, 1, 0.3, fx); osc(t + 0.05, 'square', 220, 200, 0.03, 0.06, fx)
    } else if (name === 'rev') {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(); o.type = 'sawtooth'; o2.type = 'sawtooth'
      for (const [x, m] of [[o, 1], [o2, 1.5]]) { x.frequency.setValueAtTime(70 * m, t); x.frequency.exponentialRampToValueAtTime(230 * m, t + 0.18); x.frequency.exponentialRampToValueAtTime(95 * m, t + 0.55) }
      const ws = ctx.createWaveShaper(); const c = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * 3) } ws.curve = c
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(2200, t + 0.18); f.frequency.exponentialRampToValueAtTime(500, t + 0.55)
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
      o.connect(ws); o2.connect(ws); ws.connect(f); f.connect(g); g.connect(fx); o.start(t); o2.start(t); o.stop(t + 0.65); o2.stop(t + 0.65)
    } else if (name === 'start') { A.play('whoosh'); setTimeout(() => A.play('rev'), 120) }
    else if (name === 'paint') { noise(t, 0.5, 'highpass', 5000, 0.5, 0.12, fx, 0.45); osc(t, 'sine', 900, 1800, 0.25, 0.05, fx) }
  }
  window.NRAudio = A
})()
