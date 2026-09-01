/**
 * The whole client runtime for content pages.
 *
 * Island scheduling, the theme toggle, Cmd/Ctrl+K, delegated analytics and the
 * menubar clock. No framework: these are DOM operations, and a component
 * library would cost 7-52KB to do them.
 *
 * Islands are mounted through a generated wrapper that owns the `hydrate` call,
 * so preact lives in the island's shared chunk and never in this file.
 */

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

function schedule(el: HTMLElement): void {
  const on = el.dataset.on || 'idle'
  if (on === 'load') {
    void mount(el)
    return
  }
  if (on === 'visible') {
    // An island whose fallback is empty has a zero-area box, and
    // IntersectionObserver never reports a zero-area element as intersecting,
    // so it would silently never mount. Watch the parent in that case.
    const rect = el.getBoundingClientRect()
    const target =
      (rect.width === 0 || rect.height === 0) && el.parentElement
        ? el.parentElement
        : el
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          io.disconnect()
          void mount(el)
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(target)
    return
  }
  if (on === 'interaction') {
    for (const type of ['pointerenter', 'pointerdown', 'focusin', 'keydown']) {
      el.addEventListener(type, () => void mount(el), {
        once: true,
        passive: true,
      })
    }
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

/* --------------------------------------------- theme, analytics, clock -- */

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
  const tracked = target.closest<HTMLElement>('[data-track]')
  if (tracked) {
    const va = (window as { va?: VercelAnalytics }).va
    const { track, ...rest } = tracked.dataset
    va?.('event', { name: track as string, data: rest })
  }
})

const clock = document.getElementById('menubar-clock')
if (clock) {
  setInterval(() => {
    clock.textContent = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, 60_000)
}

/* ----------------------------------------------------- view transitions -- */

/**
 * Narrows the transition name to the card actually clicked, so a cross-document
 * navigation morphs that card into the article. Cards opt in with `data-slug`;
 * pages without them just cross-fade.
 *
 * The prefix has to come from the URL segment. `article-pages.tsx` names a post
 * `blog-post-<slug>` and a note `note-<slug>`, so hardcoding the post prefix
 * meant a note card could never pair with its article.
 */
addEventListener('pageswap', (event) => {
  const url = (
    event as unknown as { activation?: { entry?: { url?: string } } }
  ).activation?.entry?.url
  const match = url?.match(/\/(blog|notes)\/([^/?#]+)/)
  if (!match) return
  const [, section, slug] = match
  const name = section === 'notes' ? `note-${slug}` : `blog-post-${slug}`
  for (const el of document.querySelectorAll<HTMLElement>('[data-slug]')) {
    el.style.viewTransitionName = ''
  }
  const card = document.querySelector<HTMLElement>(
    `[data-slug="${CSS.escape(slug)}"]`,
  )
  if (card) card.style.viewTransitionName = name
})
