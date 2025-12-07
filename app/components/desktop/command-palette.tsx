'use client'

import { useState, useEffect } from 'react'
import type { BlogPost, Project } from '@lib/portfolio-data'

interface CommandPaletteProps {
  blogPosts: BlogPost[]
  projects: Project[]
  onClose: () => void
  onNavigate: (path: string, external: boolean) => void
}

export function CommandPalette({
  blogPosts,
  projects,
  onClose,
  onNavigate,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const allItems = [
    { type: 'nav' as const, title: 'Blog', href: '/blog' },
    { type: 'nav' as const, title: 'Projects', href: '/projects' },
    { type: 'nav' as const, title: 'About', href: '/about' },
    ...blogPosts.map((p) => ({
      type: 'blog' as const,
      slug: p.slug,
      title: p.title,
      href: `/blog/${p.slug}`,
    })),
    ...projects.map((p) => ({
      type: 'project' as const,
      id: p.id,
      title: p.name,
      href: p.link || '/projects',
      external: Boolean(p.link),
    })),
  ]

  const filtered = search
    ? allItems.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase()),
      )
    : allItems

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
          onNavigate(item.href)
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filtered, selectedIndex, onClose, onNavigate])

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-start justify-center pt-20 px-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border-color)', borderWidth: '1px' }} onClick={(e) => e.stopPropagation()}>
        <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-color)' }}>
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
            style={{
              fontSize: '16px',
              color: 'var(--fg)',
              opacity: 0.9,
              '--placeholder-color': 'var(--fg)'
            } as React.CSSProperties & { '--placeholder-color': string }}
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
                key={`${item.type}-${item.slug || item.id || item.title}`}
                onClick={() => {
                  onNavigate(item.href)
                  onClose()
                }}
                className="w-full text-left px-4 py-3 rounded transition-colors font-mono"
                style={{
                  backgroundColor: idx === selectedIndex ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  color: 'var(--fg)'
                }}
                onMouseEnter={(e) => {
                  if (idx !== selectedIndex) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (idx !== selectedIndex) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <div className="text-xs font-mono uppercase mb-1" style={{ color: 'var(--gray)' }}>
                  {item.type === 'blog'
                    ? 'Blog Post'
                    : item.type === 'project'
                      ? 'Project'
                      : 'Navigation'}
                </div>
                <div style={{ color: 'var(--fg)', opacity: 0.9 }}>{item.title}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
