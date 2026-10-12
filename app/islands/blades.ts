import { iconHTML, type IconKind } from '@lib/blades/art'
import {
  esc,
  previewHTML,
  profileCardHTML,
  settingSub,
  type BladeItem,
  type PreviewState,
  type ProfileCard,
} from '@lib/blades/items'
import { BLADES, bladeVars, HOME_BLADE } from '@lib/blades/theme'
import type { Ambient } from './blades/ambient'
import type { Cue, Synth } from './blades/audio'
import { clamp, Spring, springEasing } from './blades/spring'

/**
 * The homepage dashboard, made live.
 *
 * A plain island: `mount(el, props)` with no preact, because it renders
 * nothing. The dashboard is server-rendered in full by
 * app/components/blades/dashboard.tsx and this takes that markup over in
 * place -- listbox and tablist roles, the spring that swings the blades, the
 * guide, the toasts, hover selection, touch drag, the wheel, the keyboard and
 * the gamepad. The ambient background and the synthesizer are separate chunks,
 * imported when they are first needed.
 *
 * Every listener, frame, timer, worker and audio context is released by the
 * returned teardown, which the router calls before it swaps the page out.
 */

export interface BladesProps {
  blades: BladeItem[][]
  card: ProfileCard
}

const N = BLADES.length
const SEEN_TOAST = 'blades:toast'
const SELECTION = 'blades:sel'

interface BladeDom {
  el: HTMLElement
  tab: HTMLAnchorElement
  body: HTMLElement
  shade: HTMLElement
  list: HTMLElement
  items: HTMLElement[]
  pv: HTMLElement
  pvBox: HTMLElement
  count: HTMLElement
  bar: HTMLElement
}

function store(kind: 'get', key: string): string | null
function store(kind: 'set', key: string, value: string): void
function store(kind: 'get' | 'set', key: string, value?: string) {
  try {
    if (kind === 'get') return sessionStorage.getItem(key)
    sessionStorage.setItem(key, value ?? '')
  } catch {
    // Private mode or blocked storage: the dashboard simply forgets.
  }
  return null
}

/** A tiled texture painted once at boot, as a data: URL. */
function texture(
  w: number,
  h: number,
  paint: (g: CanvasRenderingContext2D) => void,
): string {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (g) paint(g)
  return c.toDataURL('image/png')
}

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

