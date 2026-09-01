/**
 * A same-document router for a fully static site.
 *
 * The point is the loading indicator. A cross-document navigation makes the
 * browser show its spinner and, on mobile, blank the page for as long as the
 * request takes. Fetching the next page and swapping the parts that differ
 * keeps the paint continuous, so navigation feels instant even though the same
 * bytes are fetched.
 *
 * No route table: every page is already a complete HTML document on a CDN, so
 * "routing" is fetch, parse, swap. Anything this cannot handle falls back to a
 * real navigation rather than guessing.
 */

import { isNameLive, transitionNameForUrl } from '../transitions'

export interface IslandHooks {
  /** Unmount every hydrated island. Runs BEFORE the body is replaced. */
  teardown: () => void
  /** Read the new page's island map and schedule its islands. */
  setup: () => void
}

let hooks: IslandHooks = {
  teardown: () => undefined,
  setup: () => undefined,
}

/* ------------------------------------------------------------ eligible -- */

/**
 * The one definition of "this router handles that link", shared by the click
 * handler and all three prefetch triggers.
 *
 * Everything it rejects stays a normal browser navigation: another origin, a
 * download, a new tab, an in-page anchor, or anything opted out with
 * `data-no-router`.
 */
export function routableLink(
  target: EventTarget | null,
): HTMLAnchorElement | null {
  // Not every event target is an Element. A delegated `pointerdown` or
  // `touchstart` in the capture phase is dispatched at `document` itself,
  // which has no `closest`, and a text node can be the target of a click.
  const el = target instanceof Element ? target : null
  const link = el?.closest<HTMLAnchorElement>('a[href]')
  if (!link) return null
  if (link.target && link.target !== '_self') return null
  if (link.hasAttribute('download')) return null
  if (link.closest('[data-no-router]')) return null
  if ((link.getAttribute('rel') || '').split(/\s+/).includes('external')) {
    return null
  }
  let url: URL
  try {
    url = new URL(link.href, location.href)
  } catch {
    return null
  }
  if (url.origin !== location.origin) return null
  // A pure hash change is the browser's job: it scrolls and updates history
  // without a request, which is exactly right.
  if (url.hash && url.pathname === location.pathname) return null
  return link
}

/* ------------------------------------------------------------ fetching -- */

/**
 * Pages already requested, keyed by URL and holding the PROMISE rather than
 * the text. That is what lets a `pointerdown` prefetch and the click ~100ms
 * later share one request: the click awaits the same promise instead of
 * starting a second fetch.
 */
const CACHE_LIMIT = 10
const cache = new Map<string, Promise<string | null>>()

const MAX_PREFETCH_IN_FLIGHT = 4
let prefetchInFlight = 0

function remember(url: string, pending: Promise<string | null>): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(url, pending)
}

/** The document's HTML, or null when this navigation must be left to the browser. */
async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { accept: 'text/html' } })
    if (!res.ok) return null
    if (!(res.headers.get('content-type') || '').includes('text/html')) {
      return null
    }
    return await res.text()
  } catch {
    // Offline, blocked, aborted: let the browser show its own failure.
    return null
  }
}

/**
 * The partial carries only what a swap replaces: title, the per-page meta and
 * canonical tags, that page's CSS fragments, its island map and its body. The
 * base stylesheet, the fonts and the runtime are identical on every page and
 * are already in the document, so refetching them is pure waste.
 *
 * A page that has no partial -- an older deploy, a route the build did not
 * emit one for -- falls back to the full document, which swaps correctly too.
 */
function partialUrl(url: string): string {
  const parsed = new URL(url, location.href)
  const path = parsed.pathname
  parsed.pathname = path.endsWith('/')
    ? `${path}index.partial.html`
    : `${path}/index.partial.html`
  return parsed.toString()
}

async function fetchPage(url: string): Promise<string | null> {
  const partial = await fetchHtml(partialUrl(url))
  return partial ?? (await fetchHtml(url))
}

