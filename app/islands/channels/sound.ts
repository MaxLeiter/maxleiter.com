/**
 * Interface sounds, synthesized: no samples ship. Muted until the visitor
 * turns them on, and never the only cue for anything.
 *
 * One instance for the page's lifetime, not one per scene: the scene is torn
 * down on every soft navigation, and an AudioContext made again later has no
 * user gesture to start it. The choice itself is kept for the session.
 *
 * iOS is the hard case, and each rule below is one it enforces:
 * - The context is created and `resume()`d synchronously inside the gesture
 *   that turns sound on. Nothing async may come first.
 * - Web Audio obeys the ring/silent switch unless the audio session says it
 *   is playback: `navigator.audioSession.type` where Safari 17+ has it, and a
 *   looping silent `<audio>` element otherwise, which moves the page into the
 *   media category for as long as it plays.
 * - A backgrounded tab, a call or Siri suspends or "interrupts" the context;
 *   it is resumed on return, or on the next gesture if Safari wants one.
 */

export type Cue = 'tick' | 'bonk' | 'whoosh' | 'open' | 'close' | 'hello'

interface Voice {
  ac: AudioContext
  master: GainNode
  verb: GainNode
  noise: AudioBuffer
}

const KEY = 'ch-sound'

/** 0.1 s of 8 kHz mono silence as a WAV, for the media-session unlock. */
function silentWav(): string {
  const samples = 800
  const bytes = new Uint8Array(44 + samples)
  const view = new DataView(bytes.buffer)
  const text = (at: number, s: string) =>
    [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 8000, true)
  view.setUint32(28, 8000, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  text(36, 'data')
  view.setUint32(40, samples, true)
  bytes.fill(128, 44)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return `data:audio/wav;base64,${btoa(binary)}`
}

function buildGraph(ac: AudioContext): Voice {
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

interface AudioSessionNavigator {
  audioSession?: { type: string }
}

class SoundBank {
  private voice: Voice | null = null
  private keepAlive: HTMLAudioElement | null = null
  private pendingGesture = false
  on = false

  constructor() {
    try {
      this.on = sessionStorage.getItem(KEY) === 'on'
    } catch {
      this.on = false
    }
    if (typeof document === 'undefined') return
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.keepAlive?.pause()
        void this.voice?.ac.suspend()
      } else if (this.on) {
        this.wake()
      }
    })
    // Sound was on before a reload: it starts again on the first gesture.
    if (this.on) this.awaitGesture()
  }

  /** Synchronous, so it can sit directly inside a gesture handler. */
  private unlock(): void {
    const session = (navigator as AudioSessionNavigator).audioSession
    if (session) {
      try {
        session.type = 'playback'
      } catch {
        // Not settable here; the <audio> element below covers it.
      }
    }
    if (!this.voice) {
      const Ctor =
        window.AudioContext ??
        (window as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!Ctor) return
      const ac = new Ctor()
      this.voice = buildGraph(ac)
      ac.addEventListener('statechange', () => {
        // 'interrupted' is Safari's: a call, Siri, another app's audio.
        const state = ac.state as string
        if (this.on && state !== 'running' && !document.hidden) this.wake()
      })
    }
    void this.voice.ac.resume()
    if (!session) {
      this.keepAlive ??= Object.assign(new Audio(silentWav()), { loop: true })
      this.keepAlive.setAttribute('playsinline', '')
      void this.keepAlive.play().catch(() => undefined)
    }
  }

  /** Resume now if the browser allows it, else on the next gesture. */
  private wake(): void {
    if (!this.voice) {
      this.awaitGesture()
      return
    }
    void this.voice.ac
      .resume()
      .then(() => {
        if (this.voice?.ac.state !== 'running') this.awaitGesture()
      })
      .catch(() => this.awaitGesture())
    if (this.keepAlive) void this.keepAlive.play().catch(() => undefined)
  }

  private awaitGesture(): void {
    if (this.pendingGesture || typeof document === 'undefined') return
    this.pendingGesture = true
    const go = () => {
      this.pendingGesture = false
      for (const type of TYPES) document.removeEventListener(type, go, true)
      if (this.on) this.unlock()
    }
    const TYPES = ['pointerdown', 'touchend', 'keydown'] as const
    for (const type of TYPES) document.addEventListener(type, go, true)
  }

  /** Flips the setting. Call it straight from the click handler. */
  toggle(): boolean {
    this.on = !this.on
    try {
      sessionStorage.setItem(KEY, this.on ? 'on' : 'off')
    } catch {
      // A private window keeps the choice for this page only.
    }
    if (this.on) {
      this.unlock()
      this.play('hello')
    } else {
      this.keepAlive?.pause()
      void this.voice?.ac.suspend()
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

  /** The context, for tests that want to see it running. */
  get context(): AudioContext | null {
    return this.voice?.ac ?? null
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
  // `currentTime` can lag `resume()` by a frame; never schedule in the past.
  const t = v.ac.currentTime + 0.01 + delay
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
  const t = v.ac.currentTime + 0.01
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
  // The confirmation: a clear blip first, so turning sound on is audible at
  // once, then the chord.
  hello(v) {
    tone(v, 1320, 1320, 0.09, 'triangle', 0.16, 0, false)
    ;[392, 494, 587, 740, 880].forEach((f, i) =>
      tone(v, f, f * 1.001, 1.1, 'sine', 0.07, 0.08 + i * 0.07),
    )
    tone(v, 196, 196, 1.6, 'triangle', 0.05, 0.08)
  },
}

export const sound = new SoundBank()
