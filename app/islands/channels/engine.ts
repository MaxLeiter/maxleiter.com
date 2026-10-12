import {
  type Channel,
  type Item,
  panelRect,
  type SceneState,
  type ScreenRect,
  viewport,
  type Viewport,
} from './layout'
import { clamp, lerp, sstep, Spring } from './math'
import { createRenderer, type Renderer } from './renderer'
import { sound } from './sound'

/**
 * The channel room: takes over the server-rendered dashboard with a WebGL2
 * scene, and gives it back on teardown.
 *
 * The dashboard's links stay the source of truth. Arrow keys and the gamepad
 * move DOM focus onto the current tile's link, and focusing a link (Tab, a
 * screen reader) moves the scene, so the two always agree. Opening a tile
 * that is a page on this site flips it into the reader panel and then clicks
 * its link, so the router carries the flip on into the article; a tile that
 * leaves the site opens the scene's own reader dialog first.
 *
 * `boot` returns a teardown and does nothing at all where the scene cannot
 * run well: no WebGL2, a software-only context, Save-Data, or `?scene=off`.
 */

const noop = () => undefined

interface Connection {
  saveData?: boolean
}

const MOTION_KEY = 'ch-motion'

/** The label styles updateHUD writes, and teardown takes back. */
const LABEL_PROPS = [
  'height',
  'font-size',
  '--sc',
  'transform',
  'opacity',
  'pointer-events',
]

/** How many times a scene has started in this page's life, for the tests. */
let boots = 0

function readMotionPref(): string | null {
  try {
    return localStorage.getItem(MOTION_KEY)
  } catch {
    return null
  }
}

function esc(text: string): string {
  return text.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c,
  )
}

/** The channels and their items, read back out of the dashboard's markup. */
function readModel(root: HTMLElement): Channel[] {
  const labels = [...root.querySelectorAll<HTMLAnchorElement>('.ch-chan')]
  return [...root.querySelectorAll<HTMLElement>('.ch-row')].map(
    (row, chan) => ({
      id: row.id.replace(/^ch-/, ''),
      name: row.querySelector('.ch-row-h')?.textContent ?? '',
      hue: Number(row.dataset.hue) || 205,
      label: labels[chan],
      items: [...row.querySelectorAll<HTMLAnchorElement>('a.ch-tile')].map(
        (link, index) => {
          const d = link.dataset
          // The meta line and the chip are already in the cover's own type.
          const text = (selector: string) =>
            link.querySelector(selector)?.textContent ?? ''
          return {
            chan,
            index,
            seed: d.seed ?? '',
            title: d.title ?? '',
            date: d.date ?? '',
            desc: d.desc ?? '',
            chip: text('.cv-c'),
            meta: text('.cv-m'),
            href: link.href,
            external: d.ext !== undefined,
            art: link.querySelector('img')?.src ?? '',
            link,
          }
        },
      ),
    }),
  )
}

const HUD_HTML =
  '<div class="ch-cap"><div class="ch-cap-k"></div><div class="ch-cap-t"></div><div class="ch-cap-d"></div></div>' +
  '<div class="ch-pips"></div>' +
  '<div class="ch-guide">' +
  '<span class="ch-guide-keys"><span class="ui-key">← →</span>Browse</span>' +
  '<span class="ch-guide-keys"><span class="ui-key">↑ ↓</span>Channels</span>' +
  '<span class="ch-guide-keys"><span class="ui-key">Enter</span>Open</span>' +
  '<span class="ch-guide-keys"><span class="ui-key">Esc</span>Back</span>' +
  '<span class="ch-guide-touch"><span class="ui-key">← →</span>Swipe</span>' +
  '<span class="ch-guide-touch"><span class="ui-key">↑ ↓</span>Channels</span>' +
  '<span class="ch-guide-touch"><span class="ui-key">Tap</span>Open</span>' +
  '<span class="ch-guide-pad"><span class="ui-key">Pad</span>Controller connected</span>' +
  '</div>'

const READER_HTML =
  '<div class="ui-bar"><span class="ui-crumbs ch-reader-k"></span>' +
  '<button class="ui-back" type="button" aria-label="Back to channels (Escape)">' +
  '<span class="ui-key" aria-hidden="true">Esc</span><span aria-hidden="true">Back</span></button></div>' +
  '<div class="ch-reader-body"><div class="ch-reader-art"></div><h2 id="ch-reader-title" class="ui-title ch-reader-title" tabindex="-1"></h2>' +
  '<p class="ch-reader-text"></p>' +
  '<a class="ch-go" href="/"><span class="ui-key" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M12.5 3.5v4a2 2 0 0 1-2 2h-7M6.5 6.5l-3 3 3 3"/></svg></span><span class="ch-go-l"></span></a></div>'

/**
 * Whether the homepage should start in the room's resting layout: on <html>
 * for this document, and in storage for the next hard load, where
 * SCENE_SCRIPT (app/components/top-bar.tsx) reads it before first paint.
 */
function rememberScene(on: boolean, persist = true): void {
  const html = document.documentElement
  if (on) html.dataset.scene = 'room'
  else delete html.dataset.scene
  if (!persist) return
  try {
    if (on) localStorage.setItem('ch-scene', 'room')
    else localStorage.removeItem('ch-scene')
  } catch {
    // Without storage the next visit simply starts flat.
  }
}

