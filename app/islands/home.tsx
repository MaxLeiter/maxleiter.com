import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  Counts,
  Key,
  PanelHead,
  SelBar,
  TopBar,
  type MeridianCounts,
} from '@components/meridian/chrome'
import { Emblem, RankIcon } from '@components/meridian/art'
import { pad2 } from '@lib/meridian'
import {
  PREFS_EVENT,
  QUALITIES,
  START_EVENT,
  STATS_EVENT,
  defaultPrefs,
  loadPrefs,
  rendererName,
  savePrefs,
  type Prefs,
  type SceneStats,
} from '@lib/meridian-prefs'
import type { Blip } from './home/audio'

/**
 * The MERIDIAN main menu.
 *
 * `app/pages/home.tsx` renders this with React at build time and the island
 * renders it again with preact as its first hydration pass, so the first
 * render reads nothing but props: settings, sound and the renderer report
 * all arrive in effects. Every menu entry is a real link, so the markup is
 * the whole menu with JavaScript off; the island adds arrow-key and gamepad
 * selection, the Settings screen and sound.
 *
 * Arrow selection IS DOM focus, so Tab, hover and the arrows always agree on
 * one item, and a polite live region repeats the selection for assistive
 * technology that ignores programmatic focus.
 */

export interface MenuEntry {
  label: string
  href: string
  /** The analytics `section` for `nav_click`. */
  section: string
  /** The description's bold first line. */
  title: string
  desc: string
}

export interface Extra {
  label: string
  href: string
  meta: string
}

export interface HomeProps {
  menu: MenuEntry[]
  extras: Extra[]
  counts: MeridianCounts
  rank: string
}

type Audio = typeof import('./home/audio')
type Input = 'key' | 'pad' | 'touch'

interface Option {
  key: Exclude<keyof Prefs, 'sound'> | 'sound'
  label: string
  range?: true
}

const OPTIONS: Option[] = [
  { key: 'sound', label: 'Sound' },
  { key: 'music', label: 'Music volume', range: true },
  { key: 'sfx', label: 'Effects volume', range: true },
  { key: 'motion', label: 'Motion' },
  { key: 'quality', label: 'Render quality' },
  { key: 'fps', label: 'Frame counter' },
]

function valueText(prefs: Prefs, key: Option['key']): string {
  const value = prefs[key]
  if (key === 'music' || key === 'sfx') return `${String(value)} of 10`
  if (key === 'motion') return value === 'full' ? 'Full' : 'Reduced'
  if (key === 'quality') {
    const name = String(value)
    return name[0].toUpperCase() + name.slice(1)
  }
  return value ? 'On' : 'Off'
}

function step(prefs: Prefs, key: Option['key'], dir: number): Prefs {
  if (key === 'music' || key === 'sfx') {
    return { ...prefs, [key]: Math.max(0, Math.min(10, prefs[key] + dir)) }
  }
  if (key === 'motion') {
    return { ...prefs, motion: prefs.motion === 'full' ? 'reduced' : 'full' }
  }
  if (key === 'quality') {
    const at = QUALITIES.indexOf(prefs.quality)
    const next = (at + dir + QUALITIES.length) % QUALITIES.length
    return { ...prefs, quality: QUALITIES[next] }
  }
  return { ...prefs, [key]: !prefs[key] }
}

const PAD_GLYPHS: Record<string, string> = {
  '↵': '①',
  Esc: '②',
  M: '④',
  '↑↓': '✚',
}

