/**
 * MERIDIAN's sound, all synthesised: a choir pad of detuned saws through
 * vowel formant banks into a generated convolution reverb, plus interface
 * blips. Nothing is sampled and nothing is fetched.
 *
 * Lazily imported by the home island the first time sound is switched on,
 * and the AudioContext is created inside that gesture, so a visitor who
 * never turns sound on never downloads or starts any of it.
 */

export type Blip = 'move' | 'select' | 'back' | 'tick' | 'start'

type Formant = [number, number]

/** Formants (Hz, relative gain) for sung vowels. */
const VOWELS: Record<string, Formant[]> = {
  a: [
    [780, 1],
    [1150, 0.5],
    [2800, 0.16],
  ],
  o: [
    [480, 1],
    [820, 0.45],
    [2750, 0.1],
  ],
  u: [
    [330, 1],
    [720, 0.28],
    [2500, 0.06],
  ],
  e: [
    [420, 1],
    [1750, 0.32],
    [2600, 0.14],
  ],
}

interface Chord {
  bass: number
  notes: number[]
  v: string
  /** `[midi, offset, duration]` for the soprano line. */
  mel: [number, number, number][]
}

/** An original progression in D minor (i VI iv V III VII VI v), voiced wide. */
const CHORDS: Chord[] = [
  {
    bass: 38,
    notes: [50, 57, 62, 65, 69],
    v: 'a',
    mel: [
      [74, 0, 4],
      [76, 4.2, 4],
    ],
  },
  {
    bass: 34,
    notes: [53, 58, 62, 65, 69],
    v: 'o',
    mel: [
      [77, 0, 5],
      [74, 5.2, 3.5],
    ],
  },
  {
    bass: 31,
    notes: [50, 55, 58, 62, 67],
    v: 'a',
    mel: [
      [74, 0, 3.5],
      [70, 3.8, 4.5],
    ],
  },
  {
    bass: 33,
    notes: [52, 57, 61, 64, 69],
    v: 'e',
    mel: [
      [73, 0, 6],
      [76, 6.2, 2.4],
    ],
  },
  {
    bass: 29,
    notes: [48, 53, 57, 60, 65],
    v: 'o',
    mel: [
      [72, 0, 4],
      [69, 4.2, 4],
    ],
  },
  {
    bass: 36,
    notes: [48, 55, 60, 64, 67],
    v: 'a',
    mel: [
      [67, 0, 3],
      [72, 3.2, 5],
    ],
  },
  {
    bass: 34,
    notes: [50, 53, 58, 62, 69],
    v: 'u',
    mel: [
      [74, 0, 4],
      [77, 4.2, 4],
    ],
  },
  {
    bass: 33,
    notes: [52, 57, 60, 64, 69],
    v: 'e',
    mel: [
      [76, 0, 5],
      [72, 5.2, 3],
    ],
  },
]
const CHORD_SECONDS = 8.5

const mtof = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

interface Graph {
  ctx: AudioContext
  master: GainNode
  music: GainNode
  sfx: GainNode
  verb: ConvolverNode
}

let graph: Graph | null = null
let enabled = false
let musicVolume = 0.7
let sfxVolume = 0.8
let nextChord = 0
let chordIndex = 0
let cycle = 0
let timer: ReturnType<typeof setInterval> | undefined

function impulse(ctx: AudioContext, seconds: number, decay: number) {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    let lowpass = 0
    for (let i = 0; i < length; i++) {
      const t = i / length
      // Darker as it decays.
      lowpass += (Math.random() * 2 - 1 - lowpass) * (1 - (0.15 + 0.8 * t))
      data[i] = lowpass * Math.pow(1 - t, decay) * (i < 400 ? i / 400 : 1)
    }
    for (let r = 0; r < 6; r++) {
      const at = Math.floor(
        ctx.sampleRate * (0.012 + r * 0.017 + channel * 0.005),
      )
      if (at < length)
        data[at] += (0.5 - r * 0.07) * (Math.random() > 0.5 ? 1 : -1)
    }
  }
  return buffer
}

