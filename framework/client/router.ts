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

import { isNameLive, transitionNameForUrl } from '../shared/transitions'

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
 *
 * Entries expire after five minutes. The cache exists to bridge the gap
 * between a prefetch trigger and the click it anticipates -- seconds -- not to
 * keep a long-lived tab serving whatever the site said when it last looked.
 */
const CACHE_LIMIT = 10
const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, { at: number; html: Promise<string | null> }>()

const MAX_PREFETCH_IN_FLIGHT = 4
let prefetchInFlight = 0

function remember(url: string, pending: Promise<string | null>): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(url, { at: Date.now(), html: pending })
}

function cached(url: string): Promise<string | null> | null {
  const entry = cache.get(url)
  if (!entry) return null
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(url)
    return null
  }
  return entry.html
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
  const existing = cached(url)
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
  if (cached(url) || prefetchInFlight >= MAX_PREFETCH_IN_FLIGHT) return
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
 * cancels the transition outright.
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

function withTransition(update: () => void, enabled: boolean): Promise<void> {
  if (
    !enabled ||
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
/**
 * What a head tag identifies, or null if the page does not own it.
 *
 * `<meta charset>` has no name and so is never keyed, never compared and never
 * touched -- the same goes for the font preloads, the theme script, the
 * speculation rules and `#css-base`, none of which are meta or canonical tags.
 */
function headKey(el: Element): string | null {
  if (el.tagName === 'META') {
    const name = el.getAttribute('name') ?? el.getAttribute('property')
    // theme-color is viewer state: the theme script and the toggle own its
    // content, and a swap writing the built dark value back would undo them.
    // shell-id describes the shell this page booted with, which a swap never
    // replaces -- and a mismatched one hard-navigates before reaching here.
    if (name === 'theme-color' || name === 'shell-id') return null
    return name ? `meta:${name}` : null
  }
  if (el.tagName === 'LINK') {
    return el.getAttribute('rel') === 'canonical' ? 'link:canonical' : null
  }
  return null
}

const OWNED_HEAD = 'meta, link[rel="canonical"]'

/**
 * Updates the head in place, touching only what actually differs.
 *
 * Deliberately NOT `head.replaceChildren()`, and no longer even a remove-all
 * then insert-all of the page-specific tags: iOS Firefox showed its loading
 * indicator on soft navigations while iOS Safari, the same engine on the same
 * router path, did not. The difference is the browser shell reacting to head
 * churn, so the swap now rewrites one attribute at a time. A typical
 * navigation changes the title, the description, the canonical and a couple of
 * og/twitter values, and writes nothing else.
 *
 * Works for a partial and a full document alike: a full document carries the
 * site-wide tags too, and those compare equal and are left alone.
 */
function swapHead(doc: Document): void {
  if (document.title !== doc.title) document.title = doc.title

  // The page stylesheet keeps its element; only the rules inside it change.
  const nextCss = doc.getElementById('css-page')?.textContent ?? ''
  const pageCss = document.getElementById('css-page')
  if (pageCss && pageCss.textContent !== nextCss) pageCss.textContent = nextCss

  // The post's structured data, swapped like the stylesheet. Only pages with
  // an article type carry one, so it also has to appear and disappear.
  const nextLd = doc.getElementById('jsonld')
  const pageLd = document.getElementById('jsonld')
  if (pageLd && nextLd) {
    if (pageLd.textContent !== nextLd.textContent) {
      pageLd.textContent = nextLd.textContent
    }
  } else if (pageLd) {
    pageLd.remove()
  } else if (nextLd) {
    document.head.appendChild(document.importNode(nextLd, true))
  }

  const current = new Map<string, Element>()
  for (const el of document.head.querySelectorAll(OWNED_HEAD)) {
    const key = headKey(el)
    if (key) current.set(key, el)
  }

  const seen = new Set<string>()
  for (const el of doc.querySelectorAll(OWNED_HEAD)) {
    const key = headKey(el)
    if (!key) continue
    seen.add(key)
    const existing = current.get(key)
    if (!existing) {
      document.head.appendChild(document.importNode(el, true))
      continue
    }
    const attr = existing.tagName === 'META' ? 'content' : 'href'
    const value = el.getAttribute(attr)
    if (value !== null && existing.getAttribute(attr) !== value) {
      existing.setAttribute(attr, value)
    }
  }

  // A page can legitimately drop a tag: `posts/nintype.mdx` has a blank
  // description, and the shell omits all three description tags rather than
  // substituting a default.
  for (const [key, el] of current) {
    if (!seen.has(key)) el.remove()
  }
}

/* ------------------------------------------------------------ navigate -- */

/**
 * The newest navigation wins. A guard that simply dropped a second call while
 * one was in flight also dropped popstate: the browser had already moved the
 * URL, so the address bar and the page disagreed until the next click.
 */
let navSeq = 0

export interface NavigateOptions {
  /** False when replaying history, where the entry already exists. */
  push: boolean
  /** Scroll offset to restore. Fresh navigations start at the top. */
  scroll?: number
  /** The element that started this, for the transition-name handoff. */
  source?: Element | null
  /**
   * False for back/forward on a phone: the browser already animates the swipe
   * gesture, and a morph on top of it reads as the page lurching.
   */
  transition?: boolean
}

/**
 * Scrolls a fresh navigation to its destination: the `#fragment` target when
 * the URL carries one, the top otherwise. History replays restore an offset
 * instead and never come here.
 */
function scrollToDestination(url: string): void {
  const { hash } = new URL(url, location.href)
  if (hash) {
    let target: Element | null = null
    try {
      target = document.getElementById(decodeURIComponent(hash.slice(1)))
    } catch {
      // A malformed escape sequence; fall through to the top.
    }
    if (target) {
      target.scrollIntoView()
      return
    }
  }
  scrollTo(0, 0)
}

export async function navigate(
  url: string,
  { push, scroll, source = null, transition = true }: NavigateOptions,
): Promise<void> {
  const seq = ++navSeq
  const html = await request(url)
  if (seq !== navSeq) return
  if (html === null) {
    location.href = url
    return
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')

  // Deploy skew. The shell-id hashes everything a partial does not carry --
  // the runtime, the base sheet, the fonts -- so a document built by a
  // different shell must not be swapped under this one. A hard navigation
  // picks up the new shell wholesale. A missing incoming id is an older
  // deploy and gets the same treatment.
  const runningShell = document
    .querySelector('meta[name="shell-id"]')
    ?.getAttribute('content')
  const incomingShell = doc
    .querySelector('meta[name="shell-id"]')
    ?.getAttribute('content')
  if (runningShell && incomingShell !== runningShell) {
    location.href = url
    return
  }

  // Drop every executable script before adopting the document. The runtime
  // is inlined into each page and is already running here, so re-running it
  // would double every listener; the theme script has already done its job,
  // and analytics stays live in the JS realm without its tag. JSON scripts
  // are data, not code: `#__islands` and `#jsonld` are two, and must survive.
  for (const script of doc.querySelectorAll('script')) {
    if (
      script.type !== 'application/json' &&
      script.type !== 'application/ld+json'
    ) {
      script.remove()
    }
  }

  if (push) history.replaceState({ scroll: scrollY }, '')
  const release = claimTransitionName(source, url)

  await withTransition(() => {
    if (seq !== navSeq) return
    // Islands go first: their unmount has to run while the DOM they
    // hydrated is still attached, or preact tears down detached nodes and
    // the listeners they registered on window and document leak.
    hooks.teardown()
    resetLinkObserver()
    swapHead(doc)
    document.body.replaceChildren(...doc.body.childNodes)
    // A <video> parsed inside the inert DOMParser document does not get a
    // working load when adopted in Firefox ("No video with supported
    // format"), and calling load() on it aborts that first attempt, which
    // leaves "playback aborted due to a network error" in the controls even
    // though the retry plays. A clone created here, in the live document,
    // runs source selection exactly once on insertion.
    for (const video of document.body.querySelectorAll('video')) {
      video.replaceWith(video.cloneNode(true))
    }
    if (push) history.pushState({ scroll: 0 }, '', url)
    hooks.setup()
    observeLinks()
    if (scroll === undefined) scrollToDestination(url)
    else scrollTo(0, scroll)
    // A swap leaves focus on the body with the clicked link gone. Focusing
    // the new main region resumes keyboard order there and makes screen
    // readers announce the page change; `preventScroll` keeps the scroll
    // position the two lines above just chose.
    const region = document.querySelector<HTMLElement>('main') ?? document.body
    region.tabIndex = -1
    region.focus({ preventScroll: true })
  }, transition)

  release()
}

/* ------------------------------------------------------------- install -- */

/**
 * Takes over navigation. Called only from `runtime.ts`, on every browser; the
 * module stays a lazy `import()` so it never rides in the inline runtime.
 */
export function installRouter(islandHooks: IslandHooks): void {
  hooks = islandHooks

  // This router restores scroll itself, from the offset it stashes in
  // `history.state`. Left on `auto`, the browser also restores on popstate --
  // immediately, against the OLD page's height, before the fetch has even
  // resolved -- and the two restorations fight as a visible double-jump.
  history.scrollRestoration = 'manual'

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
    void navigate(location.href, {
      push: false,
      scroll: state?.scroll ?? 0,
      transition: !matchMedia('(max-width: 767px)').matches,
    })
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
