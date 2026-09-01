import { useCallback, useRef, useState, useSyncExternalStore } from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'

/**
 * The Cmd/Ctrl+K command palette.
 *
 * This file is rendered twice: React renders it at build time inside the
 * `<Island name="palette" hidden>` wrapper that every page carries, and the
 * client bundle renders the same source through preact/compat when the island
 * mounts. Sharing one component is what makes the SSR shell and the hydrated
 * first render identical, so preact patches nothing on mount.
 *
 * The runtime (framework/client/runtime.ts) owns the shortcut: it unhides the
 * wrapper and focuses the input before this module has loaded, so the first
 * press is never dead and typing is never swallowed. Whatever the visitor has
 * already typed is read out of the DOM in the `useState` initializer below,
 * before the first client render, so the controlled value agrees with the
 * input's real value and preact never writes over it.
 */

export interface SearchIndexItem {
  type: 'blog' | 'note' | 'project'
  title: string
  href: string
  external: boolean
}

interface PaletteItem {
  type: 'nav' | SearchIndexItem['type']
  title: string
  href: string
  external: boolean
}

const NAV_ITEMS: PaletteItem[] = [
  { type: 'nav', title: 'Blog', href: '/blog', external: false },
  { type: 'nav', title: 'Projects', href: '/projects', external: false },
  { type: 'nav', title: 'About', href: '/about', external: false },
]

const TYPE_LABELS: Record<PaletteItem['type'], string> = {
  nav: 'Navigation',
  blog: 'Blog Post',
  note: 'Note',
  project: 'Project',
}

const SELECTED_BG = 'rgba(255, 255, 255, 0.15)'
const HOVER_BG = 'rgba(255, 255, 255, 0.08)'

/**
 * The search index is a module-scoped store, not component state.
 *
 * `/search-index.json` is a static file written by framework/feeds.ts with the
 * same shape the Next `/api/search-index` route returned. This island is
 * `on="interaction"`, so its chunk is only fetched when the palette opens:
 * starting the request at module scope is the same moment a mount effect would
 * have started it, and it lets the component read the result through
 * `useSyncExternalStore` instead of mirroring an async source into `useState`.
 */
let index: SearchIndexItem[] = []
const indexListeners = new Set<() => void>()

const subscribeToIndex = (onChange: () => void) => {
  indexListeners.add(onChange)
  return () => {
    indexListeners.delete(onChange)
  }
}
/** Stable identity while unchanged, which is what useSyncExternalStore needs. */
const getIndex = () => index

// This module is also imported by the server build to render the SSR shell,
// where there is no origin to resolve `/search-index.json` against.
if (typeof document !== 'undefined') {
  void fetch('/search-index.json')
    .then((res) => {
      if (!res.ok) throw new Error(`search index: ${res.status}`)
      return res.json() as Promise<SearchIndexItem[]>
    })
    .then((loaded) => {
      index = loaded
      for (const listener of indexListeners) listener()
    })
    .catch((error: unknown) => {
      console.error(error)
    })
}

/** The value the visitor typed into the SSR'd input before this module ran. */
function typedBeforeHydration(): string {
  if (typeof document === 'undefined') return ''
  const input = document.querySelector<HTMLInputElement>('[data-palette-input]')
  return input?.value ?? ''
}