function build(): Graph {
  const ctx = new AudioContext()
  const master = ctx.createGain()
  master.gain.value = 0
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 3.5
  comp.attack.value = 0.01
  comp.release.value = 0.4
  master.connect(comp).connect(ctx.destination)
  const verb = ctx.createConvolver()
  verb.buffer = impulse(ctx, 6, 2.4)
  const wet = ctx.createGain()
  wet.gain.value = 0.85
  verb.connect(wet).connect(master)
  const music = ctx.createGain()
  music.gain.value = musicVolume * 0.55
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 4200
  lowpass.Q.value = 0.4
  const dry = ctx.createGain()
  dry.gain.value = 0.3
  music.connect(lowpass)
  lowpass.connect(dry).connect(master)
  lowpass.connect(verb)
  const sfx = ctx.createGain()
  sfx.gain.value = sfxVolume * 0.5
  sfx.connect(master)
  const send = ctx.createGain()
  send.gain.value = 0.18
  sfx.connect(send).connect(verb)
  return { ctx, master, music, sfx, verb }
}

/** One sung note: three detuned saws with vibrato through a formant bank. */
function voice(
  g: Graph,
  midi: number,
  t0: number,
  dur: number,
  gain: number,
  vowel: string,
  toVowel: string,
  attack = 3.2,
  release = 3.8,
) {
  const { ctx } = g
  const out = ctx.createGain()
  out.gain.setValueAtTime(0, t0)
  out.gain.linearRampToValueAtTime(gain, t0 + attack)
  out.gain.setValueAtTime(gain, t0 + Math.max(attack, dur - release))
  out.gain.linearRampToValueAtTime(0, t0 + dur)
  out.connect(g.music)
  const from = VOWELS[vowel]
  const to = VOWELS[toVowel]
  const bank = from.map(([frequency, level], i) => {
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 7 + i * 2
    band.frequency.setValueAtTime(frequency, t0)
    band.frequency.linearRampToValueAtTime(to[i][0], t0 + dur * 0.8)
    const level2 = ctx.createGain()
    level2.gain.value = level * 2.6
    band.connect(level2).connect(out)
    return band
  })
  for (const cents of [-11, 0, 9]) {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = mtof(midi)
    osc.detune.value = cents + (Math.random() - 0.5) * 5
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 4.6 + Math.random() * 0.9
    const depth = ctx.createGain()
    depth.gain.setValueAtTime(0, t0)
    depth.gain.linearRampToValueAtTime(7, t0 + attack * 1.2)
    lfo.connect(depth).connect(osc.detune)
    for (const band of bank) osc.connect(band)
    osc.start(t0)
    lfo.start(t0)
    osc.stop(t0 + dur + 0.05)
    lfo.stop(t0 + dur + 0.05)
  }
}

function sub(g: Graph, midi: number, t0: number, dur: number, gain: number) {
  const osc = g.ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = mtof(midi)
  const env = g.ctx.createGain()
  env.gain.setValueAtTime(0, t0)
  env.gain.linearRampToValueAtTime(gain, t0 + 3)
  env.gain.setValueAtTime(gain, t0 + dur - 3.5)
  env.gain.linearRampToValueAtTime(0, t0 + dur)
  osc.connect(env).connect(g.music)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

function shimmer(g: Graph, t0: number) {
  const pentatonic = [81, 84, 86, 88, 91, 93]
  const osc = g.ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = mtof(pentatonic[Math.floor(Math.random() * 6)])
  const env = g.ctx.createGain()
  env.gain.setValueAtTime(0, t0)
  env.gain.linearRampToValueAtTime(0.03, t0 + 0.02)
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.5)
  const pan = g.ctx.createStereoPanner()
  pan.pan.value = Math.random() * 1.6 - 0.8
  osc.connect(env).connect(pan).connect(g.verb)
  osc.start(t0)
  osc.stop(t0 + 2.6)
}

