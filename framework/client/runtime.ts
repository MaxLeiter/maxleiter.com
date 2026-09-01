/**
 * The whole client runtime for content pages.
 *
 * Island scheduling, the theme toggle, Cmd/Ctrl+K, delegated analytics and
 * outgoing view-transition names. No framework: these are DOM operations, and a
 * component library would cost 7-52KB to do them.
 *
 * Islands are mounted through a generated wrapper that owns the `hydrate` call,
 * so preact lives in the island's shared chunk and never in this file.
 *
 * The menubar clock is NOT here. `#menubar-clock` only exists on the homepage,
 * where the desktop island hydrates over it and owns it; a second interval
 * writing `textContent` behind preact's back is one owner too many.
 */

import { transitionNameForUrl } from '../transitions'

type Mount = (el: HTMLElement, props: unknown) => void

const modules: Record<string, string> = (() => {
  const el = document.getElementById('__islands')
  try {
    return el ? JSON.parse(el.textContent || '{}') : {}
  } catch {
    return {}
  }
})()

const mounted = new WeakSet<HTMLElement>()

async function mount(el: HTMLElement): Promise<void> {
  if (mounted.has(el)) return
  mounted.add(el)
  const url = modules[el.dataset.island || '']
  if (!url) return
  let props: unknown
  try {
    props = el.dataset.props ? JSON.parse(el.dataset.props) : undefined
  } catch {
    props = undefined
  }
  const mod = (await import(/* @vite-ignore */ url)) as { default: Mount }
  mod.default(el, props)
}

/**
 * One IntersectionObserver for every `visible` island on the page, not one
 * each. `rootMargin` starts the import before the island reaches the viewport.
 *
 * The target is always the island element itself. An earlier version observed
 * `el.parentElement` whenever the island's rect had zero width or height, on
 * the belief that a zero-area target never intersects. It does: the spec sets
 * `isIntersecting` when the target and the root overlap or are edge-adjacent
 * "even if the intersection has zero area". The workaround's real effect was to
 * turn `visible` into `load` for the shot grid, whose island is a fragment
 * sibling of the grid, so its parent spans the entire article.
 */
let visibleObserver: IntersectionObserver | null = null

function observeForVisibility(el: HTMLElement): void {
  visibleObserver ||= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        visibleObserver?.unobserve(entry.target)
        void mount(entry.target as HTMLElement)
      }
    },
    { rootMargin: '200px' },
  )
  visibleObserver.observe(el)
}

function mountOnInteraction(el: HTMLElement): void {
  for (const type of ['pointerenter', 'pointerdown', 'focusin', 'keydown']) {
    el.addEventListener(type, () => void mount(el), {
      once: true,
      passive: true,
    })
  }
}

function schedule(el: HTMLElement): void {
  const on = el.dataset.on || 'idle'
  if (on === 'load') {
    void mount(el)
    return
  }
  if (on === 'visible') {
    observeForVisibility(el)
    // Belt and braces. `mount` is idempotent, so an island the observer never
    // reports -- a tab that is never painted, a fallback the layout gives no
    // box -- still mounts the moment someone touches it. Only reachable for an
    // island whose fallback has area; the shot grid's is empty by design, and
    // the observer is its only path.
    mountOnInteraction(el)
    return
  }
  if (on === 'interaction') {
    mountOnInteraction(el)
    return
  }
  const idle =
    window.requestIdleCallback ||
    ((fn: () => void) => window.setTimeout(fn, 200))
  idle(() => void mount(el))
}

for (const el of document.querySelectorAll<HTMLElement>('[data-island]')) {
  schedule(el)
}

/* ------------------------------------------------------------- palette -- */

function openPalette(): void {
  const el = document.querySelector<HTMLElement>('[data-island="palette"]')
  if (!el) return
  el.hidden = false
  // Focus first so typing is never swallowed while the module loads.
  el.querySelector<HTMLInputElement>('[data-palette-input]')?.focus()
  void mount(el)
}

addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault()
    openPalette()
  }
})

/* ---------------------------------------------------- theme, analytics -- */

interface VercelAnalytics {
  (event: 'event', payload: { name: string; data?: unknown }): void
}

document.addEventListener('click', (event) => {
  const target = event.target as Element | null
  if (!target) return

  if (target.closest('[data-open-palette]')) {
    event.preventDefault()
    openPalette()
    return
  }

  if (target.closest('[data-theme-toggle]')) {
    const root = document.documentElement
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.theme = next
    } catch {
      // Private mode; the toggle still works for this page view.
    }
    root.dataset.theme = next
    root.style.colorScheme = next
    return
  }

  // `data-track` is the event name; every OTHER data attribute on the element
  // becomes a payload key, camelCased by the dataset API. So `data-section`
  // arrives as `{section}`, while `data-track-section` would arrive as
  // `{trackSection}`. Name payload attributes after the key you want.
  //
  // `data-vt-name` is the one exception: it is the view-transition opt-in
  // below, not analytics data, and post cards carry both attributes.
  const tracked = target.closest<HTMLElement>('[data-track]')
  if (tracked) {
    const va = (window as { va?: VercelAnalytics }).va
    const { track, ...rest } = tracked.dataset
    delete rest.vtName
    va?.('event', { name: track as string, data: rest })
  }
})

/* ----------------------------------------------------- view transitions -- */

/**
 * The single owner of outgoing `view-transition-name` assignment.
 *
 * Elements opt in declaratively with `data-vt-name`, and this handler names at
 * most one of them: the one matching the name the destination article will
 * carry. Pages with no candidate just cross-fade.
 *
 * It stands down entirely when something already holds that name as a live
 * inline style. That is how the desktop's open post window wins over the card
 * behind it: the window frame renders its own `view-transition-name`, and the
 * reader is looking at the window, so the window is what should morph. Two
 * elements holding one name cancels the transition outright, which is why this
 * has to be a single decision rather than two listeners overwriting each other
 * in a load-bearing registration order.
 *
 * It also clears only the element it named itself, never every candidate on the
 * page: a blanket clear wipes a name another owner set.
 */
let namedForTransition: HTMLElement | null = null

function isNameLive(name: string): boolean {
  for (const el of document.querySelectorAll<HTMLElement>('[style]')) {
    if (el.style.viewTransitionName === name) return true
  }
  return false
}

addEventListener('pageswap', (event) => {
  if (namedForTransition) {
    namedForTransition.style.viewTransitionName = ''
    namedForTransition = null
  }

  const url = (
    event as unknown as { activation?: { entry?: { url?: string } } }
  ).activation?.entry?.url
  const name = url ? transitionNameForUrl(url) : null
  if (!name || isNameLive(name)) return

  const el = document.querySelector<HTMLElement>(
    `[data-vt-name="${CSS.escape(name)}"]`,
  )
  if (!el) return
  el.style.viewTransitionName = name
  namedForTransition = el
})