export default function Palette() {
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState(typedBeforeHydration)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const loaded = useSyncExternalStore(subscribeToIndex, getIndex, getIndex)
  const items: PaletteItem[] = [...NAV_ITEMS, ...loaded]

  /**
   * Catches anything typed between the `useState` initializer above and the
   * moment preact takes the input over. A ref callback runs at commit, which
   * is earlier than an effect would, so it narrows that window rather than
   * merely preserving it. The identity is stable so it attaches exactly once.
   */
  const attachInput = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node
    const value = node?.value ?? ''
    if (value) setSearch((current) => (current === value ? current : value))
  }, [])

  const query = search.trim().toLowerCase()
  const filtered = query
    ? items.filter((item) => item.title.toLowerCase().includes(query))
    : items

  const close = () => {
    const wrapper = overlayRef.current?.closest<HTMLElement>('[data-island]')
    if (wrapper) wrapper.hidden = true
    setSearch('')
    setSelectedIndex(0)
    inputRef.current?.blur()
  }

  const navigate = (item: PaletteItem) => {
    if (item.external) {
      window.open(item.href, '_blank', 'noopener,noreferrer')
      close()
      return
    }
    close()
    window.location.href = item.href
  }

  /**
   * Keys are handled on the overlay, not on `window`. The runtime focuses the
   * input before this module loads and the input lives inside the overlay, so
   * the same keys arrive here by bubbling — and this handler is re-created
   * every render, so it reads the current `filtered` and `selectedIndex`
   * directly. The earlier window listener registered once and had to read a
   * ref rewritten during render; the first arrow press after the search index
   * arrived wrapped around the three navigation entries rather than all
   * fifty-two. A hidden subtree holds no focus and receives no keydown, so the
   * old `wrapper.hidden` guard is no longer needed either.
   */
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (filtered.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % filtered.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
      return
    }
    if (event.key === 'Enter') {
      const item = filtered[selectedIndex]
      if (item) {
        event.preventDefault()
        navigate(item)
      }
    }
  }

  /**
   * Click-outside. The overlay is `fixed inset-0`, so "outside the panel" is
   * exactly "on the overlay itself". `pointerdown` rather than `click`: the
   * runtime opens the palette from a `click` on `[data-open-palette]`, and a
   * close listener on the same event would shut it again on the way back up.
   *
   * A pointer landing on non-focusable chrome inside the panel would otherwise
   * move focus to `<body>` and take the key handler above out of the bubble
   * path, so that case keeps the focus where it is.
   */
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      close()
      return
    }
    if (!(event.target as Element).closest('input, button, a, textarea')) {
      event.preventDefault()
    }
  }

  const activeId =
    filtered.length > 0 && filtered[selectedIndex]
      ? `palette-option-${selectedIndex}`
      : undefined

  return (
    // The overlay IS the backdrop and the input inside it is what holds focus,
    // so click-to-dismiss and the arrow keys have nowhere else to live. Same
    // shape as the shot grid's <dialog>.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={overlayRef}
      className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
    >
      <div
        className="w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg)',
          borderColor: 'var(--border-color)',
          borderWidth: '1px',
        }}
      >
        <div
          className="border-b px-4 py-3"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <input
            ref={attachInput}
            type="text"
            data-palette-input
            value={search}
            onChange={(event) => {
              setSearch((event.target as HTMLInputElement).value)
              setSelectedIndex(0)
            }}
            placeholder="Search posts, projects, or navigate..."
            aria-label="Search"
            role="combobox"
            aria-expanded
            aria-controls="palette-results"
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent outline-none font-mono"
            style={
              {
                fontSize: '16px',
                color: 'var(--fg)',
                opacity: 0.9,
                '--placeholder-color': 'var(--fg)',
              } as CSSProperties
            }
          />
        </div>

        <div className="max-h-96 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--gray)' }}>
              No results found
            </div>
          ) : (
            <div
              id="palette-results"
              data-palette-results
              role="listbox"
              aria-label="Results"
            >
              {filtered.map((item, index) => (
                <button
                  key={`${item.type}-${item.href}`}
                  id={`palette-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === selectedIndex}
                  aria-label={`${TYPE_LABELS[item.type]}: ${item.title}`}
                  tabIndex={-1}
                  onClick={() => navigate(item)}
                  className="w-full text-left px-4 py-3 rounded transition-colors font-mono"
                  style={{
                    backgroundColor:
                      index === selectedIndex ? SELECTED_BG : 'transparent',
                    color: 'var(--fg)',
                  }}
                  onMouseEnter={(event) => {
                    if (index !== selectedIndex) {
                      event.currentTarget.style.backgroundColor = HOVER_BG
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (index !== selectedIndex) {
                      event.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <div
                    className="text-xs font-mono uppercase mb-1"
                    style={{ color: 'var(--gray)' }}
                  >
                    {TYPE_LABELS[item.type]}
                  </div>
                  <div style={{ color: 'var(--fg)', opacity: 0.9 }}>
                    {item.title}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