function schedule() {
  const g = graph
  if (!g || !enabled) return
  while (nextChord < g.ctx.currentTime + 3) {
    const chord = CHORDS[chordIndex]
    const t0 = Math.max(nextChord, g.ctx.currentTime + 0.05)
    const dur = CHORD_SECONDS + 4
    const nextVowel = CHORDS[(chordIndex + 1) % CHORDS.length].v
    chord.notes.forEach((midi, i) =>
      voice(g, midi, t0 + i * 0.12, dur, 0.05 - i * 0.004, chord.v, nextVowel),
    )
    sub(g, chord.bass, t0, dur, 0.09)
    if (cycle % 2 === 1) {
      for (const [midi, at, d] of chord.mel) {
        voice(g, midi, t0 + 1 + at, d + 2, 0.045, 'a', 'o', 1.2, 1.8)
      }
    }
    for (let k = 0; k < 2; k++) {
      if (Math.random() > 0.35)
        shimmer(g, t0 + 1 + Math.random() * CHORD_SECONDS)
    }
    nextChord = t0 + CHORD_SECONDS
    chordIndex = (chordIndex + 1) % CHORDS.length
    if (chordIndex === 0) cycle++
  }
}

export function blip(kind: Blip): void {
  const g = graph
  if (!g || !enabled) return
  const { ctx } = g
  const t = ctx.currentTime
  const tone = (
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    peak: number,
    at = 0,
  ) => {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(f0, t + at)
    osc.frequency.exponentialRampToValueAtTime(f1, t + at + dur * 0.6)
    env.gain.setValueAtTime(0.0001, t + at)
    env.gain.exponentialRampToValueAtTime(peak, t + at + 0.004)
    env.gain.exponentialRampToValueAtTime(0.0001, t + at + dur)
    osc.connect(env).connect(g.sfx)
    osc.start(t + at)
    osc.stop(t + at + dur + 0.02)
  }
  const noise = (dur: number, f0: number, f1: number, peak: number, at = 0) => {
    const length = Math.floor(ctx.sampleRate * dur)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 1.2
    band.frequency.setValueAtTime(f0, t + at)
    band.frequency.exponentialRampToValueAtTime(f1, t + at + dur)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t + at)
    env.gain.exponentialRampToValueAtTime(peak, t + at + dur * 0.3)
    env.gain.exponentialRampToValueAtTime(0.0001, t + at + dur)
    source.connect(band).connect(env).connect(g.sfx)
    source.start(t + at)
  }
  if (kind === 'move') {
    tone('sine', 1560, 2100, 0.07, 0.16)
    tone('triangle', 3120, 3300, 0.03, 0.03)
  } else if (kind === 'select') {
    tone('sine', 880, 1320, 0.12, 0.2)
    tone('sine', 1320, 1980, 0.16, 0.16, 0.05)
    noise(0.32, 600, 4200, 0.05, 0.02)
  } else if (kind === 'back') {
    tone('sine', 1400, 700, 0.14, 0.17)
    noise(0.22, 3000, 500, 0.03)
  } else if (kind === 'tick') {
    tone('square', 2600, 2600, 0.018, 0.02)
  } else {
    tone('sine', 220, 880, 1.6, 0.18)
    noise(1.8, 200, 6000, 0.08)
    tone('sine', 1760, 1760, 1.2, 0.05, 0.4)
  }
}

export function setEnabled(on: boolean): void {
  if (on && !graph) graph = build()
  enabled = on
  const g = graph
  if (!g) return
  if (g.ctx.state === 'suspended') void g.ctx.resume()
  const t = g.ctx.currentTime
  g.master.gain.cancelScheduledValues(t)
  g.master.gain.setValueAtTime(g.master.gain.value, t)
  g.master.gain.linearRampToValueAtTime(on ? 0.9 : 0, t + (on ? 1.2 : 0.3))
  clearInterval(timer)
  if (on) {
    if (nextChord < t) nextChord = t + 0.1
    schedule()
    timer = setInterval(schedule, 1000)
  }
}

/** 0-1. */
export function setMusic(volume: number): void {
  musicVolume = volume
  graph?.music.gain.setTargetAtTime(volume * 0.55, graph.ctx.currentTime, 0.2)
}

/** 0-1. */
export function setSfx(volume: number): void {
  sfxVolume = volume
  graph?.sfx.gain.setTargetAtTime(volume * 0.5, graph.ctx.currentTime, 0.05)
}

/** Silences and releases the context, when the island unmounts. */
export function shutdown(): void {
  clearInterval(timer)
  enabled = false
  const g = graph
  graph = null
  nextChord = 0
  if (g) void g.ctx.close()
}

export function isReady(): boolean {
  return graph !== null
}