/** Gives the page back to the flat dashboard before anything was taken. */
function decline(persist = true): () => void {
  rememberScene(false, persist)
  return noop
}

/**
 * Whether the scene is arriving after the page has been on screen for a
 * while. Then nothing may play an entrance: the room fades in, matched to
 * what is already there.
 */
function arrivingLate(): boolean {
  if (document.documentElement.dataset.scene) return true
  const nav = performance.getEntriesByType('navigation')[0]
  if (!nav || new URL(nav.name).pathname !== location.pathname) return true
  const paint = performance.getEntriesByName('first-contentful-paint')[0]
  return !paint || performance.now() - paint.startTime > 300
}

export function boot(root: HTMLElement): () => void {
  const query = new URLSearchParams(location.search).get('scene')
  if (query === 'off') return decline(false)
  const connection = (navigator as { connection?: Connection }).connection
  if (connection?.saveData && query !== 'force') return decline(false)
  const late = arrivingLate()

  const canvas = document.createElement('canvas')
  canvas.className = 'ch-gl'
  canvas.setAttribute('aria-hidden', 'true')
  const context = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    // A software rasterizer draws this scene at well under a frame a second
    // and blocks the main thread doing it. The flat dashboard is better.
    failIfMajorPerformanceCaveat: query !== 'force',
  })
  if (!context) return decline()
  const gl: WebGL2RenderingContext = context

  boots++
  let introState: 'played' | 'skipped' = 'skipped'
  const channels = readModel(root)
  if (channels.length === 0 || channels.some((c) => !c.label)) return decline()
  const found = {
    main: root.querySelector<HTMLElement>('.ch-main'),
    nav: root.querySelector<HTMLElement>('.ch-chans'),
    top: root.querySelector<HTMLElement>('.ui-top'),
    motion: root.querySelector<HTMLButtonElement>('.ch-mot'),
    sound: root.querySelector<HTMLButtonElement>('.ch-snd'),
    clock: root.querySelector<HTMLElement>('.ch-clock'),
  }
  if (Object.values(found).some((el) => !el)) return decline()
  // Re-bound as non-null: the checks above do not narrow inside the hoisted
  // function declarations below.
  const main = found.main as HTMLElement
  const nav = found.nav as HTMLElement
  const top = found.top as HTMLElement
  const motionBtn = found.motion as HTMLButtonElement
  const soundBtn = found.sound as HTMLButtonElement
  const clock = found.clock as HTMLElement

  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)')
  let motionPref = readMotionPref()
  const S: SceneState = {
    chan: 0,
    idx: channels.map(() => 0),
    chanS: new Spring(0, 7.5, 0.86),
    rowS: channels.map(() => new Spring(0, 10, 0.8)),
    open: null,
    openT: 0,
    sweep: new Map(),
    hover: -1,
    t: 0,
    lastInput: 0,
    mx: 0,
    my: 0,
    reduced: motionPref ? motionPref === 'reduced' : reducedQuery.matches,
  }
  /** `page` flips into the article's panel; `reader` into the dialog. */
  let openMode: 'page' | 'reader' = 'reader'
  let inputMode: 'key' | 'pointer' = 'key'

  let maxDpr = 2
  let renderer: Renderer
  try {
    renderer = createRenderer(canvas, gl, channels, S, {
      font: getComputedStyle(document.body).fontFamily,
      maxDpr: () => maxDpr,
    })
  } catch (error) {
    console.warn('channels: renderer failed', error)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return decline()
  }

  /* ------------------------------------------------------- take over -- */

  const cleanups: (() => void)[] = []
  /** addEventListener, undone by teardown. Handlers name their event type. */
  const on = (
    target: Window | Document | HTMLElement,
    type: string,
    fn: (event: never) => void,
    opts?: AddEventListenerOptions,
  ) => {
    const listener = fn as EventListener
    target.addEventListener(type, listener, opts)
    cleanups.push(() => target.removeEventListener(type, listener, opts))
  }

  const hud = document.createElement('div')
  hud.className = 'ch-hud'
  hud.setAttribute('aria-hidden', 'true')
  hud.innerHTML = HUD_HTML
  const ring = document.createElement('div')
  ring.className = 'ch-ring'
  ring.setAttribute('aria-hidden', 'true')
  const reader = document.createElement('div')
  reader.className = 'ch-reader'
  reader.setAttribute('role', 'dialog')
  reader.setAttribute('aria-modal', 'true')
  reader.setAttribute('aria-labelledby', 'ch-reader-title')
  reader.hidden = true
  reader.innerHTML = READER_HTML
  const live = document.createElement('div')
  live.className = 'ui-sr'
  live.setAttribute('aria-live', 'polite')
  live.setAttribute('aria-atomic', 'true')
  const status = document.createElement('div')
  status.className = 'ui-sr'
  status.setAttribute('role', 'status')
  const help = document.createElement('p')
  help.className = 'ui-sr'
  help.textContent =
    'Every tile in the room is a link below. Left and right arrows move between items, up and down switch channels, Enter opens. Tab works too.'
  main.querySelector('h1')?.after(help)

  // Hidden until the first frames are up: the HUD floats over the flat
  // dashboard otherwise, and the labels would jump into their 3D places.
  root.classList.add('ch-boot')
  root.insertBefore(canvas, nav)
  root.append(hud, ring, reader, live, status)
  const added: Element[] = [canvas, hud, ring, reader, live, status, help]

  const cap = hud.querySelector<HTMLElement>('.ch-cap') as HTMLElement
  const pips = hud.querySelector<HTMLElement>('.ch-pips') as HTMLElement
  const guide = hud.querySelector<HTMLElement>('.ch-guide') as HTMLElement
  const padHint = hud.querySelector<HTMLElement>('.ch-guide-pad') as HTMLElement
  const readerTitle = reader.querySelector<HTMLElement>(
    '.ch-reader-title',
  ) as HTMLElement
  const readerBody = reader.querySelector<HTMLElement>(
    '.ch-reader-body',
  ) as HTMLElement
  const readerGo = reader.querySelector<HTMLAnchorElement>(
    '.ch-go',
  ) as HTMLAnchorElement

  // In the room a click is a flip, not a morph from a hidden link.
  const vtNames = new Map<HTMLAnchorElement, string>()
  for (const channel of channels) {
    for (const item of channel.items) {
      const name = item.link.dataset.vtName
      if (name) {
        vtNames.set(item.link, name)
        delete item.link.dataset.vtName
      }
    }
  }

  motionBtn.hidden = false
  soundBtn.hidden = false
  const originalTitle = document.title
  const originalHue = root.style.getPropertyValue('--ui-hue')

  /* ---------------------------------------------------------- a11y -- */

  const itemOf = (el: Element | null) => {
    const link = el?.closest<HTMLAnchorElement>('a.ch-tile')
    if (!link) return null
    const chan = Number(link.dataset.ch)
    const index = Number(link.dataset.i)
    return channels[chan]?.items[index] ?? null
  }
  const current = () => channels[S.chan].items[S.idx[S.chan]]

  /** Keeps DOM focus on the tile the scene shows, unless a pointer drives. */
  function syncFocus(): boolean {
    if (inputMode === 'pointer') return false
    const active = document.activeElement
    if (
      active &&
      (active === document.body ||
        main.contains(active) ||
        nav.contains(active))
    ) {
      const link = current().link
      if (active !== link) link.focus({ preventScroll: true })
      return true
    }
    return false
  }

  let liveTimer = 0
  function announce(message: string): void {
    clearTimeout(liveTimer)
    liveTimer = window.setTimeout(() => {
      live.textContent = ''
      window.setTimeout(() => {
        live.textContent = message
      }, 30)
    }, 320)
  }
  const itemSpeech = (chan = S.chan) => {
    const item = channels[chan].items[S.idx[chan]]
    return `${item.title}${item.date ? `, ${item.date}` : ''}. ${S.idx[chan] + 1} of ${channels[chan].items.length}.`
  }

  /** The live channel, for assistive tech; set with the state, not a frame. */
  function markChannel(): void {
    channels.forEach((c, ci) => {
      if (ci === S.chan) c.label.setAttribute('aria-current', 'true')
      else c.label.removeAttribute('aria-current')
    })
  }

  function setTitle(): void {
    if (S.open && openMode === 'reader') {
      document.title = `${S.open.title} | Max Leiter`
    } else {
      document.title =
        S.chan === 0 ? originalTitle : `${channels[S.chan].name} | Max Leiter`
    }
  }

  function applyMotion(): void {
    S.chanS.w = S.reduced ? 13 : 7.5
    S.chanS.z = S.reduced ? 1 : 0.86
    for (const s of S.rowS) {
      s.w = S.reduced ? 16 : 10
      s.z = S.reduced ? 1 : 0.8
    }
    motionBtn.setAttribute('aria-pressed', String(S.reduced))
    const label = motionBtn.querySelector('.ui-pill-label')
    if (label) label.textContent = S.reduced ? 'Calm' : 'Motion'
  }
  applyMotion()

  const onMotionChange = (event: MediaQueryListEvent) => {
    if (motionPref) return
    S.reduced = event.matches
    applyMotion()
  }
  reducedQuery.addEventListener('change', onMotionChange)
  cleanups.push(() =>
    reducedQuery.removeEventListener('change', onMotionChange),
  )

  on(motionBtn, 'click', () => {
    S.reduced = !S.reduced
    motionPref = S.reduced ? 'reduced' : 'full'
    try {
      localStorage.setItem(MOTION_KEY, motionPref)
    } catch {
      // A private window keeps the choice for this visit only.
    }
    applyMotion()
    status.textContent = S.reduced ? 'Reduced motion on' : 'Full motion on'
  })

  function showSound(): void {
    soundBtn.setAttribute('aria-pressed', String(sound.on))
    const label = soundBtn.querySelector('.ui-pill-label')
    if (label) label.textContent = sound.on ? 'Sound on' : 'Sound off'
  }
  // The setting outlives the scene: a soft navigation back keeps it.
  showSound()

  /** Synchronous all the way to `resume()`: iOS needs the gesture. */
  function toggleSound(): void {
    sound.toggle()
    showSound()
    status.textContent = sound.on
      ? 'Interface sounds on'
      : 'Interface sounds off'
  }
  on(soundBtn, 'click', toggleSound)

  const tickClock = () => {
    clock.textContent = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  tickClock()
  const clockTimer = window.setInterval(tickClock, 15000)
  cleanups.push(() => {
    clearInterval(clockTimer)
    clock.textContent = ''
  })

  /* ------------------------------------------------------- actions -- */

  const touch = () => {
    S.lastInput = S.t
  }
  let lastSweep = -9
  /** Rate-limited, so nothing flashes more than three times a second. */
  function markSweep(): void {
    if (S.t - lastSweep < 0.4) return
    lastSweep = S.t
    S.sweep.set(current(), S.t + 0.05)
  }

  function focusIndex(i: number, fromFocus = false): void {
    const n = channels[S.chan].items.length
    const next = clamp(i, 0, n - 1)
    if (next === S.idx[S.chan]) {
      if (i !== next) {
        sound.play('bonk')
        S.rowS[S.chan].vel += (i > next ? 1 : -1) * 3
      }
      return
    }
    S.idx[S.chan] = next
    S.rowS[S.chan].t = next
    sound.play('tick')
    markSweep()
    touch()
    if (!S.reduced && Math.random() < 0.3) renderer.avatar.present = S.t
    if (!fromFocus && !syncFocus()) announce(itemSpeech())
  }

  const move = (d: number) => {
    if (!S.open) focusIndex(S.idx[S.chan] + d)
  }

  function setChannel(ci: number, fromFocus = false): void {
    if (S.open) return
    const next = clamp(ci, 0, channels.length - 1)
    if (next === S.chan) {
      if (ci !== next) {
        sound.play('bonk')
        S.chanS.vel += (ci > next ? 1 : -1) * 2
      }
      return
    }
    sound.play('whoosh', next > S.chan ? 1 : -1)
    S.chan = next
    S.chanS.t = next
    lastSweep = -9
    markSweep()
    touch()
    setTitle()
    markChannel()
    const av = renderer.avatar
    if (!S.reduced && S.t - av.wave > 5) {
      av.wave = S.t + 0.25
      av.hop.vel = 4
    }
    if (!fromFocus) {
      const moved = syncFocus()
      announce(
        `${channels[next].name} channel, ${channels[next].items.length} items.${moved ? '' : ` ${itemSpeech(next)}`}`,
      )
    }
  }

  let returnFocus: HTMLElement | null = null
  let navTimer = 0
  const inertTargets = [main, nav, top]

  function openItem(): void {
    if (S.open) return
    const item = current()
    S.open = item
    touch()
    openMode = item.external ? 'reader' : 'page'
    const vp = viewport()
    renderer.prepareBack(item, vp, openMode)
    sound.play('open')
    if (openMode === 'page') {
      // Warm the router's cache while the tile flips: its prefetch listens
      // for pointer events on links, in the capture phase.
      item.link.dispatchEvent(new Event('pointerenter'))
      navTimer = window.setTimeout(
        () => {
          if (S.open === item) item.link.click()
        },
        S.reduced ? 160 : 760,
      )
      return
    }
    returnFocus = document.activeElement as HTMLElement | null
    reader.hidden = false
    for (const el of inertTargets) el.inert = true
    setTitle()
    const kicker = reader.querySelector('.ch-reader-k')
    if (kicker) {
      kicker.innerHTML = `${esc(channels[S.chan].name)} <span class="ui-crumbs-meta">${esc(item.date || item.meta.split('·').pop()?.trim() || '')}</span>`
    }
    readerTitle.textContent = item.title
    const art = reader.querySelector('.ch-reader-art')
    const cover = item.link.querySelector('.cv-box')
    if (art && cover) art.replaceChildren(cover.cloneNode(true))
    const text = reader.querySelector('.ch-reader-text')
    if (text) text.textContent = item.desc
    readerGo.href = item.href
    const label = readerGo.querySelector('.ch-go-l')
    if (label) {
      let host = ''
      try {
        host = new URL(item.href).host.replace(/^www\./, '')
      } catch {
        host = ''
      }
      label.textContent = item.href.endsWith('.xml')
        ? 'Open the feed'
        : `Visit ${host || 'link'}`
    }
    readerBody.scrollTop = 0
    window.setTimeout(
      () => {
        if (S.open === item) readerTitle.focus({ preventScroll: true })
      },
      S.reduced ? 50 : 700,
    )
  }

  function closeItem(): void {
    if (!S.open) return
    const wasReader = openMode === 'reader' && !reader.hidden
    S.open = null
    clearTimeout(navTimer)
    sound.play('close')
    touch()
    for (const el of inertTargets) el.inert = false
    setTitle()
    if (!wasReader) return
    const link = current().link
    if (
      returnFocus &&
      returnFocus !== document.body &&
      document.contains(returnFocus)
    ) {
      ;(main.contains(returnFocus) ? link : returnFocus).focus({
        preventScroll: true,
      })
    } else if (reader.contains(document.activeElement)) {
      ;(document.activeElement as HTMLElement).blur()
    }
  }

  on(reader.querySelector('.ui-back') as HTMLElement, 'click', closeItem)

  /* --------------------------------------------------------- input -- */

  const palette = () =>
    document.querySelector<HTMLElement>('[data-island="palette"]')
  const paletteOpen = () => {
    const el = palette()
    return Boolean(el && !el.hidden)
  }

  on(nav, 'click', (event: MouseEvent) => {
    const label = (event.target as Element).closest<HTMLAnchorElement>(
      '.ch-chan',
    )
    if (!label) return
    event.preventDefault()
    setChannel(Number(label.dataset.chChan))
  })

  on(main, 'focusin', (event: FocusEvent) => {
    const item = itemOf(event.target as Element)
    if (!item) return
    root.classList.add('ch-kbd')
    if (item.chan !== S.chan) setChannel(item.chan, true)
    if (item.index !== S.idx[item.chan]) focusIndex(item.index, true)
  })
  on(main, 'focusout', () => root.classList.remove('ch-kbd'))
  // Activating a tile link -- a screen reader's click, a pointer on the
  // link itself -- opens it in the room first. The engine's own
  // `link.click()` after the flip is untrusted, so it passes on to the router.
  on(main, 'click', (event: MouseEvent) => {
    const item = itemOf(event.target as Element)
    if (!item || !event.isTrusted) return
    event.preventDefault()
    openItem()
  })

  const skip = root.querySelector<HTMLAnchorElement>('.ui-skip')
  if (skip) {
    on(skip, 'click', (event: MouseEvent) => {
      event.preventDefault()
      current().link.focus()
    })
  }

  on(window, 'keydown', (event: KeyboardEvent) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.defaultPrevented
    )
      return
    if (paletteOpen()) return
    const target = event.target as HTMLElement | null
    if (target?.closest('input, textarea, [contenteditable]')) return
    inputMode = 'key'
    const k = event.key
    if (k === 'm' || k === 'M') {
      toggleSound()
      return
    }
    if (S.open) {
      if (k === 'Escape' || k === 'Backspace') {
        event.preventDefault()
        closeItem()
      }
      if (k === 'Tab' && !reader.hidden) {
        const focusable = [
          ...reader.querySelectorAll<HTMLElement>(
            'button, a[href], [tabindex="-1"]',
          ),
        ].filter((el) => el.offsetParent)
        const at = focusable.indexOf(document.activeElement as HTMLElement)
        if (event.shiftKey && at <= 0) {
          event.preventDefault()
          focusable[focusable.length - 1]?.focus()
        } else if (!event.shiftKey && at === focusable.length - 1) {
          event.preventDefault()
          focusable[0]?.focus()
        }
      }
      return
    }
    const keys: Record<string, () => void> = {
      ArrowLeft: () => move(-1),
      ArrowRight: () => move(1),
      ArrowUp: () => setChannel(S.chan - 1),
      ArrowDown: () => setChannel(S.chan + 1),
      PageUp: () => setChannel(S.chan - 1),
      PageDown: () => setChannel(S.chan + 1),
      Home: () => focusIndex(0),
      End: () => focusIndex(1e9),
    }
    const action = keys[k]
    const inScene =
      !target ||
      target === document.body ||
      target === canvas ||
      Boolean(main.contains(target)) ||
      Boolean(nav.contains(target))
    if (action && inScene) {
      event.preventDefault()
      action()
      return
    }
    if (
      (k === 'Enter' || k === ' ') &&
      (target === document.body || itemOf(target))
    ) {
      event.preventDefault()
      openItem()
    }
  })

  on(window, 'mousedown', () => root.classList.remove('ch-kbd'))

  let wheelY = 0
  let wheelX = 0
  let wheelLock = 0
  on(
    canvas,
    'wheel',
    (event: WheelEvent) => {
      if (S.open) return
      event.preventDefault()
      inputMode = 'pointer'
      const now = performance.now()
      wheelY += event.deltaY
      wheelX += event.deltaX
      if (now < wheelLock) return
      if (Math.abs(wheelX) > 50 && Math.abs(wheelX) > Math.abs(wheelY)) {
        move(Math.sign(wheelX))
        wheelX = wheelY = 0
        wheelLock = now + 140
      } else if (Math.abs(wheelY) > 60) {
        if (event.shiftKey) move(Math.sign(wheelY))
        else setChannel(S.chan + Math.sign(wheelY))
        wheelX = wheelY = 0
        wheelLock = now + 360
      }
    },
    { passive: false },
  )

  interface Drag {
    x: number
    y: number
    t: number
    base: number
    moved: boolean
    axis: 'x' | 'y' | null
  }
  let drag: Drag | null = null
  on(canvas, 'pointerdown', (event: PointerEvent) => {
    inputMode = 'pointer'
    drag = {
      x: event.clientX,
      y: event.clientY,
      t: performance.now(),
      base: S.idx[S.chan],
      moved: false,
      axis: null,
    }
    canvas.setPointerCapture(event.pointerId)
  })
  on(canvas, 'pointermove', (event: PointerEvent) => {
    const vp = viewport()
    S.mx = (event.clientX / vp.w) * 2 - 1
    S.my = (event.clientY / vp.h) * 2 - 1
    if (!drag) {
      if (event.pointerType === 'mouse') {
        const i = renderer.pick(event.clientX, event.clientY, vp)
        S.hover = i
        canvas.style.cursor = i >= 0 ? 'pointer' : ''
      }
      return
    }
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.axis && Math.hypot(dx, dy) > 10) {
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (drag.axis === 'x' && !S.open) {
      drag.moved = true
      const per = vp.portrait ? vp.w * 0.55 : 220
      const n = channels[S.chan].items.length
      S.rowS[S.chan].t = clamp(drag.base - dx / per, -0.4, n - 0.6)
      const next = clamp(Math.round(S.rowS[S.chan].t), 0, n - 1)
      if (next !== S.idx[S.chan]) {
        S.idx[S.chan] = next
        sound.play('tick')
        markSweep()
        touch()
      }
    }
    if (drag.axis === 'y') drag.moved = true
  })
  on(canvas, 'pointerup', (event: PointerEvent) => {
    if (!drag) return
    const d = drag
    drag = null
    const dx = event.clientX - d.x
    const dy = event.clientY - d.y
    const ms = performance.now() - d.t
    if (S.open) {
      if (!d.moved && openMode === 'reader') closeItem()
      return
    }
    if (d.axis === 'x') {
      const v = dx / Math.max(ms, 1)
      const n = channels[S.chan].items.length
      const next = clamp(
        Math.round(
          S.rowS[S.chan].t - (Math.abs(v) > 0.5 ? Math.sign(v) * 0.6 : 0),
        ),
        0,
        n - 1,
      )
      S.idx[S.chan] = -1
      focusIndex(next)
      S.rowS[S.chan].t = next
      return
    }
    if (d.axis === 'y') {
      if (Math.abs(dy) > 40) setChannel(S.chan - Math.sign(dy))
      return
    }
    const i = renderer.pick(event.clientX, event.clientY, viewport())
    if (i < 0) return
    if (i === S.idx[S.chan]) openItem()
    else focusIndex(i)
  })
  on(canvas, 'pointerleave', () => {
    if (!drag) S.hover = -1
  })
  on(canvas, 'pointercancel', () => {
    drag = null
    S.rowS[S.chan].t = S.idx[S.chan]
  })

  const pad = {
    held: {} as Record<string, boolean>,
    next: {} as Record<string, number>,
  }
  on(window, 'gamepadconnected', () => {
    padHint.classList.add('ch-on')
    status.textContent =
      'Controller connected. Use the stick or d-pad to browse, the bottom face button to open, the right face button to go back.'
  })
  on(window, 'gamepaddisconnected', () => {
    padHint.classList.remove('ch-on')
    status.textContent = 'Controller disconnected.'
  })
  function pollPad(now: number): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    const g = [...pads].find((p) => p && p.connected)
    if (!g || paletteOpen()) return
    const ax = g.axes[0] || 0
    const ay = g.axes[1] || 0
    const b = (i: number) => Boolean(g.buttons[i]?.pressed)
    const dirs: Record<string, boolean> = {
      L: ax < -0.5 || b(14),
      R: ax > 0.5 || b(15),
      U: ay < -0.5 || b(12),
      D: ay > 0.5 || b(13),
      LB: b(4),
      RB: b(5),
      OK: b(0),
      BACK: b(1),
    }
    const act: Record<string, () => void> = {
      L: () => move(-1),
      R: () => move(1),
      U: () => setChannel(S.chan - 1),
      D: () => setChannel(S.chan + 1),
      LB: () => setChannel(S.chan - 1),
      RB: () => setChannel(S.chan + 1),
      OK: () => {
        if (!S.open) openItem()
      },
      BACK: closeItem,
    }
    for (const k of Object.keys(dirs)) {
      if (dirs[k]) {
        inputMode = 'key'
        const repeat = k === 'OK' || k === 'BACK' ? 1e9 : 150
        if (!pad.held[k]) {
          pad.held[k] = true
          pad.next[k] = now + 380
          act[k]()
        } else if (now > pad.next[k]) {
          pad.next[k] = now + repeat
          act[k]()
        }
      } else pad.held[k] = false
    }
    if (S.open && Math.abs(g.axes[3] || 0) > 0.2)
      readerBody.scrollTop += (g.axes[3] || 0) * 14
  }

  /* ----------------------------------------------------------- HUD -- */

  let labelsLive = false
  let capFor: Item | null = null
  let pipsFor = ''
  function updateHUD(rect: ScreenRect | null, vp: Viewport): void {
    const ch = channels[S.chan]
    const item = current()
    root.style.setProperty('--ui-hue', String(ch.hue))
    const cp = S.chanS.v
    const big = vp.portrait ? 40 : vp.h < 520 ? 36 : 56
    const anchorY = rect
      ? rect.y + rect.h * (vp.portrait ? 0 : 0.5)
      : vp.h * 0.45
    const x0 = vp.portrait
      ? 16
      : Math.max(28, Math.min(vp.w * 0.045, (rect ? rect.x : 200) - 260))
    // Until the handover the page's own layout places the labels.
    if (labelsLive)
      channels.forEach((c, ci) => {
        const dd = ci - cp
        const ad = Math.abs(dd)
        const sc = lerp(1, vp.portrait ? 0.5 : 0.43, Math.min(ad, 1))
        const yy =
          Math.sign(dd) *
          (ad < 1 ? ad * big * 0.98 : big * 0.98 + (ad - 1) * 46)
        const op =
          ad < 1 ? lerp(1, 0.74, ad) : Math.max(0.64, 0.74 - (ad - 1) * 0.04)
        // Every label keeps a 44px hit area at whatever scale it is drawn.
        const hit = Math.max(big * 1.15, 45 / sc)
        let y = anchorY + yy - hit / 2
        if (vp.portrait)
          y = (rect ? rect.y : vp.h * 0.3) - big * 1.25 + yy - (hit - big) / 2
        const el = c.label
        el.style.height = `${hit}px`
        el.style.fontSize = `${big}px`
        el.style.setProperty('--sc', String(sc))
        el.style.transform = `translate3d(${x0}px,${y}px,0) scale(${sc})`
        el.style.opacity = String(vp.portrait ? clamp(1 - ad * 1.6, 0, 1) : op)
        el.style.pointerEvents = (vp.portrait ? ad < 0.5 : ad < 2.5)
          ? 'auto'
          : 'none'
      })
    if (rect) {
      cap.style.transform = `translate3d(${vp.portrait ? 16 : rect.x + 4}px,${rect.y + rect.h + (vp.portrait ? 18 : 22)}px,0)`
      cap.style.opacity = String(1 - S.openT * 3)
      cap.style.width = vp.portrait
        ? `${vp.w * 0.6}px`
        : `${Math.min(560, Math.max(380, rect.w * 1.1))}px`
    }
    if (capFor !== item) {
      capFor = item
      const k = cap.querySelector('.ch-cap-k')
      const t = cap.querySelector('.ch-cap-t')
      const d = cap.querySelector('.ch-cap-d')
      if (k) k.textContent = item.meta.replace(/\s+·\s+/g, '  ·  ')
      if (t) t.textContent = item.title
      if (d) d.textContent = item.desc
    }
    const key = `${S.chan}:${S.idx[S.chan]}`
    if (pipsFor !== key) {
      pipsFor = key
      const n = ch.items.length
      const cur = S.idx[S.chan]
      const lo = Math.max(0, Math.min(cur - 4, n - 9))
      const hi = Math.min(n, lo + 9)
      let html = ''
      for (let i = lo; i < hi; i++) {
        html +=
          i === cur
            ? '<b class="ch-pip ch-pip-on"></b>'
            : '<b class="ch-pip"></b>'
      }
      pips.innerHTML = `${html}<span class="ch-pips-n">${cur + 1} / ${n}</span>`
    }
    if (rect) {
      const px = vp.portrait ? vp.w - 16 - pips.offsetWidth : rect.x + 4
      pips.style.transform = `translate3d(${px}px,${rect.y - 44}px,0)`
      pips.style.opacity = String(1 - S.openT * 3)
      ring.style.transform = `translate3d(${rect.x - 6}px,${rect.y - 6}px,0)`
      ring.style.width = `${rect.w + 12}px`
      ring.style.height = `${rect.h + 12}px`
      ring.classList.toggle('ch-on', S.openT < 0.05)
    }
    nav.style.opacity = String(1 - S.openT * 2)
    guide.style.opacity = String(1 - S.openT * 2)
    const pr = panelRect(vp, 'reader')
    reader.style.width = `${pr.w}px`
    reader.style.height = `${pr.h}px`
    reader.style.transform = `translate(${pr.x - vp.w / 2}px,${pr.y - vp.h / 2}px)`
    const shown =
      openMode === 'reader'
        ? S.open
          ? sstep(0.82, 1, S.openT)
          : sstep(0.55, 1, S.openT)
        : 0
    reader.style.opacity = String(shown)
    reader.classList.toggle('ch-on', shown > 0.5)
  }

  /* ------------------------------------------------------ entrance -- */

  /**
   * Start where the dashboard already is, so the room fades in over the same
   * picture: a hash target (an article's Back, a section's), else the link
   * that has focus, else -- in the flat layout -- the row nearest the top of
   * the screen and the first tile showing in it. No entrance replays: an
   * article's tile is simply at rest in its row.
   */
  function startFromDom(): void {
    const hash = decodeURIComponent(location.hash.slice(1))
    let item = hash.startsWith('t-')
      ? itemOf(document.getElementById(hash))
      : null
    let chan = hash.startsWith('ch-')
      ? channels.findIndex((c) => c.id === hash.slice(3))
      : -1
    item ??= itemOf(document.activeElement)
    if (!item && chan < 0 && !document.documentElement.dataset.scene) {
      const rows = [...root.querySelectorAll<HTMLElement>('.ch-row')]
      let nearest = Infinity
      rows.forEach((row, i) => {
        const d = Math.abs(row.getBoundingClientRect().top - 60)
        if (d < nearest) {
          nearest = d
          chan = i
        }
      })
      const strip = rows[chan]?.querySelector('.ch-tiles')
      const left = strip?.getBoundingClientRect().left ?? 0
      const shown = channels[chan]?.items.findIndex(
        (it) => it.link.getBoundingClientRect().right > left + 40,
      )
      if (shown !== undefined && shown > 0) item = channels[chan].items[shown]
    }
    if (item) chan = item.chan
    if (chan < 0) chan = 0
    S.chan = chan
    S.chanS.snap(chan)
    if (item) {
      S.idx[chan] = item.index
      S.rowS[chan].snap(item.index)
    }
  }
  startFromDom()
  setTitle()
  markChannel()
  renderer.prime()

  /* ---------------------------------------------------------- loop -- */

  let raf = 0
  let last = performance.now()
  let frames = 0
  let slow = 0
  let shownScene = false
  let lastRect: ScreenRect | null = null
  let alive = true
  let waved = false
  let idleSince = 0

  function settled(): boolean {
    return (
      S.chanS.settled &&
      S.rowS.every((s) => s.settled) &&
      (S.openT === 0 || S.openT === 1) &&
      !drag
    )
  }

  const tick = (now: number) => {
    if (!alive) return
    raf = requestAnimationFrame(tick)
    // Behind the open palette the room holds still: drawing it under a
    // full-screen blur is all cost, and on a phone the slow frames that
    // costs used to trip the fallback below and take the scene away.
    if (shownScene && paletteOpen()) {
      last = now
      slow = 0
      return
    }
    const raw = (now - last) / 1000
    last = now
    const dt = clamp(raw, 0, 0.1)
    pollPad(now)
    // A calm room with nothing moving does not need redrawing.
    if (S.reduced && settled() && shownScene && S.t - S.lastInput > 1) {
      idleSince ||= now
      if (now - idleSince > 200) return
    } else idleSince = 0
    S.t += dt
    if (!waved && S.t > 0.9) {
      waved = true
      // The host's wave is an entrance; arriving late, there is none.
      if (!S.reduced && !late) {
        renderer.avatar.wave = S.t
        introState = 'played'
      }
    }
    S.chanS.step(dt)
    for (const s of S.rowS) s.step(dt)
    const target = S.open ? 1 : 0
    const speed = S.reduced ? 6 : S.open ? 1 / 0.85 : 1 / 0.65
    S.openT = clamp(S.openT + Math.sign(target - S.openT) * dt * speed, 0, 1)
    if (!S.open && S.openT === 0 && !reader.hidden) reader.hidden = true
    const vp = viewport()
    const rect = renderer.frame(dt, vp, openMode)
    lastRect = rect
    updateHUD(rect, vp)
    frames++
    if (!shownScene && frames > 2) {
      shownScene = true
      canvas.classList.add('ch-on')
      window.setTimeout(
        () => {
          if (alive) handover()
        },
        S.reduced ? 0 : 450,
      )
    }
    // Adapt to the machine: drop resolution while frames run long, and give
    // the room up for the flat dashboard if even that does not help.
    if (frames > 20 && query !== 'force') {
      slow = raw > 0.045 ? slow + 1 : Math.max(0, slow - 1)
      if (slow > 30) {
        slow = 0
        if (maxDpr > 0.75) maxDpr = maxDpr > 1 ? 1 : 0.75
        else teardown('fail')
      }
    }
  }
  raf = requestAnimationFrame(tick)

  // A read-only window for the Playwright checks, only under ?scene=force.
  if (query === 'force') {
    ;(window as { __channels?: unknown }).__channels = {
      state: () => ({
        chan: S.chan,
        idx: [...S.idx],
        open: Boolean(S.open),
        camera: renderer.cameraTarget(),
        intro: introState,
        boots,
        scrollY,
      }),
    }
  }

  on(canvas, 'webglcontextlost', (event: Event) => {
    event.preventDefault()
    teardown('fail')
  })

  /**
   * The canvas is opaque now: hand the labels from wherever the page drew
   * them to the HUD's places, moving rather than jumping, and remember that
   * the room runs here.
   */
  function handover(): void {
    const before = channels.map((c) => ({
      rect: c.label.getBoundingClientRect(),
      opacity: getComputedStyle(c.label).opacity,
    }))
    root.classList.replace('ch-boot', 'ch-3d')
    labelsLive = true
    updateHUD(lastRect, viewport())
    rememberScene(true)
    if (S.reduced) return
    channels.forEach((c, i) => {
      const from = before[i].rect
      const to = c.label.getBoundingClientRect()
      if (!from.height || !to.height) return
      c.label.animate(
        [
          {
            translate: `${from.left - to.left}px ${from.top - to.top}px`,
            scale: `${from.height / to.height}`,
            opacity: before[i].opacity,
          },
          { translate: '0 0', scale: '1' },
        ],
        { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' },
      )
    })
  }

  /** `nav`: the router is leaving. `fail`: the room cannot run here. */
  function teardown(reason: 'nav' | 'fail' = 'nav'): void {
    if (!alive) return
    alive = false
    cancelAnimationFrame(raf)
    clearTimeout(navTimer)
    clearTimeout(liveTimer)
    for (const fn of cleanups) fn()
    for (const [link, name] of vtNames) link.dataset.vtName = name
    for (const el of inertTargets) el.inert = false
    for (const c of channels) {
      for (const prop of LABEL_PROPS) c.label.style.removeProperty(prop)
      c.label.removeAttribute('aria-current')
    }
    // Leaving for another page keeps the room's layout for the way back;
    // failing hands the homepage to the flat rows, now and next time.
    if (reason === 'fail') rememberScene(false)
    nav.removeAttribute('style')
    root.classList.remove('ch-boot', 'ch-3d', 'ch-kbd')
    root.style.setProperty('--ui-hue', originalHue)
    motionBtn.hidden = true
    soundBtn.hidden = true
    for (const el of added) el.remove()
    document.title = originalTitle
    try {
      renderer.dispose()
    } catch {
      // The context may already be gone.
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  return () => teardown('nav')
}
