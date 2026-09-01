import type { Dispatch, MouseEvent } from 'react'
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
import { entryHref } from '@lib/blog-post'
import { DesktopChrome, type ChromeHandlers } from './desktop/chrome'
import { Window } from './desktop/window'
import {
  CONTENT_WINDOWS,
  DESKTOP_MIN_WIDTH,
  embedHref,
  postTransitionName,
  type DesktopPost,
  type DesktopProps,
  type WindowId,
} from './desktop/data'

/**
 * The desktop window manager, hydrated over the markup `app/pages/home.tsx`
 * already rendered.
 *
 * Nothing here depends on a router. Maximize was always a navigation rather
 * than a resize, so it is `location.assign`; the same-document window
 * open/close animation calls `document.startViewTransition` directly, and the
 * cross-document half of it is the platform's, driven by matching
 * `view-transition-name` values.
 *
 * Two effects, both named and both genuinely external: a `keydown` listener on
 * `window` and the `?openPost` deep link. Everything else that used to be an
 * effect here -- the clock interval, the viewport breakpoint, a `pageswap`
 * handoff and the hover-preload unmount cleanup -- is now either a subscription
 * the renderer drives (`useSyncExternalStore`), a plain event handler, or gone.
 */

const Calculator = lazy(() => import('./desktop/calculator'))

/* --------------------------------------------------------------- state -- */

/** The window id a post opens under, whatever kind of post it is. */
const postWindowId = (slug: string) => `blog-post-${slug}`

interface WindowState {
  /**
   * Open windows, bottom to top.
   *
   * Membership is "open", position is stacking order, and the last element is
   * the focused window. That is one field doing the job `openWindows: Set`,
   * `zIndexes: Record` and an ever-growing `nextZIndex` counter used to share,
   * and it makes every action either "move to end" or "remove". With at most
   * seven ids the array beats cloning a Set on each open and close, too.
   */
  stack: string[]
  blogPostSlug: string | null
}

type WindowAction =
  | { type: 'OPEN_WINDOW'; id: WindowId }
  | { type: 'CLOSE_WINDOW'; id: WindowId }
  | { type: 'OPEN_BLOG_POST'; slug: string }
  | { type: 'CLOSE_BLOG_POST' }
  | { type: 'FOCUS'; id: string }
  | { type: 'CLOSE_FOCUSED' }

const INITIAL_STATE: WindowState = { stack: [], blogPostSlug: null }

const raise = (stack: string[], id: string): string[] => [
  ...stack.filter((open) => open !== id),
  id,
]

const drop = (stack: string[], id: string): string[] =>
  stack.filter((open) => open !== id)

function reducer(state: WindowState, action: WindowAction): WindowState {
  switch (action.type) {
    case 'OPEN_WINDOW':
    case 'FOCUS':
      return { ...state, stack: raise(state.stack, action.id) }
    case 'CLOSE_WINDOW':
      return { ...state, stack: drop(state.stack, action.id) }
    case 'OPEN_BLOG_POST':
      return {
        blogPostSlug: action.slug,
        stack: raise(state.stack, postWindowId(action.slug)),
      }
    case 'CLOSE_BLOG_POST':
      return {
        blogPostSlug: null,
        stack: state.blogPostSlug
          ? drop(state.stack, postWindowId(state.blogPostSlug))
          : state.stack,
      }
    case 'CLOSE_FOCUSED': {
      // The reducer reads the focused window itself, which is what lets the
      // Ctrl+W listener register once instead of re-registering on every open,
      // close and focus in order to see a fresh `focusedWindow`.
      const focused = state.stack[state.stack.length - 1]
      if (!focused) return state
      if (state.blogPostSlug && focused === postWindowId(state.blogPostSlug)) {
        return reducer(state, { type: 'CLOSE_BLOG_POST' })
      }
      return { ...state, stack: drop(state.stack, focused) }
    }
  }
}

/* -------------------------------------------------------------- hooks -- */

/**
 * `matchMedia` rather than a `resize` listener: it fires when the breakpoint is
 * actually crossed, not on every pixel of a window drag.
 */
const mobileQuery =
  typeof matchMedia === 'function'
    ? matchMedia(`(max-width: ${DESKTOP_MIN_WIDTH - 1}px)`)
    : null

const subscribeToBreakpoint = (callback: () => void) => {
  mobileQuery?.addEventListener('change', callback)
  return () => mobileQuery?.removeEventListener('change', callback)
}

const getIsMobile = () => mobileQuery?.matches ?? false
const getIsMobileOnServer = () => false

function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeToBreakpoint,
    getIsMobile,
    getIsMobileOnServer,
  )
}

