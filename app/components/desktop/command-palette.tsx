'use client'

import { useState, useEffect } from 'react'
import type { SearchIndexItem } from '@api/search-index/route'

interface PaletteItem {
  type: 'nav' | SearchIndexItem['type']
  title: string
  href: string
  external: boolean
}

interface CommandPaletteProps {
  onClose: () => void
  onNavigate: (path: string, external: boolean) => void
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

// The post/project index is a static JSON file prerendered at build time. It's
// fetched once per page load, on first open, instead of being serialized into
// every page's RSC payload.
let indexPromise: Promise<SearchIndexItem[]> | null = null

export function loadSearchIndex(): Promise<SearchIndexItem[]> {
  if (!indexPromise) {
    indexPromise = fetch('/api/search-index')
      .then((res) => {
        if (!res.ok) throw new Error(`search index: ${res.status}`)
        return res.json() as Promise<SearchIndexItem[]>
      })
      .catch((err) => {
        // Let the next open retry instead of caching the failure.
        indexPromise = null
        console.error(err)
        return []
      })
  }
  return indexPromise
}

export function CommandPalette({ onClose, onNavigate }: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [items, setItems] = useState<PaletteItem[]>(NAV_ITEMS)

  useEffect(() => {
    let cancelled = false
    loadSearchIndex().then((index) => {
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filtered.length)
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(
          (prev) => (prev - 1 + filtered.length) % filtered.length,
        )
      }
      if (e.key === 'Enter') {
        const item = filtered[selectedIndex]
        if (item) {
          onNavigate(item.href, item.external)
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filtered, selectedIndex, onClose, onNavigate])

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg)',
          borderColor: 'var(--border-color)',
          borderWidth: '1px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="border-b px-4 py-3"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Search posts, projects, or navigate..."
            className="w-full bg-transparent outline-none font-mono"
            style={
              {
                fontSize: '16px',
                color: 'var(--fg)',
                opacity: 0.9,
                '--placeholder-color': 'var(--fg)',
              } as React.CSSProperties & { '--placeholder-color': string }
            }
          />
        </div>

        <div className="max-h-96 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--gray)' }}>
              No results found
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={`${item.type}-${item.href}`}
                onClick={() => {
                  onNavigate(item.href, item.external)
                  onClose()
                }}
                className="w-full text-left px-4 py-3 rounded transition-colors font-mono"
                style={{
                  backgroundColor:
                    idx === selectedIndex
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'transparent',
                  color: 'var(--fg)',
                }}
                onMouseEnter={(e) => {
                  if (idx !== selectedIndex) {
                    e.currentTarget.style.backgroundColor =
                      'rgba(255, 255, 255, 0.08)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (idx !== selectedIndex) {
                    e.currentTarget.style.backgroundColor = 'transparent'
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
            ))
          )}
        </div>
      </div>
    </div>
  )
}
