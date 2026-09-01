import type { MouseEvent } from 'react'
import {
  lazy,
  Suspense,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { flushSync } from 'react-dom'
import { DesktopChrome, type ChromeHandlers } from './desktop/chrome'
import { Window } from './desktop/window'
import {
  CONTENT_WINDOWS,
  embedHref,
  postHref,
  postTransitionName,
  type DesktopPost,
  type DesktopProps,
  type WindowId,
} from './desktop/data'

/**
 * The desktop window manager, hydrated over the markup `app/pages/home.tsx`
 * already rendered.
 *
 * `next/link`, `useRouter`, `next/dynamic` and React's `<ViewTransition>` are
 * all gone. Maximize was always a navigation rather than a resize, so it is
 * `location.assign` now; the same-document window open/close animation calls
 * `document.startViewTransition` directly, and the cross-document half of it is
 * the platform's, driven by matching `view-transition-name` values.
 */

const CALCULATOR_TITLE = 'calculator'

const Calculator = lazy(() => import('./desktop/calculator'))

/* --------------------------------------------------------------- state -- */

interface WindowState {
  openWindows: Set<WindowId>
  blogPostSlug: string | null
  focusedWindow: string | null
  zIndexes: Record<string, number>
  nextZIndex: number
}

type WindowAction =
  | { type: 'OPEN_WINDOW'; id: WindowId }
  | { type: 'CLOSE_WINDOW'; id: WindowId }
  | { type: 'OPEN_BLOG_POST'; slug: string }
  | { type: 'CLOSE_BLOG_POST' }
  | { type: 'FOCUS'; id: string }

const INITIAL_STATE: WindowState = {
  openWindows: new Set(),
  blogPostSlug: null,
  focusedWindow: null,
  zIndexes: {},
  nextZIndex: 50,
}

function reducer(state: WindowState, action: WindowAction): WindowState {
  switch (action.type) {
    case 'OPEN_WINDOW': {
      const openWindows = new Set(state.openWindows)
      openWindows.add(action.id)
      return {
        ...state,
        openWindows,
        focusedWindow: action.id,
        zIndexes: { ...state.zIndexes, [action.id]: state.nextZIndex },
        nextZIndex: state.nextZIndex + 1,
      }
    }
    case 'CLOSE_WINDOW': {
      const openWindows = new Set(state.openWindows)
      openWindows.delete(action.id)
      return { ...state, openWindows }
    }
    case 'OPEN_BLOG_POST': {
      const id = `blog-post-${action.slug}`
      return {
        ...state,
        blogPostSlug: action.slug,
        focusedWindow: id,
        zIndexes: { ...state.zIndexes, [id]: state.nextZIndex },
        nextZIndex: state.nextZIndex + 1,
      }
    }
    case 'CLOSE_BLOG_POST':
      return { ...state, blogPostSlug: null }
    case 'FOCUS':
      return {
        ...state,
        focusedWindow: action.id,
        zIndexes: { ...state.zIndexes, [action.id]: state.nextZIndex },
        nextZIndex: state.nextZIndex + 1,
      }
    default:
      return state
  }
}

/* -------------------------------------------------------------- hooks -- */

const subscribeToResize = (callback: () => void) => {
  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeToResize,
    () => window.innerWidth < 768,
    () => false,
  )
}

/**
 * The clock the inline script in the page already wrote, kept ticking.
 *
 * Seeding from the DOM rather than a `window.__INITIAL_TIME__` global is the
 * whole replacement for that handshake: the value is already in the markup, so
 * the first render matches it by construction.
 */
function useClock(): string {
  const [time, setTime] = useState(
    () => document.getElementById('menubar-clock')?.textContent ?? '',
  )

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      )
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  return time
}

/** Animates a window opening or closing, when the browser and the user allow. */
function withTransition(update: () => void): void {
  if (
    typeof document.startViewTransition !== 'function' ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    update()
    return
  }
  const transition = document.startViewTransition(() => flushSync(update))
  // A transition the browser skips -- a background tab, a second transition
  // starting on top of this one -- rejects these. The window still opens,
  // because the update callback runs either way, so the rejection is noise.
  const ignore = () => undefined
  transition.ready.catch(ignore)
  transition.finished.catch(ignore)
  transition.updateCallbackDone.catch(ignore)
}

/* -------------------------------------------------------------- island -- */

