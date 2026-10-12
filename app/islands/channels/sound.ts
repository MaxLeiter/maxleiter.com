/**
 * Interface sounds, synthesized: no samples ship. Muted until the visitor
 * turns them on, and never the only cue for anything.
 */

export type Cue = 'tick' | 'bonk' | 'whoosh' | 'open' | 'close' | 'hello'

interface Voice {
  ac: AudioContext
  master: GainNode
  verb: GainNode
  noise: AudioBuffer
}

function createVoice(): Voice | null {
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  const ac = new Ctor()
  const master = ac.createGain()
  master.gain.value = 0.5
  master.connect(ac.destination)
  const noise = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  // A small feedback delay for a sense of room.
  const delay = ac.createDelay()
  delay.delayTime.value = 0.11
  const feedback = ac.createGain()
  feedback.gain.value = 0.32
  const lowpass = ac.createBiquadFilter()
  lowpass.frequency.value = 2600
  const verb = ac.createGain()
  verb.gain.value = 0.35
  verb.connect(delay)
  delay.connect(lowpass)
  lowpass.connect(feedback)
  feedback.connect(delay)
  lowpass.connect(master)
  return { ac, master, verb, noise }
}

export class Sound {
  private voice: Voice | null = null
  on = false

  toggle(): boolean {
    this.voice ??= createVoice()
    if (!this.voice) return false
    this.on = !this.on
    if (this.on) {
      void this.voice.ac.resume()
      this.play('hello')
    }
    return this.on
  }

  play(cue: Cue, dir = 1): void {
    const v = this.voice
    if (!this.on || !v || document.hidden) return
    try {
      CUES[cue](v, dir)
    } catch {
      // An audio graph error is never worth an exception in the UI.
    }
  }

  dispose(): void {
    void this.voice?.ac.close()
    this.voice = null
  }
}

function tone(
  v: Voice,
  f0: number,
  f1: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol = 0.2,
  delay = 0,
  wet = true,
): void {
  const t = v.ac.currentTime + delay
  const osc = v.ac.createOscillator()
  const gain = v.ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f0, t)
  osc.frequency.exponentialRampToValueAtTime(f1, t + dur)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.004 + dur)
  osc.connect(gain)
  gain.connect(v.master)
  if (wet) gain.connect(v.verb)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function hiss(
  v: Voice,
  dur: number,
  f0: number,
  f1: number,
  q: number,
  vol: number,
): void {
  const t = v.ac.currentTime
  const src = v.ac.createBufferSource()
  const filter = v.ac.createBiquadFilter()
  const gain = v.ac.createGain()
  src.buffer = v.noise
  filter.type = 'bandpass'
  filter.Q.value = q
  filter.frequency.setValueAtTime(f0, t)
  filter.frequency.exponentialRampToValueAtTime(f1, t + dur)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + dur * 0.35)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(v.master)
  gain.connect(v.verb)
  src.start(t)
  src.stop(t + dur + 0.05)
}

const CUES: Record<Cue, (v: Voice, dir: number) => void> = {
  tick(v) {
    tone(v, 2400, 1500, 0.045, 'triangle', 0.09, 0, false)
    hiss(v, 0.03, 6000, 4000, 1.2, 0.05)
  },
  bonk(v) {
    tone(v, 220, 140, 0.12, 'sine', 0.14, 0, false)
  },
  whoosh(v, dir) {
    hiss(v, 0.42, dir > 0 ? 380 : 2600, dir > 0 ? 2600 : 380, 0.9, 0.22)
    tone(v, 110, 70, 0.25, 'sine', 0.12)
  },
  open(v) {
    tone(v, 523, 784, 0.18, 'sine', 0.14)
    tone(v, 784, 1046, 0.3, 'sine', 0.1, 0.07)
    hiss(v, 0.35, 900, 5000, 0.7, 0.08)
  },
  close(v) {
    tone(v, 880, 523, 0.2, 'sine', 0.12)
    hiss(v, 0.3, 4000, 600, 0.7, 0.06)
  },
  hello(v) {
    ;[392, 494, 587, 740, 880].forEach((f, i) =>
      tone(v, f, f * 1.001, 1.1, 'sine', 0.07, i * 0.07),
    )
    tone(v, 196, 196, 1.6, 'triangle', 0.05)
  },
}