function request(url: string): Promise<string | null> {
  const existing = cache.get(url)
  if (existing) return existing
  const pending = fetchPage(url).then((html) => {
    // Never cache a failure; the next attempt should be able to succeed.
    if (html === null) cache.delete(url)
    return html
  })
  remember(url, pending)
  return pending
}

/** Data Saver, 2g and slow-2g readers get no speculative traffic at all. */
function prefetchAllowed(): boolean {
  const connection = (
    navigator as {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
  ).connection
  if (!connection) return true
  if (connection.saveData) return false
  const type = connection.effectiveType
  return type !== '2g' && type !== 'slow-2g'
}

export function prefetch(url: string): void {
  if (!prefetchAllowed()) return
  if (cache.has(url) || prefetchInFlight >= MAX_PREFETCH_IN_FLIGHT) return
  prefetchInFlight += 1
  void request(url).finally(() => {
    prefetchInFlight -= 1
  })
}

/* ----------------------------------------- links entering the viewport -- */

const observed = new WeakSet<Element>()
let linkObserver: IntersectionObserver | null = null

const idle: (fn: () => void) => void =
  window.requestIdleCallback?.bind(window) ||
  ((fn) => window.setTimeout(fn, 200))

/**
 * Prefetches links as they come near the viewport, on idle so it never
 * competes with rendering. Re-run after every swap, because the new body has
 * new anchors.
 */
export function observeLinks(): void {
  if (!prefetchAllowed()) return
  linkObserver ||= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        linkObserver?.unobserve(entry.target)
        const link = entry.target as HTMLAnchorElement
        idle(() => prefetch(link.href))
      }
    },
    { rootMargin: '200px' },
  )
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (observed.has(link) || !routableLink(link)) continue
    observed.add(link)
    linkObserver.observe(link)
  }
}

function resetLinkObserver(): void {
  linkObserver?.disconnect()
  linkObserver = null
}

/* ---------------------------------------------------- view transitions -- */

/**
 * Hands the outgoing name to the element the reader actually clicked, so a
 * card morphs into the article it opens.
 *
 * It stands down when something already holds that name, which is how the
 * desktop's open post window wins over the card behind it: the window frame
 * renders `view-transition-name` itself, and two elements holding one name
 * cancels the transition outright. Same single-owner rule as the `pageswap`
 * handler in runtime.ts, which still covers navigations this router does not
 * intercept.
 */
function claimTransitionName(source: Element | null, url: string): () => void {
  const noop = () => undefined
  const el = source?.closest<HTMLElement>('[data-vt-name]')
  const name = el?.dataset.vtName
  if (!el || !name || name !== transitionNameForUrl(url)) return noop
  if (isNameLive(name)) return noop
  el.style.viewTransitionName = name
  return () => {
    el.style.viewTransitionName = ''
  }
}

function withTransition(update: () => void): Promise<void> {
  if (
    typeof document.startViewTransition !== 'function' ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    update()
    return Promise.resolve()
  }
  const transition = document.startViewTransition(update)
  // A skipped transition -- a background tab, a second one starting on top of
  // this one -- rejects these. The swap still happens, because the update
  // callback runs either way, so the rejection is noise.
  const ignore = () => undefined
  transition.ready.catch(ignore)
  transition.updateCallbackDone.catch(ignore)
  return transition.finished.catch(ignore).then(() => undefined)
}

/* ---------------------------------------------------------------- swap -- */

/** Head tags a page owns. Everything else in `<head>` is identical site-wide. */
const PER_PAGE_HEAD =
  'title, meta[name="description"], meta[name="robots"], ' +
  'meta[name="googlebot"], link[rel="canonical"], ' +
  'meta[property^="og:"], meta[name^="twitter:"]'