export default function mount(_el: HTMLElement, props: BladesProps) {
  const found = document.querySelector<HTMLElement>('.bl-home')
  if (!found || !props?.blades) return undefined
  const root: HTMLElement = found
  const $ = <T extends HTMLElement>(sel: string) =>
    root.querySelector<T>(sel) as T
  const data = props.blades
  const html = document.documentElement

  /* ------------------------------------------------------- teardown -- */

  const disposers: (() => void)[] = []
  let disposed = false
  const on = <E extends Event>(
    target: EventTarget,
    type: string,
    fn: (event: E) => void,
    options?: AddEventListenerOptions | boolean,
  ) => {
    const listener = fn as EventListener
    target.addEventListener(type, listener, options)
    disposers.push(() => target.removeEventListener(type, listener, options))
  }
  const timers = new Set<number>()
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
    return id
  }

  /* --------------------------------------------------------- motion -- */

  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)')
  let reduceMotion = reducedQuery.matches || html.classList.contains('rm')

  /* ---------------------------------------------------------- sound -- */

  let synth: Synth | null = null
  let playCue: ((s: Synth, cue: Cue) => void) | null = null
  let soundOn = false
  const cue = (name: Cue) => {
    if (soundOn && synth && playCue) playCue(synth, name)
  }

  /* ------------------------------------------------------ ambient bg -- */

  let bg: Ambient | null = null

  /* ------------------------------------------------------------ DOM -- */

  const stage = $('#stage')
  const tabs = $('#tabs')
  const blades: BladeDom[] = BLADES.map((theme) => {
    const el = $(`#blade-${theme.id}`)
    const list = el.querySelector<HTMLElement>('.items') as HTMLElement
    return {
      el,
      tab: $<HTMLAnchorElement>(`#tab-${theme.id}`),
      body: el.querySelector('.blade-body') as HTMLElement,
      shade: el.querySelector('.blade-shade') as HTMLElement,
      list,
      items: [...list.children] as HTMLElement[],
      pv: el.querySelector('.pv-inner') as HTMLElement,
      pvBox: el.querySelector('.preview') as HTMLElement,
      count: el.querySelector('.count .n') as HTMLElement,
      bar: el.querySelector('.count .bar i') as HTMLElement,
    }
  })
  if (blades.some((b) => !b.el || !b.list)) return undefined

  const state = {
    blade: HOME_BLADE,
    sel: BLADES.map(() => 0),
    overlay: null as 'guide' | null,
  }

  const themeNow = (): PreviewState['theme'] =>
    html.dataset.theme === 'light' ? 'light' : 'dark'
  const previewState = (): PreviewState => ({
    sound: soundOn,
    reducedMotion: reduceMotion,
    theme: themeNow(),
  })

  // Roles the at-rest page does not claim: without this script the lists
  // are plain links and the tabs are links to the section pages.
  tabs.setAttribute('role', 'tablist')
  tabs.setAttribute('aria-label', 'Sections')
  blades.forEach((B, bi) => {
    B.el.setAttribute('role', 'tabpanel')
    B.tab.setAttribute('role', 'tab')
    B.list.setAttribute('role', 'listbox')
    B.items.forEach((item) => {
      item.setAttribute('role', 'option')
      item.tabIndex = -1
      item.setAttribute('aria-selected', 'false')
    })
    // A tab is a button now; its href stays for middle-click.
    on(B.tab, 'click', (event) => {
      event.preventDefault()
      goBlade(bi)
    })
  })
  root.style.setProperty('--spring', springEasing())
  root.style.setProperty(
    '--brushed',
    `url(${texture(300, 300, (g) => {
      const r = seeded(7)
      for (let i = 0; i < 2600; i++) {
        const y = r() * 300
        const x = r() * 300
        const len = 30 + r() * 220
        const a = r() * 0.05
        g.fillStyle =
          r() > 0.5 ? `rgba(255,255,255,${a * 1.6})` : `rgba(0,0,0,${a * 0.55})`
        g.fillRect(x - len / 2, y, len, 1)
        g.fillRect(x - len / 2 + 300 * (x > 150 ? -1 : 1), y, len, 1)
      }
    })})`,
  )
  root.style.setProperty(
    '--noise',
    `url(${texture(256, 256, (g) => {
      const d = g.createImageData(256, 256)
      const r = seeded(3)
      for (let i = 0; i < d.data.length; i += 4) {
        const v = 110 + r() * 40 + Math.sin((i / 4 / 256) * 0.9) * 8
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v
        d.data[i + 3] = 22
      }
      g.putImageData(d, 0, 0)
    })})`,
  )

  /* ------------------------------------------------- announcements -- */

  const live = $('#live')
  let liveTimer = 0
  let liveFlip = false
  const announce = (msg: string) => {
    clearTimeout(liveTimer)
    liveTimer = later(() => {
      // A trailing no-break space that alternates, so an identical message
      // twice in a row is still a change the screen reader announces.
      liveFlip = !liveFlip
      live.textContent = msg + (liveFlip ? ' ' : '')
    }, 260)
  }
  const unitOf = (bi: number) =>
    BLADES[bi].id === 'system'
      ? 'options'
      : ($(`#blade-${BLADES[bi].id} .bcount`).textContent ?? '').replace(
          /^\d+\s*/,
          '',
        )
  const itemLabel = (bi: number) => {
    const j = state.sel[bi]
    const it = data[bi][j]
    const sub = it.href ? it.sub : settingSub(it, previewState())
    return `${it.title}${sub ? `, ${sub}` : ''}, ${j + 1} of ${data[bi].length}`
  }
  const announceBlade = () => {
    const bi = state.blade
    announce(
      `${BLADES[bi].id} section, ${data[bi].length} ${unitOf(bi)}. ${itemLabel(bi)}`,
    )
  }

  /* ------------------------------------------------------ selection -- */

  const saveSelection = () => store('set', SELECTION, JSON.stringify(state.sel))

  function renderPreview(bi: number) {
    const B = blades[bi]
    const it = data[bi][state.sel[bi]]
    B.pv.innerHTML = previewHTML(BLADES[bi], it, previewState(), props.card)
    if (it.vt) B.pvBox.dataset.vtName = it.vt
    else delete B.pvBox.dataset.vtName
  }

  function select(
    bi: number,
    j: number,
    opts: { instant?: boolean; silent?: boolean; force?: boolean } = {},
  ) {
    const B = blades[bi]
    const n = data[bi].length
    j = clamp(j, 0, n - 1)
    const prev = state.sel[bi]
    state.sel[bi] = j
    B.items.forEach((el, k) => {
      el.classList.toggle('is-sel', k === j)
      el.setAttribute('aria-selected', k === j ? 'true' : 'false')
    })
    B.list.setAttribute('aria-activedescendant', `it-${bi}-${j}`)
    B.count.textContent = `${j + 1} of ${n}`
    B.bar.style.width = `${((j + 1) / n) * 100}%`
    const el = B.items[j]
    if (el) {
      const lt = B.list.scrollTop
      const lh = B.list.clientHeight
      const top = el.offsetTop - B.list.offsetTop - 6
      const bot = top + el.offsetHeight + 14
      const behavior = reduceMotion || opts.instant ? 'auto' : 'smooth'
      if (top < lt) B.list.scrollTo({ top, behavior })
      else if (bot > lt + lh) B.list.scrollTo({ top: bot - lh, behavior })
    }
    if (prev !== j || opts.force) {
      renderPreview(bi)
      if (!reduceMotion && !opts.instant) {
        B.pv.animate(
          [
            { opacity: 0.35, transform: 'translateY(6px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1)' },
        )
      }
      if (!opts.silent) cue('tick')
      saveSelection()
    }
  }

  /** Re-reads the settings rows after one of them changed. */
  function refreshSystem() {
    const bi = BLADES.findIndex((b) => b.id === 'system')
    const B = blades[bi]
    const st = previewState()
    data[bi].forEach((it, j) => {
      if (it.href) return
      const sub = B.items[j]?.querySelector('.id')
      if (sub) sub.textContent = settingSub(it, st)
    })
    select(bi, state.sel[bi], { force: true, instant: true, silent: true })
    if (state.overlay === 'guide') buildGuide()
  }

  /**
   * Follows an item: opens its article or link, or flips its setting.
   *
   * An article opened while the preview pane is on screen is opened through
   * the pane's own Read button, so the router hands the pane the transition
   * name and the brushed glass morphs into the reader. `fromClick` is the
   * click that is already following the row, which only needs redirecting.
   */
  let programmatic = false
  function follow(bi: number, j: number, fromClick: Event | null) {
    const it = data[bi][j]
    const el = blades[bi].items[j]
    if (!it || !el) return
    if (it.kind === 'sound') return void toggleSound()
    if (it.kind === 'motion') return setMotion(!reduceMotion)
    if (it.kind === 'info') return
    if (it.kind === 'theme') {
      // The runtime owns the toggle; a click on the row is already one.
      if (!fromClick) synthetic(el)
      return
    }
    const pane = blades[bi].pvBox
    const read =
      it.vt && pane.offsetParent
        ? pane.querySelector<HTMLElement>('[data-act="read"]')
        : null
    cue('chime')
    if (read) {
      fromClick?.preventDefault()
      synthetic(read)
    } else if (!fromClick) {
      synthetic(el)
    }
  }
  function synthetic(el: HTMLElement) {
    programmatic = true
    try {
      el.click()
    } finally {
      programmatic = false
    }
  }

  /* --------------------------------------------- blades and spring -- */

  const spring = new Spring(HOME_BLADE, 190, 21)
  let lay = { W: 1000, E: 40, L: 30 }
  const mobile = () => innerWidth <= 760

  function measure() {
    const cs = getComputedStyle(root)
    const E = parseFloat(cs.getPropertyValue('--E')) || 40
    const L = parseFloat(cs.getPropertyValue('--mx')) || 30
    const W = innerWidth - L - (N - 1) * E
    lay = { W, E, L }
    root.style.setProperty('--W', `${W}px`)
  }

  function layout() {
    const p = spring.x
    const v = spring.v
    const { W, E, L } = lay
    const small = mobile()
    for (let i = 0; i < N; i++) {
      const d = i - p
      const t = clamp(d, 0, 1)
      const B = blades[i]
      let x = L + i * E + (W - E) * t
      // Passed blades tuck slightly under; the first rubber-bands past 0.
      if (d < 0) x += d * (small ? 0 : 2.5) * Math.min(1, -d)
      if (i === 0 && p < 0) x += -p * 60
      // A blade in flight hinges on its left edge; velocity adds overshoot.
      const inFlight = Math.sin(Math.PI * t)
      let ang =
        -inFlight * (small ? 10 : 16) +
        (d >= 0 && d <= 1.2
          ? clamp(-v * 2.2, -9, 9) * (1 - Math.abs(d - 0.5))
          : 0)
      if (d >= 1) ang = -2.5
      if (d < 0) ang = clamp(-d, 0, 1) * 3
      const z = d < 0 ? Math.max(-d, 0) * -30 : -inFlight * 40
      B.el.style.transform =
        `translate3d(${x.toFixed(2)}px,0,0) perspective(1700px) ` +
        `rotateY(${ang.toFixed(3)}deg) translateZ(${z.toFixed(1)}px)`
      B.shade.style.opacity = (
        d < 0 ? Math.min(1, -d) * 0.42 : t * 0.12
      ).toFixed(3)
      B.body.style.opacity = (
        d < 0 ? clamp(1 + d * 0.9, 0, 1) : clamp(1 - d * 1.7, 0, 1)
      ).toFixed(3)
    }
  }

  let raf = 0
  let lastT = 0
  let drag: {
    id: number
    x0: number
    y0: number
    p0: number
    axis: 'x' | 'y' | null
    samples: [number, number][]
  } | null = null
  const kick = () => {
    if (!raf) {
      lastT = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }
  function frame(now: number) {
    const dt = clamp((now - lastT) / 1000, 0, 0.05)
    lastT = now
    if (!drag) {
      if (reduceMotion) spring.snap()
      else spring.advance(dt)
    }
    layout()
    if (drag || !spring.settled) {
      raf = requestAnimationFrame(frame)
    } else {
      raf = 0
      spring.snap()
      layout()
    }
  }

  // Viewer state the theme script owns; borrowed for the blade colour while
  // the dashboard is up, and handed back in the teardown.
  const meta = document.querySelector('meta[name="theme-color"]')

  function setActiveUI() {
    const bi = state.blade
    const theme = BLADES[bi]
    blades.forEach((B, i) => {
      const active = i === bi
      B.el.dataset.pos = i < bi ? 'left' : active ? 'active' : 'right'
      B.body.inert = !active
      B.list.tabIndex = active ? 0 : -1
      B.tab.setAttribute('aria-selected', String(active))
      B.tab.tabIndex = active ? 0 : -1
      B.tab.classList.toggle('is-on', active)
    })
    document.title =
      bi === HOME_BLADE ? 'Max Leiter' : `${theme.id} · Max Leiter`
    for (const [name, value] of Object.entries(bladeVars(theme))) {
      root.style.setProperty(name, value)
    }
    meta?.setAttribute('content', theme.c[2])
    bg?.color(theme.rgb)
  }

  function goBlade(
    i: number,
    opts: { silent?: boolean; v?: number; force?: boolean } = {},
  ) {
    i = clamp(i, 0, N - 1)
    if (i === state.blade && !opts.force) {
      spring.target = i
      kick()
      return
    }
    const dir = Math.sign(i - state.blade) || 1
    state.blade = i
    spring.target = i
    if (opts.v != null) spring.v = opts.v
    setActiveUI()
    kick()
    try {
      const url = i === HOME_BLADE ? '/' : `/?blade=${BLADES[i].id}`
      history.replaceState(history.state, '', url)
    } catch {
      // A sandboxed frame; the address bar just does not follow.
    }
    if (reduceMotion) {
      stage.animate([{ opacity: 0.35 }, { opacity: 1 }], {
        duration: 220,
        easing: 'ease-out',
      })
    }
    if (!opts.silent) {
      cue(dir > 0 ? 'swish+' : 'swish-')
      announceBlade()
    }
  }

  /** Keyboard focus follows spatial navigation into the new section. */
  function syncFocus() {
    const ae = document.activeElement as HTMLElement | null
    const B = blades[state.blade]
    if (ae?.getAttribute('role') === 'tab') {
      B.tab.focus()
      return
    }
    // Making the old blade inert drops its focus to <body> synchronously,
    // which is why <body> counts as "in a blade".
    if (
      !ae ||
      ae === document.body ||
      ae === stage ||
      ae.closest('.blade') ||
      ae.closest('#toasts')
    ) {
      B.list.focus({ preventScroll: true })
    }
  }

  /* -------------------------------------------------------- settings -- */

  async function toggleSound(force?: boolean) {
    const next = force ?? !soundOn
    if (next && !synth) {
      const Ctor =
        window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!Ctor) return
      // Created inside the gesture, then the synthesizer chunk loads.
      const ctx = new Ctor()
      const mod = await import('./blades/audio')
      synth = new mod.Synth(ctx)
      playCue = mod.play
    }
    soundOn = next
    if (soundOn && synth && !synth.running) {
      try {
        await synth.resume()
      } catch {
        // Autoplay policy said no; the switch still reads on.
      }
    }
    const btn = $('#sound')
    btn.setAttribute('aria-checked', String(soundOn))
    $('#soundLabel').textContent = soundOn ? 'on' : 'off'
    refreshSystem()
    cue('chime')
  }

  function setMotion(reduced: boolean) {
    reduceMotion = reduced
    // On <html>, so it outlives this page for the rest of the visit: the
    // router reads it before animating a navigation.
    html.classList.toggle('rm', reduced)
    bg?.still(reduced || document.hidden)
    refreshSystem()
    cue('tick')
  }

  /* --------------------------------------------- pointer and wheel -- */

  let suppressClick = false
  on(stage, 'pointerdown', (e: PointerEvent) => {
    if (e.button !== 0 || state.overlay) return
    drag = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      p0: spring.x,
      axis: null,
      samples: [[e.timeStamp, e.clientX]],
    }
  })
  on(stage, 'pointermove', (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) {
      // Hover selects, the era's way. It never moves focus.
      if (e.pointerType === 'mouse' && !state.overlay) {
        const it = (e.target as Element).closest<HTMLElement>('.item')
        const bladeEl = it?.closest<HTMLElement>('.blade')
        if (it && bladeEl && Number(bladeEl.dataset.i) === state.blade) {
          select(state.blade, Number(it.dataset.j))
        }
      }
      return
    }
    const dx = e.clientX - drag.x0
    const dy = e.clientY - drag.y0
    if (!drag.axis) {
      if (Math.hypot(dx, dy) < 9) return
      drag.axis = Math.abs(dx) > Math.abs(dy) * 1.1 ? 'x' : 'y'
      if (drag.axis === 'x') {
        try {
          stage.setPointerCapture(e.pointerId)
        } catch {
          // Pointer already gone.
        }
        kick()
      }
    }
    if (drag.axis !== 'x') return
    const span = lay.W - lay.E
    let p = drag.p0 - dx / span
    if (p < 0) p = -Math.pow(-p, 0.7) * 0.35
    if (p > N - 1) p = N - 1 + Math.pow(p - N + 1, 0.7) * 0.35
    spring.x = p
    spring.v = 0
    drag.samples.push([e.timeStamp, e.clientX])
    if (drag.samples.length > 6) drag.samples.shift()
  })
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return
    const d = drag
    drag = null
    if (d.axis !== 'x') return
    const [t0, x0] = d.samples[0]
    const [t1, x1] = d.samples[d.samples.length - 1]
    const vpx = ((x1 - x0) / Math.max(16, t1 - t0)) * 1000
    const vIdx = -vpx / (lay.W - lay.E)
    // Momentum: where a flick would coast to, one blade at most.
    const projected = spring.x + vIdx * 0.22
    const target = clamp(
      Math.round(projected),
      Math.max(0, state.blade - 1),
      Math.min(N - 1, state.blade + 1),
    )
    if (target !== state.blade) goBlade(target, { v: vIdx })
    else {
      spring.target = target
      spring.v = vIdx
      kick()
    }
    suppressClick = true
    later(() => (suppressClick = false), 50)
  }
  on(stage, 'pointerup', endDrag)
  on(stage, 'pointercancel', endDrag)

  on(
    stage,
    'click',
    (e: MouseEvent) => {
      if (programmatic) return
      if (suppressClick) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      const target = e.target as Element
      const bladeEl = target.closest<HTMLElement>('.blade')
      if (!bladeEl) return
      const bi = Number(bladeEl.dataset.i)
      if (bi !== state.blade) {
        e.preventDefault()
        goBlade(bi)
        return
      }
      const act = target.closest<HTMLElement>('[data-act]')
      if (act) {
        const kind = act.dataset.act
        if (kind === 'sound') void toggleSound()
        else if (kind === 'motion') setMotion(!reduceMotion)
        else cue('chime')
        return
      }
      const item = target.closest<HTMLElement>('.item')
      if (item) {
        const j = Number(item.dataset.j)
        select(bi, j)
        follow(bi, j, e)
      }
    },
    true,
  )

  let wheelAcc = 0
  let wheelLock = 0
  on(
    stage,
    'wheel',
    (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      const now = performance.now()
      if (now < wheelLock) return
      wheelAcc += e.deltaX
      if (Math.abs(wheelAcc) > 60) {
        goBlade(state.blade + Math.sign(wheelAcc))
        wheelAcc = 0
        wheelLock = now + 380
      }
    },
    { passive: false },
  )

  /* -------------------------------------------------------- keyboard -- */

  const moveItem = (dy: number) => {
    const bi = state.blade
    const before = state.sel[bi]
    select(bi, before + dy)
    if (state.sel[bi] !== before) announce(itemLabel(bi))
  }
  const typing = (t: EventTarget | null) =>
    t instanceof Element &&
    !!t.closest('input, textarea, [contenteditable], [data-island="palette"]')

  on(document, 'keydown', (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
    if (typing(e.target)) return
    const k = e.key
    if (state.overlay === 'guide') trapTab(e, gpanel)
    if (k === 'g' || k === 'G') {
      e.preventDefault()
      if (state.overlay === 'guide') closeGuide()
      else openGuide()
      return
    }
    if (k === 'm' || k === 'M') {
      e.preventDefault()
      void toggleSound()
      return
    }
    if (state.overlay === 'guide') return guideKey(e)
    const ae = document.activeElement as HTMLElement | null
    const native =
      !!ae &&
      ae !== document.body &&
      ae.matches('a, button, [role=switch]') &&
      !ae.matches('.item, [role=tab]')
    const onTab = ae?.getAttribute('role') === 'tab'
    switch (k) {
      case 'ArrowLeft':
      case 'ArrowRight':
        e.preventDefault()
        goBlade(state.blade + (k === 'ArrowLeft' ? -1 : 1))
        syncFocus()
        break
      case 'ArrowUp':
      case 'ArrowDown':
        e.preventDefault()
        moveItem(k === 'ArrowUp' ? -1 : 1)
        if (!onTab) syncFocus()
        break
      case 'PageUp':
      case 'PageDown':
        e.preventDefault()
        moveItem(k === 'PageUp' ? -6 : 6)
        syncFocus()
        break
      case 'Home':
      case 'End':
        e.preventDefault()
        select(state.blade, k === 'Home' ? 0 : 1e9)
        announce(itemLabel(state.blade))
        syncFocus()
        break
      case 'Enter':
      case ' ':
        if (onTab) {
          e.preventDefault()
          blades[state.blade].list.focus()
          announce(itemLabel(state.blade))
          return
        }
        if (native) return
        e.preventDefault()
        follow(state.blade, state.sel[state.blade], null)
        break
      case 'Escape':
      case 'Backspace':
        if (state.blade !== HOME_BLADE) {
          e.preventDefault()
          goBlade(HOME_BLADE)
          cue('back')
          syncFocus()
        }
        break
      default:
        if (/^[1-5]$/.test(k)) {
          goBlade(Number(k) - 1)
          syncFocus()
        }
    }
  })

  /* ---------------------------------------------- modal plumbing -- */

  /** Keeps Tab cycling inside the guide rather than out to the browser. */
  function trapTab(e: KeyboardEvent, scope: HTMLElement) {
    if (e.key !== 'Tab') return
    const focusable = [
      ...scope.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => el.getClientRects().length && !el.closest('[hidden]'))
    if (!focusable.length) {
      e.preventDefault()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const a = document.activeElement
    if (e.shiftKey && (a === first || !scope.contains(a))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (a === last || !scope.contains(a))) {
      e.preventDefault()
      first.focus()
    }
  }
  function restoreFocus(el: Element | null) {
    const target =
      el instanceof HTMLElement &&
      el !== document.body &&
      el.isConnected &&
      !el.closest('[inert]') &&
      el.getClientRects().length
        ? el
        : blades[state.blade].list
    target.focus({ preventScroll: true })
  }

  /* ----------------------------------------------------------- guide -- */

  const guide = $<HTMLDialogElement>('#guide')
  const gpanel = $('#guidePanel')
  const glist = $('#glist')
  const gbackdrop = $('.guide-backdrop')
  const orbBtn = $('#orbBtn')
  let gActions: { t: string; i: IconKind; f: () => void }[] = []
  let gSel = 0
  let guideReturn: Element | null = null
  const gSpring = new Spring(0, 260, 22)
  let gRaf = 0

  const clockText = () =>
    new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })

  function openAt(bi: number, j: number) {
    closeGuide(true)
    goBlade(bi, { silent: true })
    select(bi, j, { silent: true, instant: true })
    follow(bi, j, null)
  }

  function buildGuide() {
    $('#guideCard').innerHTML = profileCardHTML(props.card, 'gd')
    const notes = data[2]
    const random = (Date.now() / 6e4) | 0
    gActions = [
      {
        t: 'Dashboard home',
        i: 'home',
        f: () => {
          closeGuide(true)
          goBlade(HOME_BLADE)
          select(HOME_BLADE, 0)
          blades[HOME_BLADE].list.focus()
        },
      },
      {
        t: `Latest: ${data[HOME_BLADE][0]?.title ?? ''}`,
        i: 'post',
        f: () => openAt(HOME_BLADE, 0),
      },
      {
        t: 'Random note',
        i: 'note',
        f: () => openAt(2, random % Math.max(1, notes.length)),
      },
      {
        t: 'Projects',
        i: 'project',
        f: () => {
          closeGuide(true)
          goBlade(0)
          blades[0].list.focus()
        },
      },
      {
        t: 'Search',
        i: 'link',
        f: () => {
          closeGuide(true)
          root.querySelector<HTMLElement>('[data-open-palette]')?.click()
        },
      },
      {
        t: 'GitHub',
        i: 'link',
        f: () =>
          void open('https://github.com/maxleiter', '_blank', 'noopener'),
      },
      {
        t: `Sound: ${soundOn ? 'On' : 'Off'}`,
        i: 'sound',
        f: () => void toggleSound(),
      },
      {
        t: `Glass: ${themeNow() === 'light' ? 'Light' : 'Dark'}`,
        i: 'theme',
        f: () =>
          root.querySelector<HTMLElement>('.item[data-theme-toggle]')?.click(),
      },
      {
        t: `Motion: ${reduceMotion ? 'Reduced' : 'Full'}`,
        i: 'motion',
        f: () => setMotion(!reduceMotion),
      },
      { t: 'Close guide', i: 'close', f: () => closeGuide() },
    ]
    glist.setAttribute('role', 'listbox')
    glist.setAttribute('aria-label', 'Guide actions')
    glist.tabIndex = 0
    glist.setAttribute('aria-activedescendant', `g-${gSel}`)
    glist.innerHTML = gActions
      .map(
        (a, j) =>
          `<button class="item${j === gSel ? ' is-sel' : ''}" type="button" role="option" tabindex="-1" id="g-${j}" data-g="${j}" aria-selected="${j === gSel}"><span class="ico" aria-hidden="true">${iconHTML(a.i)}</span><span class="it">${esc(a.t)}</span></button>`,
      )
      .join('')
  }

  function gSelect(j: number) {
    gSel = (j + gActions.length) % gActions.length
    glist.querySelectorAll('.item').forEach((el, k) => {
      el.classList.toggle('is-sel', k === gSel)
      el.setAttribute('aria-selected', String(k === gSel))
    })
    glist.setAttribute('aria-activedescendant', `g-${gSel}`)
    cue('tick')
  }

  function animGuide(done?: () => void) {
    cancelAnimationFrame(gRaf)
    let last = performance.now()
    const step = (now: number) => {
      const dt = clamp((now - last) / 1000, 0, 0.05)
      last = now
      if (reduceMotion) gSpring.snap()
      else gSpring.advance(dt)
      const x = gSpring.x
      gpanel.style.transform = `translateY(${((1 - x) * 40).toFixed(2)}px) scale(${(0.86 + 0.14 * x).toFixed(4)})`
      gpanel.style.opacity = clamp(x * 1.6, 0, 1).toFixed(3)
      gbackdrop.style.opacity = clamp(x, 0, 1).toFixed(3)
      if (!gSpring.settled) gRaf = requestAnimationFrame(step)
      else {
        gSpring.snap()
        done?.()
      }
    }
    gRaf = requestAnimationFrame(step)
  }

  function openGuide() {
    if (state.overlay) return
    guideReturn = document.activeElement
    state.overlay = 'guide'
    gSel = 0
    buildGuide()
    $('#guideClock').textContent = clockText()
    // Modal: the rest of the page is inert until it closes.
    guide.classList.remove('is-closing')
    if (!guide.open) guide.showModal()
    orbBtn.setAttribute('aria-expanded', 'true')
    glist.focus({ preventScroll: true })
    gSpring.x = 0
    gSpring.v = 0
    gSpring.target = 1
    animGuide()
    cue('guide')
  }

  function closeGuide(quiet?: boolean) {
    if (state.overlay !== 'guide') return
    state.overlay = null
    gSpring.target = 0
    // Closed at once, so the page is live again and focus can return to it;
    // `is-closing` keeps the panel on screen while it springs away.
    guide.classList.add('is-closing')
    guide.close()
    animGuide(() => {
      if (state.overlay !== 'guide') guide.classList.remove('is-closing')
    })
    orbBtn.setAttribute('aria-expanded', 'false')
    if (!quiet) {
      cue('back')
      restoreFocus(guideReturn)
    }
  }

  function guideKey(e: KeyboardEvent) {
    const cols = mobile() ? 1 : 2
    const k = e.key
    if (
      (k === 'Enter' || k === ' ') &&
      document.activeElement === $('#gClose')
    ) {
      return
    }
    const move: Record<string, number> = {
      ArrowDown: cols,
      ArrowUp: -cols,
      ArrowRight: 1,
      ArrowLeft: -1,
    }
    if (k === 'Escape' || k === 'Backspace') {
      e.preventDefault()
      closeGuide()
    } else if (k in move) {
      e.preventDefault()
      gSelect(gSel + move[k])
    } else if (k === 'Enter' || k === ' ') {
      e.preventDefault()
      gActions[gSel].f()
    }
  }

  on(glist, 'click', (e: MouseEvent) => {
    const it = (e.target as Element).closest<HTMLElement>('[data-g]')
    if (!it) return
    gSel = Number(it.dataset.g)
    gActions[gSel].f()
  })
  on(glist, 'pointermove', (e: PointerEvent) => {
    const it = (e.target as Element).closest<HTMLElement>('[data-g]')
    if (it && Number(it.dataset.g) !== gSel) gSelect(Number(it.dataset.g))
  })
  // Esc asks the dialog to close; it closes through the spring instead.
  on(guide, 'cancel', (e: Event) => {
    e.preventDefault()
    closeGuide()
  })
  on(guide, 'click', (e: MouseEvent) => {
    if ((e.target as Element).hasAttribute('data-close')) closeGuide()
  })
  on($('#gClose'), 'click', () => closeGuide())
  on(orbBtn, 'click', () =>
    state.overlay === 'guide' ? closeGuide() : openGuide(),
  )
  on($('#sound'), 'click', () => void toggleSound())
  on($('#skip'), 'click', (e: MouseEvent) => {
    e.preventDefault()
    blades[state.blade].list.focus()
  })

  /* ---------------------------------------------------------- toasts -- */

  const toastBox = $('#toasts')
  function toast(kicker: string, title: string, onClick?: () => void) {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'toast'
    el.innerHTML = `<span class="orb" aria-hidden="true"></span><span class="tx"><span class="tk">${esc(kicker)}<span class="sr-only">:</span></span> <span class="tt">${esc(title)}</span></span>`
    toastBox.appendChild(el)
    // Timed in simulated seconds, so a janky frame never cuts it short.
    const sp = new Spring(0, 230, 20)
    sp.target = 1
    let shown = 0
    let hideAfter = 5.2
    let last = performance.now()
    let frameId = 0
    el.onclick = () => {
      onClick?.()
      sp.target = 0
      hideAfter = 0
    }
    const step = (now: number) => {
      const dt = clamp((now - last) / 1000, 0, 0.05)
      last = now
      shown += dt
      if (shown > hideAfter && sp.target === 1) sp.target = 0
      if (reduceMotion) sp.snap()
      else sp.advance(dt)
      el.style.transform = `translateY(${((1 - sp.x) * 120).toFixed(2)}%)`
      el.style.opacity = clamp(sp.x * 2, 0, 1).toFixed(3)
      if (sp.target === 0 && sp.x < 0.01) {
        const had = el.contains(document.activeElement)
        el.remove()
        if (had && !state.overlay) blades[state.blade].list.focus()
        return
      }
      frameId = requestAnimationFrame(step)
    }
    frameId = requestAnimationFrame(step)
    disposers.push(() => cancelAnimationFrame(frameId))
    cue('toast')
  }

  /* --------------------------------------------------------- gamepad -- */

  const pad = {
    idx: null as number | null,
    prev: [] as boolean[],
    rep: {} as Record<string, { on: boolean; next: number }>,
    raf: 0,
  }
  const synthKey = (key: string) =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  function pollPad() {
    cancelAnimationFrame(pad.raf)
    const dirKeys: Record<string, string> = {
      L: 'ArrowLeft',
      R: 'ArrowRight',
      U: 'ArrowUp',
      D: 'ArrowDown',
    }
    const loop = (now: number) => {
      const gp = pad.idx === null ? null : navigator.getGamepads?.()[pad.idx]
      if (!gp) return
      const b = (i: number) => !!gp.buttons[i]?.pressed
      const ax = gp.axes[0] || 0
      const ay = gp.axes[1] || 0
      const dirs: Record<string, boolean> = {
        L: b(14) || ax < -0.55 || b(4),
        R: b(15) || ax > 0.55 || b(5),
        U: b(12) || ay < -0.55,
        D: b(13) || ay > 0.55,
      }
      for (const [k, down] of Object.entries(dirs)) {
        const r = (pad.rep[k] ||= { on: false, next: 0 })
        if (down && (!r.on || now >= r.next)) {
          // First press, then a held repeat after a pause.
          r.next = now + (r.on ? 130 : 380)
          r.on = true
          synthKey(dirKeys[k])
        } else if (!down) r.on = false
      }
      const press = (i: number) => b(i) && !pad.prev[i]
      if (press(0)) synthKey('Enter')
      if (press(1)) synthKey('Escape')
      if (press(9) || press(8) || press(16)) synthKey('g')
      pad.prev = gp.buttons.map((x) => x.pressed)
      pad.raf = requestAnimationFrame(loop)
    }
    pad.raf = requestAnimationFrame(loop)
  }
  on(window, 'gamepadconnected', (e: GamepadEvent) => {
    pad.idx = e.gamepad.index
    root.classList.add('pad')
    const name = `Controller ${e.gamepad.index + 1} connected`
    $('#padName').textContent = name
    toast('Controller', name)
    pollPad()
  })
  on(window, 'gamepaddisconnected', () => {
    pad.idx = null
    root.classList.remove('pad')
    toast('Controller', 'Controller disconnected')
  })

  /* ---------------------------------------------- clock, resize, boot -- */

  const clock = $('#clock')
  const tickClock = () => {
    clock.textContent = clockText()
  }
  tickClock()
  const clockTimer = window.setInterval(tickClock, 15000)

  on(reducedQuery, 'change', (e: MediaQueryListEvent) => setMotion(e.matches))
  on(window, 'resize', () => {
    measure()
    layout()
    bg?.resize()
  })
  on(document, 'visibilitychange', () =>
    bg?.still(document.hidden || reduceMotion),
  )
  // The reading-glass setting lives in the runtime; watch its result.
  const themeWatch = new MutationObserver(() => refreshSystem())
  themeWatch.observe(html, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })

  html.classList.add('js')
  root.classList.add('booted')
  if (reduceMotion) html.classList.add('rm')
  measure()

  // Where to open: `?blade=` (kept in the address bar as you move), a stored
  // selection per blade, and `?item=` or the old `?openPost=` for one item.
  const params = new URLSearchParams(location.search)
  try {
    const saved = JSON.parse(store('get', SELECTION) ?? 'null') as unknown
    if (Array.isArray(saved) && saved.length === N) {
      saved.forEach((j, bi) => {
        if (Number.isInteger(j))
          state.sel[bi] = clamp(j, 0, data[bi].length - 1)
      })
    }
  } catch {
    // A malformed entry; start at the top.
  }
  const wanted = BLADES.findIndex((b) => b.id === params.get('blade'))
  const slug = params.get('item') ?? params.get('openPost')
  let start = wanted >= 0 ? wanted : HOME_BLADE
  if (slug) {
    for (let bi = 0; bi < N; bi++) {
      const j = data[bi].findIndex((it) => it.slug === slug)
      if (j >= 0) {
        if (wanted < 0) start = bi
        if (bi === start) state.sel[bi] = j
        break
      }
    }
  }
  blades.forEach((_, bi) =>
    select(bi, state.sel[bi], { instant: true, silent: true, force: true }),
  )
  state.blade = start
  spring.target = start
  spring.snap()
  setActiveUI()
  layout()
  if (slug) blades[start].list.focus({ preventScroll: true })

  // The background starts once the dashboard is already interactive.
  later(() => {
    void import('./blades/ambient').then((mod) => {
      if (disposed) return
      const canvas = root.querySelector<HTMLCanvasElement>('#bg')
      if (!canvas) return
      bg = mod.startAmbient(
        canvas,
        BLADES[state.blade].rgb,
        reduceMotion || document.hidden,
      )
    })
  }, 120)

  if (!store('get', SEEN_TOAST)) {
    later(() => {
      store('set', SEEN_TOAST, '1')
      const latest = data[HOME_BLADE][0]
      if (latest) {
        toast('New post', latest.title, () => openAt(HOME_BLADE, 0))
      }
    }, 1600)
  }

  return () => {
    disposed = true
    for (const dispose of disposers) dispose()
    for (const id of timers) clearTimeout(id)
    clearInterval(clockTimer)
    cancelAnimationFrame(raf)
    cancelAnimationFrame(gRaf)
    cancelAnimationFrame(pad.raf)
    themeWatch.disconnect()
    bg?.dispose()
    synth?.close()
    meta?.setAttribute('content', themeNow() === 'light' ? '#fff' : '#000000')
  }
}
