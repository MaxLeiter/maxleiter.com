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

/** The generated island entry returns its own teardown. */
type Mount = (el: HTMLElement, props: unknown) => void | (() => void)

/** Island name -> hashed module URL, merged across every page visited. */
const modules: Record<string, string> = {}

function readIslandModules(): void {
  const el = document.getElementById('__islands')
  try {
    if (el) Object.assign(modules, JSON.parse(el.textContent || '{}'))
  } catch {
    // A malformed map means no islands mount; the fallbacks still render.
  }
}
readIslandModules()

const mounted = new WeakSet<HTMLElement>()
const unmounts = new Set<() => void>()

/**
 * Bumped by every teardown. A dynamic import started before a navigation must
 * not hydrate into the detached element it was scheduled for once the page has
 * been swapped out from under it.
 */
let generation = 0

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
  const era = generation
  const mod = (await import(/* @vite-ignore */ url)) as { default: Mount }
  if (era !== generation) return
  const dispose = mod.default(el, props)
  if (typeof dispose === 'function') unmounts.add(dispose)
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

/**
 * An island with no `data-on` is mounted by name instead: the command palette
 * renders `hidden`, so no trigger listener on it could ever fire, and
 * `openPalette()` below is its only path in.
 */
function schedule(el: HTMLElement): void {
  const on = el.dataset.on
  if (on === 'load') {
    // After first paint, not during it. This runtime is an inline module, so
    // it runs before the browser has painted anything; starting the desktop's
    // 48 KB import here put all of it on the homepage's critical path, for an
    // island whose markup is already server-rendered and already reads as
    // links. rAF fires before the paint, the `setTimeout` after it.
    requestAnimationFrame(() => setTimeout(() => void mount(el), 0))
  } else if (on === 'visible') {
    observeForVisibility(el)
    // Belt and braces. `mount` is idempotent, so an island the observer never
    // reports -- a tab that is never painted, a fallback the layout gives no
    // box -- still mounts the moment someone touches it. Only reachable for an
    // island whose fallback has area; the shot grid's is empty by design, and
    // the observer is its only path.
    mountOnInteraction(el)
  }
}

function scheduleIslands(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-island]')) {
    schedule(el)
  }
}

/**
 * Unmounts every island before the router replaces the body.
 *
 * Islands register listeners on `window` and `document` -- the desktop's Ctrl+W
 * handler, its breakpoint and clock subscriptions -- which outlive their own
 * DOM. Without this they would accumulate one set per navigation.
 */
function unmountIslands(): void {
  generation++
  for (const dispose of unmounts) {
    try {
      dispose()
    } catch {
      // A failed teardown must not stop the rest, or the navigation.
    }
  }
  unmounts.clear()
  visibleObserver?.disconnect()
  visibleObserver = null
}

function adoptIslands(): void {
  readIslandModules()
  scheduleIslands()
}

scheduleIslands()

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
    // Open windows iframe same-origin embeds, so their documents are ours to
    // write. Each booted from localStorage before this click and would keep
    // the old theme until reloaded.
    for (const frame of document.querySelectorAll('iframe')) {
      const doc = frame.contentDocument?.documentElement
      if (doc) {
        doc.dataset.theme = next
        doc.style.colorScheme = next
      }
    }
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

/* -------------------------------------------------------------- router -- */

/**
 * Instant navigation: the router, lazily imported, on every browser.
 *
 * An earlier version let Chrome and Edge use Speculation Rules prerender with a
 * cross-document view transition and installed the router only elsewhere. The
 * prerender was faster when it fired, but its failure mode was a full hard
 * navigation (a quick click, touch input, Chrome's prerender budget) and it
 * re-fetched the whole document, inlined CSS and runtime included, on every
 * link. The router's worst case is a 3KB partial, the same on every browser,
 * and it is one code path instead of two.
 *
 * Keep the import lazy: a static one would put the router in this inline
 * runtime on every page.
 */
// A framed document is an `/embed` inside a desktop window. Its links carry
// `<base target="_top">` and must reach the browser untouched; the router
// reads the anchor's own `target`, which `<base>` does not set, and would
// swap the new page into the frame.
const framed = window.self !== window.top

if (!framed) {
  /**
   * Holds a click that lands before the router chunk arrives.
   *
   * The import is lazy on purpose, so there is a window -- a slow connection,
   * a tap on a link the moment the page paints -- where a click would have
   * been a real navigation with the loading indicator the router exists to
   * remove. This holds one, and hands it to the router the instant it loads.
   *
   * The eligibility rules are the conservative half of the router's own
   * `routableLink`: anything this misses stays a real navigation, which is
   * where it would have gone anyway.
   */
  let pending: { href: string; source: Element } | null = null

  const hold = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const target = event.target instanceof Element ? event.target : null
    const link = target?.closest<HTMLAnchorElement>('a[href]')
    if (!link || (link.target && link.target !== '_self')) return
    if (link.hasAttribute('download') || link.closest('[data-no-router]'))
      return
    const url = new URL(link.href, location.href)
    if (url.origin !== location.origin || url.hash) return
    event.preventDefault()
    pending = { href: url.href, source: link }
  }

  // Capture phase, so it runs before any handler that might act on the click.
  document.addEventListener('click', hold, true)

  void import('./router')
    .then((router) => {
      document.removeEventListener('click', hold, true)
      router.installRouter({ teardown: unmountIslands, setup: adoptIslands })
      if (pending) {
        void router.navigate(pending.href, {
          push: true,
          source: pending.source,
        })
      }
    })
    .catch(() => {
      // No router means plain cross-document navigation, which always works --
      // but a click this held has to go somewhere, or it is simply lost.
      document.removeEventListener('click', hold, true)
      if (pending) location.href = pending.href
    })
}