/**
 * The clock the inline script in `app/pages/home.tsx` already wrote, kept
 * ticking.
 *
 * Seeding from the DOM rather than a `window.__INITIAL_TIME__` global is the
 * whole replacement for that handshake: the value is already in the markup, so
 * the first render matches it by construction. An interval is a subscription,
 * so it belongs in `useSyncExternalStore` rather than in an effect that also
 * had to re-`tick()` on mount to make up for seeding state it had already
 * seeded correctly.
 *
 * This island is the only writer. `framework/client/runtime.ts` used to run a
 * second interval against the same element, on the one page where preact owns
 * it.
 */
let clockText =
  typeof document === 'undefined'
    ? ''
    : (document.getElementById('menubar-clock')?.textContent ?? '')

const clockListeners = new Set<() => void>()

const subscribeToClock = (callback: () => void) => {
  clockListeners.add(callback)
  const timer = setInterval(() => {
    clockText = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    for (const listener of clockListeners) listener()
  }, 60_000)
  return () => {
    clearInterval(timer)
    clockListeners.delete(callback)
  }
}

const getClock = () => clockText

function useClock(): string {
  return useSyncExternalStore(subscribeToClock, getClock, getClock)
}

/**
 * `/?openPost=<slug>` is how a post page's minimize button round-trips.
 *
 * An effect is required. It deliberately runs after the first render rather
 * than out of a lazy `useReducer` initializer: the island hydrates over server
 * markup that contains no window, so opening one during the first render would
 * mean the tree preact is hydrating and the tree it is handed no longer agree.
 * `history.replaceState` is an external side effect regardless.
 */
function useOpenPostDeepLink(
  posts: DesktopPost[],
  dispatch: Dispatch<WindowAction>,
): void {
  useEffect(() => {
    const slug = new URLSearchParams(location.search).get('openPost')
    if (!slug || !posts.some((post) => post.slug === slug)) return
    dispatch({ type: 'OPEN_BLOG_POST', slug })
    history.replaceState({}, '', '/')
  }, [posts, dispatch])
}

/**
 * Ctrl+W, not Cmd+W: the browser keeps that one.
 *
 * An effect is required: this is a `keydown` listener on `window`, which is DOM
 * no React element owns. It registers when the first window opens and
 * unregisters when the last one closes, so on a desktop with nothing open
 * Ctrl+W still reaches the browser and closes the tab, as it always did.
 */
function useCloseFocusedShortcut(
  dispatch: Dispatch<WindowAction>,
  hasOpenWindows: boolean,
): void {
  useEffect(() => {
    if (!hasOpenWindows) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.metaKey || event.key !== 'w') return
      event.preventDefault()
      withTransition(() => dispatch({ type: 'CLOSE_FOCUSED' }))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatch, hasOpenWindows])
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
  const isMobile = useIsMobile()
  const clock = useClock()

  /**
   * Hovering a post card warms its window's iframe, so opening the window
   * shows the article rather than a blank frame.
   *
   * Not an effect: both edges are events. The unmount cleanup this used to
   * carry was unreachable anyway -- the island is the root of the page and is
   * never unmounted -- and a pending `setPreloadedPost` after unmount is a
   * no-op in React 18 and later regardless.
   */
  const [preloadedPost, setPreloadedPost] = useState<DesktopPost | null>(null)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useOpenPostDeepLink(posts, dispatch)
  useCloseFocusedShortcut(dispatch, state.stack.length > 0)

  /** Position in the stack is the stacking order; 50 clears the menubar. */
  const zIndexOf = (id: string) => 50 + Math.max(0, state.stack.indexOf(id))

  const openPost = state.blogPostSlug
    ? (posts.find((post) => post.slug === state.blogPostSlug) ?? null)
    : null

  const handlers: ChromeHandlers = {
    clock,
    onFolder: (id: WindowId, event: MouseEvent) => {
      // Below the breakpoint the anchor is left alone and the browser navigates.
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

      {state.stack.includes('calculator') && (
        <Window
          title="calculator"
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
          maximizeHref={entryHref(openPost)}
          zIndex={zIndexOf(postWindowId(openPost.slug))}
          onFocus={() =>
            dispatch({ type: 'FOCUS', id: postWindowId(openPost.slug) })
          }
          transitionName={postTransitionName(openPost)}
          slug={openPost.slug}
        >
          <iframe
            src={embedHref(openPost)}
            className="w-full h-full border-0"
            title={openPost.title}
          />
        </Window>
      )}

      {CONTENT_WINDOWS.filter((config) => state.stack.includes(config.id)).map(
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