export default function Desktop({ posts, projects }: DesktopProps) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [preloadedPost, setPreloadedPost] = useState<DesktopPost | null>(null)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMobile = useIsMobile()
  const clock = useClock()

  const zIndexOf = (id: string) => state.zIndexes[id] ?? 50
  const openPost = state.blogPostSlug
    ? (posts.find((post) => post.slug === state.blogPostSlug) ?? null)
    : null

  /* `/?openPost=<slug>` is how a post page's minimize button round-trips. */
  useEffect(() => {
    const slug = new URLSearchParams(location.search).get('openPost')
    if (!slug || !posts.some((post) => post.slug === slug)) return
    dispatch({ type: 'OPEN_BLOG_POST', slug })
    history.replaceState({}, '', '/')
  }, [posts])

  /* Ctrl+W, not Cmd+W: the browser keeps that one. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.metaKey || event.key !== 'w') return
      const focused = state.focusedWindow
      if (!focused) return
      event.preventDefault()
      if (focused.startsWith('blog-post-')) {
        withTransition(() => dispatch({ type: 'CLOSE_BLOG_POST' }))
      } else if (state.openWindows.has(focused as WindowId)) {
        dispatch({ type: 'CLOSE_WINDOW', id: focused as WindowId })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state.focusedWindow, state.openWindows])

  useEffect(
    () => () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    },
    [],
  )

  /**
   * The runtime names the first `[data-slug]` card for a cross-document
   * transition. When a post window owns that name, the card must give it up:
   * two elements sharing a `view-transition-name` cancels the transition.
   */
  useEffect(() => {
    const onPageSwap = () => {
      const frame = document.querySelector('[role="dialog"][data-slug]')
      if (!frame) return
      for (const el of document.querySelectorAll<HTMLElement>('[data-slug]')) {
        if (el !== frame) el.style.viewTransitionName = ''
      }
    }
    window.addEventListener('pageswap', onPageSwap)
    return () => window.removeEventListener('pageswap', onPageSwap)
  }, [])

  const handlers: ChromeHandlers = {
    clock,
    onFolder: (id: WindowId, event: MouseEvent) => {
      // Below 768px the anchor is left alone and the browser navigates.
      if (isMobile) return
      event.preventDefault()
      dispatch({ type: 'OPEN_WINDOW', id })
    },
    onCalculator: (event: MouseEvent) => {
      event.preventDefault()
      dispatch({ type: 'OPEN_WINDOW', id: 'calculator' })
    },
    onPost: (post: DesktopPost, event: MouseEvent) => {
      if (isMobile) return
      event.preventDefault()
      withTransition(() =>
        dispatch({ type: 'OPEN_BLOG_POST', slug: post.slug }),
      )
      setPreloadedPost(null)
    },
    onPostHover: (post: DesktopPost) => {
      if (isMobile || state.blogPostSlug) return
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
      setPreloadedPost(post)
    },
    onPostHoverEnd: () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
      hoverTimeout.current = setTimeout(() => setPreloadedPost(null), 1000)
    },
  }

  return (
    <DesktopChrome posts={posts} projects={projects} handlers={handlers}>
      {preloadedPost && (
        <iframe
          src={embedHref(preloadedPost)}
          className="hidden"
          aria-hidden="true"
          title={`Preloading ${preloadedPost.title}`}
        />
      )}

      {state.openWindows.has('calculator') && (
        <Window
          title={CALCULATOR_TITLE}
          onClose={() => dispatch({ type: 'CLOSE_WINDOW', id: 'calculator' })}
          defaultWidth={500}
          defaultHeight={600}
          defaultX={200}
          defaultY={100}
          zIndex={zIndexOf('calculator')}
          onFocus={() => dispatch({ type: 'FOCUS', id: 'calculator' })}
        >
          <Suspense fallback={null}>
            <Calculator />
          </Suspense>
        </Window>
      )}

      {openPost && (
        <Window
          title={openPost.title}
          onClose={() =>
            withTransition(() => dispatch({ type: 'CLOSE_BLOG_POST' }))
          }
          defaultWidth={800}
          defaultHeight={600}
          defaultX={150}
          defaultY={80}
          maximizeHref={postHref(openPost)}
          zIndex={zIndexOf(`blog-post-${openPost.slug}`)}
          onFocus={() =>
            dispatch({ type: 'FOCUS', id: `blog-post-${openPost.slug}` })
          }
          transitionName={postTransitionName(openPost)}
          slug={openPost.type === 'post' ? openPost.slug : undefined}
        >
          <iframe
            src={embedHref(openPost)}
            className="w-full h-full border-0"
            title={openPost.title}
          />
        </Window>
      )}

      {CONTENT_WINDOWS.filter((config) => state.openWindows.has(config.id)).map(
        (config) => (
          <Window
            key={config.id}
            title={config.title}
            onClose={() => dispatch({ type: 'CLOSE_WINDOW', id: config.id })}
            defaultWidth={800}
            defaultHeight={600}
            defaultX={config.defaultX}
            defaultY={config.defaultY}
            maximizeHref={config.route}
            zIndex={zIndexOf(config.id)}
            onFocus={() => dispatch({ type: 'FOCUS', id: config.id })}
          >
            <iframe
              src={`${config.route}/embed`}
              className="w-full h-full border-0"
              title={config.title}
            />
          </Window>
        ),
      )}
    </DesktopChrome>
  )
}
