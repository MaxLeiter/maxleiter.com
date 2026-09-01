import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

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
 * Fetched once per page load, on first open. `/search-index.json` is a static
 * file written by framework/feeds.ts with the same shape the Next
 * `/api/search-index` route returned.
 */
let indexPromise: Promise<SearchIndexItem[]> | null = null

export function loadSearchIndex(): Promise<SearchIndexItem[]> {
  if (!indexPromise) {
    indexPromise = fetch('/search-index.json')
      .then((res) => {
        if (!res.ok) throw new Error(`search index: ${res.status}`)
        return res.json() as Promise<SearchIndexItem[]>
      })
      .catch((error: unknown) => {
        // Let the next open retry instead of caching the failure.
        indexPromise = null
        console.error(error)
        return [] as SearchIndexItem[]
      })
  }
  return indexPromise
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
  const panelRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState(typedBeforeHydration)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [items, setItems] = useState<PaletteItem[]>(NAV_ITEMS)

  // Anything typed between the initializer above and this effect. The window
  // is a few milliseconds wide, but losing a keystroke here is exactly the
  // failure this island exists to avoid.
  useEffect(() => {
    const value = inputRef.current?.value ?? ''
    if (value) setSearch((current) => (current === value ? current : value))
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadSearchIndex().then((index) => {
      if (!cancelled) setItems([...NAV_ITEMS, ...index])
    })
    return () => {
      cancelled = true
    }
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
   * The window listeners below are registered once, so they must not close
   * over `filtered` or `selectedIndex`. They read this instead, which every
   * render refreshes. The first version captured them and the first arrow
   * press after the search index arrived wrapped around the three navigation
   * entries rather than the fifty-two real ones.
   */
  const live = useRef({ filtered, selectedIndex })
  live.current = { filtered, selectedIndex }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // The runtime unhides the wrapper; while it is hidden the palette is
      // mounted but not on screen, and must not eat arrow keys.
      const wrapper = overlayRef.current?.closest<HTMLElement>('[data-island]')
      if (wrapper?.hidden) return

      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }

      const { filtered: list, selectedIndex: current } = live.current
      if (list.length === 0) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % list.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + list.length) % list.length)
        return
      }
      if (event.key === 'Enter') {
        const item = list[current]
        if (item) {
          event.preventDefault()
          navigate(item)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads `live`
  }, [])

  // Click-outside, on pointerdown rather than click. The runtime opens the
  // palette from a `click` on `[data-open-palette]`, and a close listener on
  // the same event would shut it again on the way back up.
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const wrapper = overlayRef.current?.closest<HTMLElement>('[data-island]')
      if (!wrapper || wrapper.hidden) return
      const target = event.target as Node | null
      if (target && !panelRef.current?.contains(target)) close()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs only
  }, [])

  const activeId =
    filtered.length > 0 && filtered[selectedIndex]
      ? `palette-option-${selectedIndex}`
      : undefined

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        ref={panelRef}
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
            ref={inputRef}
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