/**
 * Replaces the page-specific head tags and the page stylesheet, and leaves
 * `#css-base`, the fonts, the preloads and the runtime alone.
 *
 * Works for a partial and for a full document alike: a full document simply
 * carries the base tags too, and those are matched by neither selector.
 */
function swapHead(doc: Document): void {
  document.title = doc.title
  for (const el of document.head.querySelectorAll(PER_PAGE_HEAD)) el.remove()
  const incoming = doc.querySelectorAll(PER_PAGE_HEAD)
  const pageCss = doc.querySelector('#css-page')
  const current = document.getElementById('css-page')
  if (pageCss && current) {
    current.textContent = pageCss.textContent
  }
  // In front of the stylesheets, matching the order renderShell emits.
  const base = document.getElementById('css-base')
  for (const el of incoming) {
    if (el.id === 'css-page') continue
    document.head.insertBefore(el, base)
  }
}

/* ------------------------------------------------------------ navigate -- */

let navigating = false

export interface NavigateOptions {
  /** False when replaying history, where the entry already exists. */
  push: boolean
  /** Scroll offset to restore. Fresh navigations start at the top. */
  scroll?: number
  /** The element that started this, for the transition-name handoff. */
  source?: Element | null
}

export async function navigate(
  url: string,
  { push, scroll = 0, source = null }: NavigateOptions,
): Promise<void> {
  if (navigating) return
  navigating = true
  try {
    const html = await request(url)
    if (html === null) {
      location.href = url
      return
    }

    const doc = new DOMParser().parseFromString(html, 'text/html')

    // Drop every executable script before adopting the document. The runtime
    // is inlined into each page and is already running here, so re-running it
    // would double every listener; the theme script has already done its job,
    // and analytics stays live in the JS realm without its tag. JSON scripts
    // are data, not code: `#__islands` is one, and it must survive.
    for (const script of doc.querySelectorAll('script')) {
      if (script.type !== 'application/json') script.remove()
    }

    if (push) history.replaceState({ scroll: scrollY }, '')
    const release = claimTransitionName(source, url)

    await withTransition(() => {
      // Islands go first: their unmount has to run while the DOM they
      // hydrated is still attached, or preact tears down detached nodes and
      // the listeners they registered on window and document leak.
      hooks.teardown()
      resetLinkObserver()
      swapHead(doc)
      document.body.replaceChildren(...doc.body.childNodes)
      if (push) history.pushState({ scroll: 0 }, '', url)
      hooks.setup()
      observeLinks()
      scrollTo(0, scroll)
    })

    release()
  } finally {
    navigating = false
  }
}

/* ------------------------------------------------------------- install -- */

/**
 * Takes over navigation. Called only from `runtime.ts`, and only when the
 * browser cannot prerender natively -- which is why this whole module is a
 * lazy `import()` and never reaches a browser that has the native path.
 */
export function installRouter(islandHooks: IslandHooks): void {
  hooks = islandHooks

  /**
   * Everything `routableLink` rejects, and every click carrying a modifier or
   * a non-primary button, stays a real browser navigation -- which is what
   * makes cmd-click, middle-click and "open in new tab" behave as always.
   */
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = routableLink(event.target)
    if (!link) return
    event.preventDefault()
    void navigate(link.href, { push: true, source: link })
  })

  addEventListener('popstate', () => {
    const state = history.state as { scroll?: number } | null
    void navigate(location.href, { push: false, scroll: state?.scroll ?? 0 })
  })

  /**
   * Three prefetch triggers, cheapest first. `pointerdown` is the valuable
   * one: it fires roughly 100ms before the click, and because the cache holds
   * the in-flight promise the click consumes that same request rather than
   * starting a second.
   */
  for (const type of ['pointerenter', 'pointerdown', 'touchstart'] as const) {
    document.addEventListener(
      type,
      (event) => {
        const link = routableLink(event.target)
        if (link) prefetch(link.href)
      },
      { capture: true, passive: true },
    )
  }

  observeLinks()
}