export default function Home({ menu, extras, counts, rank }: HomeProps) {
  const [sel, setSel] = useState(0)
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs)
  const [stats, setStats] = useState<SceneStats>({
    kind: 'none',
    adapter: '',
    fps: 0,
    scale: 1,
  })
  const [input, setInput] = useState<Input>('key')
  const [announce, setAnnounce] = useState('')

  const items = useRef<(HTMLElement | null)[]>([])
  const panel = useRef<HTMLElement | null>(null)
  const settingsButton = useRef<HTMLButtonElement | null>(null)
  const audio = useRef<Audio | null>(null)
  const live = useRef({ sel: 0, settings: false, prefs, input })
  live.current = { sel, settings, prefs, input }
  const announceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  const blip = (kind: Blip) => {
    if (live.current.prefs.sound) audio.current?.blip(kind)
  }

  const say = (text: string) => {
    clearTimeout(announceTimer.current)
    announceTimer.current = setTimeout(() => setAnnounce(text), 300)
  }

  /** Selection follows focus; `move` is the arrow-key and gamepad path. */
  const select = (index: number, { focus = true, speak = false } = {}) => {
    const count = items.current.filter(Boolean).length
    if (!count) return
    const next = Math.max(0, Math.min(count - 1, index))
    if (next !== live.current.sel) blip('move')
    setSel(next)
    const el = items.current[next]
    if (focus && el && document.activeElement !== el) {
      el.focus({ preventScroll: true })
    }
    if (speak && el) say(el.textContent?.replace(/^\d+/, '').trim() ?? '')
  }

  const options = () => [
    ...(panel.current?.querySelectorAll<HTMLButtonElement>('.mx-opt') ?? []),
  ]

  const moveOption = (dir: number) => {
    const list = options()
    if (!list.length) return
    const at = list.indexOf(document.activeElement as HTMLButtonElement)
    const next = list[Math.max(0, Math.min(list.length - 1, at + dir))]
    next.focus({ preventScroll: true })
    blip('move')
    say(next.getAttribute('aria-label') ?? next.textContent ?? '')
  }

  const applySound = async (on: boolean) => {
    if (on) {
      const mod = audio.current ?? (await import('./home/audio'))
      audio.current = mod
      mod.setMusic(live.current.prefs.music / 10)
      mod.setSfx(live.current.prefs.sfx / 10)
      mod.setEnabled(true)
      mod.blip('select')
    } else {
      audio.current?.setEnabled(false)
    }
  }

  const update = (next: Prefs) => {
    const before = live.current.prefs
    setPrefs(next)
    savePrefs(next)
    document.documentElement.toggleAttribute(
      'data-reduced-motion',
      next.motion === 'reduced',
    )
    dispatchEvent(new CustomEvent<Prefs>(PREFS_EVENT, { detail: next }))
    if (next.sound !== before.sound) void applySound(next.sound)
    if (next.music !== before.music) audio.current?.setMusic(next.music / 10)
    if (next.sfx !== before.sfx) audio.current?.setSfx(next.sfx / 10)
  }

  const toggleSound = () =>
    update({ ...live.current.prefs, sound: !live.current.prefs.sound })

  const change = (key: Option['key'], dir: number) => {
    update(step(live.current.prefs, key, dir))
    blip('tick')
  }

  const openSettings = () => {
    setSettings(true)
    blip('select')
  }

  const closeSettings = () => {
    setSettings(false)
    blip('back')
    settingsButton.current?.focus({ preventScroll: true })
  }

  const activate = () => {
    const el = items.current[live.current.sel]
    if (!el) return
    blip('select')
    el.click()
  }

  // Settings, the renderer report and the title screen hand-off.
  useEffect(() => {
    const saved = loadPrefs()
    setPrefs(saved)
    document.documentElement.toggleAttribute(
      'data-reduced-motion',
      saved.motion === 'reduced',
    )
    setReady(true)
    const onStats = (event: Event) =>
      setStats((event as CustomEvent<SceneStats>).detail)
    const onStart = () => {
      if (live.current.prefs.sound) audio.current?.blip('start')
    }
    addEventListener(STATS_EVENT, onStats)
    addEventListener(START_EVENT, onStart)
    return () => {
      removeEventListener(STATS_EVENT, onStats)
      removeEventListener(START_EVENT, onStart)
      clearTimeout(announceTimer.current)
      audio.current?.shutdown()
    }
  }, [])

  // Focus moves into the settings list when it opens.
  useEffect(() => {
    if (settings) options()[0]?.focus({ preventScroll: true })
  }, [settings])

  // Keyboard: arrows/WASD select, Enter activates, M toggles sound, Esc
  // leaves Settings. Inactive while the title screen is up (it owns every
  // key) and while focus is in the command palette.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return
      }
      if (document.documentElement.hasAttribute('data-title')) return
      const target = event.target instanceof Element ? event.target : null
      if (
        target?.closest('[data-island="palette"]') ||
        target?.matches('input')
      ) {
        return
      }
      if (live.current.input !== 'key') setInput('key')
      const key = event.key
      const up = key === 'ArrowUp' || key === 'w' || key === 'W'
      const down = key === 'ArrowDown' || key === 's' || key === 'S'
      if (live.current.settings) {
        const option = target?.closest<HTMLElement>('[data-opt]')
        if (up || down) {
          event.preventDefault()
          moveOption(up ? -1 : 1)
        } else if ((key === 'ArrowLeft' || key === 'ArrowRight') && option) {
          event.preventDefault()
          change(
            option.dataset.opt as Option['key'],
            key === 'ArrowLeft' ? -1 : 1,
          )
        } else if (key === 'Escape' || key === 'Backspace') {
          event.preventDefault()
          closeSettings()
        } else if (key === 'm' || key === 'M') {
          toggleSound()
        }
        return
      }
      if (up || down) {
        event.preventDefault()
        select(live.current.sel + (up ? -1 : 1), { speak: true })
      } else if (key === 'Home' || key === 'End') {
        event.preventDefault()
        select(key === 'Home' ? 0 : items.current.length - 1, { speak: true })
      } else if (key === 'Enter') {
        // A control Tab reached that is not the selection keeps its native
        // Enter; only an unfocused selection needs activating by hand.
        const el = items.current[live.current.sel]
        if (target?.matches('a, button') && target !== el) return
        event.preventDefault()
        activate()
      } else if (key === 'm' || key === 'M') {
        toggleSound()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Gamepad: polled only while one is connected. D-pad or left stick with
  // key repeat, ① select, ② back, ④ sound, Start dismisses the title.
  useEffect(() => {
    let frame = 0
    const held: Record<string, boolean> = {}
    const repeatAt: Record<string, number> = {}
    const fire = (name: string) => {
      setInput('pad')
      if (document.documentElement.hasAttribute('data-title')) {
        if (name === 'a' || name === 'start') {
          ;(window as { __mxStart?: () => void }).__mxStart?.()
        }
        return
      }
      const inSettings = live.current.settings
      if (name === 'up' || name === 'down') {
        if (inSettings) moveOption(name === 'up' ? -1 : 1)
        else
          select(live.current.sel + (name === 'up' ? -1 : 1), { speak: true })
      } else if (name === 'left' || name === 'right') {
        const option =
          document.activeElement?.closest<HTMLElement>('[data-opt]')
        if (inSettings && option) {
          change(option.dataset.opt as Option['key'], name === 'left' ? -1 : 1)
        }
      } else if (name === 'a') {
        if (inSettings) {
          const el = document.activeElement
          if (el instanceof HTMLElement) el.click()
        } else activate()
      } else if (name === 'b') {
        if (inSettings) closeSettings()
      } else if (name === 'y') {
        toggleSound()
      }
    }
    const poll = (now: number) => {
      const pads = navigator.getGamepads().filter((pad) => pad !== null)
      const pad = pads[0]
      if (!pad) {
        frame = 0
        return
      }
      frame = requestAnimationFrame(poll)
      const button = (i: number) => Boolean(pad.buttons[i]?.pressed)
      const axis = (i: number) => pad.axes[i] ?? 0
      const state: Record<string, boolean> = {
        up: button(12) || axis(1) < -0.55,
        down: button(13) || axis(1) > 0.55,
        left: button(14) || axis(0) < -0.55,
        right: button(15) || axis(0) > 0.55,
        a: button(0),
        b: button(1),
        y: button(3),
        start: button(9),
      }
      for (const [name, down] of Object.entries(state)) {
        const repeats =
          name === 'up' ||
          name === 'down' ||
          name === 'left' ||
          name === 'right'
        if (down && !held[name]) {
          repeatAt[name] = now + 380
          fire(name)
        } else if (down && repeats && now > repeatAt[name]) {
          repeatAt[name] = now + 110
          fire(name)
        }
        held[name] = down
      }
    }
    const start = () => {
      setInput('pad')
      if (!frame) frame = requestAnimationFrame(poll)
    }
    addEventListener('gamepadconnected', start)
    if (navigator.getGamepads().some((pad) => pad !== null)) start()
    return () => {
      removeEventListener('gamepadconnected', start)
      cancelAnimationFrame(frame)
    }
  }, [])

  const onPointer = (index: number) => (event: ReactPointerEvent) => {
    if (event.pointerType === 'mouse') select(index)
    else if (live.current.input !== 'touch') setInput('touch')
  }

  const glyph = (key: string) =>
    input === 'pad' ? (PAD_GLYPHS[key] ?? key) : key
  const current = menu[sel]
  const desc = current
    ? current
    : {
        title: 'System',
        desc: `Sound, motion and render quality. Renderer: ${rendererName(stats.kind)}.`,
      }

  return (
    <div className="mx-home" data-input={input}>
      <a className="mx-skip" href="#main">
        Skip to content
      </a>
      <div className="mx-page">
        <TopBar crumbs={[{ label: settings ? 'Settings' : 'Main menu' }]}>
          <span className="mx-net">
            <i aria-hidden="true" />
            Online
          </span>
          <button
            type="button"
            className={
              prefs.sound ? 'mx-chip mx-sound mx-on' : 'mx-chip mx-sound'
            }
            aria-pressed={prefs.sound}
            onClick={toggleSound}
            title="Toggle sound (M)"
          >
            <span className="mx-eq" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>{prefs.sound ? 'Sound on' : 'Sound off'}</span>
          </button>
          <button
            type="button"
            className="mx-chip"
            data-open-palette
            aria-label="Search (⌘K)"
          >
            <span className="mx-chip-label">Search</span>
            <span className="mx-key" aria-hidden="true">
              ⌘K
            </span>
          </button>
        </TopBar>
        <main id="main" className="mx-wrap mx-main mx-home-main" tabIndex={-1}>
          <h1 className="mx-sr">Max Leiter: main menu</h1>
          <nav className="mx-sheet" aria-label="Main menu">
            <ul className="mx-menu">
              {menu.map((entry, index) => (
                <li key={entry.href}>
                  <a
                    className={
                      index === sel && !settings ? 'mx-mi mx-sel' : 'mx-mi'
                    }
                    href={entry.href}
                    data-track="nav_click"
                    data-section={entry.section}
                    ref={(el) => {
                      items.current[index] = el
                    }}
                    onPointerEnter={onPointer(index)}
                    onFocus={() => setSel(index)}
                  >
                    <SelBar />
                    <span className="mx-num">{pad2(index + 1)}</span>
                    <span className="mx-lbl">{entry.label}</span>
                  </a>
                </li>
              ))}
              <li hidden={!ready}>
                <button
                  type="button"
                  className={
                    sel === menu.length || settings ? 'mx-mi mx-sel' : 'mx-mi'
                  }
                  aria-expanded={settings}
                  aria-controls="mx-settings"
                  ref={(el) => {
                    items.current[menu.length] = el
                    settingsButton.current = el
                  }}
                  onPointerEnter={onPointer(menu.length)}
                  onFocus={() => setSel(menu.length)}
                  onClick={() => (settings ? closeSettings() : openSettings())}
                >
                  <SelBar />
                  <span className="mx-num">{pad2(menu.length + 1)}</span>
                  <span className="mx-lbl">Settings</span>
                </button>
              </li>
            </ul>
            <p className="mx-menu-desc">
              <b>{desc.title}</b>
              {desc.desc}
            </p>
          </nav>
          {settings ? (
            <section
              className="mx-panel mx-settings"
              id="mx-settings"
              aria-labelledby="mx-settings-h"
              ref={panel}
            >
              <PanelHead id="mx-settings-h" aside="Audio · video">
                Settings
              </PanelHead>
              <ul className="mx-opts">
                {OPTIONS.map((option) => {
                  const text = valueText(prefs, option.key)
                  const value = prefs[option.key]
                  return (
                    <li key={option.key}>
                      <button
                        type="button"
                        className="mx-opt"
                        data-opt={option.key}
                        aria-label={`${option.label}: ${text}`}
                        onClick={() => change(option.key, 1)}
                      >
                        <SelBar />
                        <span>{option.label}</span>
                        <span className="mx-val">
                          <span className="mx-arr" aria-hidden="true">
                            ‹
                          </span>
                          {option.range && typeof value === 'number' ? (
                            <span className="mx-pip-row" aria-hidden="true">
                              {Array.from({ length: 10 }, (_, k) => (
                                <i
                                  key={k}
                                  className={k < value ? 'mx-on' : undefined}
                                />
                              ))}
                            </span>
                          ) : (
                            <span>{text}</span>
                          )}
                          <span className="mx-arr" aria-hidden="true">
                            ›
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
                <li>
                  <button
                    type="button"
                    className="mx-opt mx-opt-wide"
                    onClick={() =>
                      update({ ...defaultPrefs(), sound: prefs.sound })
                    }
                  >
                    <SelBar />
                    <span>Restore defaults</span>
                  </button>
                </li>
              </ul>
              <dl className="mx-sys">
                <dt>Renderer</dt>
                <dd>{rendererName(stats.kind)}</dd>
                <dt>Adapter</dt>
                <dd>{stats.adapter || '—'}</dd>
                <dt>Render scale</dt>
                <dd>
                  {Math.round(stats.scale * 100)}%
                  {prefs.quality === 'auto' ? ' · dynamic' : ' · fixed'}
                </dd>
                <dt>Frame rate</dt>
                <dd>{stats.fps ? `${Math.round(stats.fps)} fps` : '—'}</dd>
                <dt>Input</dt>
                <dd>
                  {input === 'pad'
                    ? 'Gamepad'
                    : input === 'touch'
                      ? 'Touch'
                      : 'Keyboard & mouse'}
                </dd>
              </dl>
              <div className="mx-settings-foot">
                <button
                  type="button"
                  className="mx-cta mx-ghost"
                  onClick={closeSettings}
                >
                  ‹ Back
                </button>
              </div>
            </section>
          ) : (
            <section className="mx-panel mx-lobby" aria-labelledby="mx-party">
              <PanelHead id="mx-party" aside="1 / 4 · Open">
                Party
              </PanelHead>
              <div className="mx-tag-card">
                <Emblem id="mx-e1" />
                <div>
                  <p className="mx-gt">Max Leiter</p>
                  <p className="mx-gt-sub">Engineer · Anthropic</p>
                  <p className="mx-gt-row">
                    <span className="mx-stag">ML26</span>
                    <RankIcon />
                    <span>{rank}</span>
                  </p>
                </div>
              </div>
              <ul className="mx-slots">
                {extras.map((extra) => (
                  <li key={extra.href}>
                    <a className="mx-slot" href={extra.href}>
                      <span className="mx-sq" aria-hidden="true" />
                      <span>{extra.label}</span>
                      <em>{extra.meta}</em>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mx-lobby-foot">
                <span className="mx-live">● Party leader</span>
                <span>maxleiter.com</span>
              </p>
            </section>
          )}
        </main>
        <footer className="mx-hints">
          <div className="mx-wrap mx-hints-in">
            <div className="mx-hints-l">
              {settings ? (
                <>
                  <span className="mx-hint">
                    <Key>{glyph('↑↓')}</Key>Browse
                  </span>
                  <span className="mx-hint">
                    <Key>‹ ›</Key>Change
                  </span>
                  <button
                    type="button"
                    className="mx-hint"
                    onClick={closeSettings}
                  >
                    <Key>{glyph('Esc')}</Key>Back
                  </button>
                </>
              ) : (
                <>
                  <span className="mx-hint">
                    <Key>{glyph('↑↓')}</Key>Browse
                  </span>
                  <button type="button" className="mx-hint" onClick={activate}>
                    <Key>{glyph('↵')}</Key>Select
                  </button>
                  <button
                    type="button"
                    className="mx-hint"
                    onClick={toggleSound}
                  >
                    <Key>{glyph('M')}</Key>Sound
                  </button>
                </>
              )}
            </div>
            <Counts counts={counts} />
          </div>
        </footer>
      </div>
      <div className="mx-sr" aria-live="polite" aria-atomic="true">
        {announce}
      </div>
      {prefs.fps && (
        <p className="mx-fps" aria-hidden="true">
          {Math.round(stats.fps)} FPS · {Math.round(stats.scale * 100)}% ·{' '}
          {rendererName(stats.kind)}
        </p>
      )}
    </div>
  )
}
