"use client"

import { useState, useEffect } from "react"
import type { BlogPost, Project } from "@lib/portfolio-data"

interface CommandPaletteProps {
  blogPosts: BlogPost[]
  projects: Project[]
  onClose: () => void
  onNavigate: (path: string) => void
}

export function CommandPalette({ blogPosts, projects, onClose, onNavigate }: CommandPaletteProps) {
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const allItems = [
    ...blogPosts.map((p) => ({ type: "blog" as const, slug: p.slug, title: p.title, href: `/blog/${p.slug}` })),
    ...projects.map((p) => ({ type: "project" as const, id: p.id, title: p.name, href: `/projects` })),
    { type: "nav" as const, title: "Blog", href: "/blog" },
    { type: "nav" as const, title: "Projects", href: "/projects" },
    { type: "nav" as const, title: "About", href: "/about" },
  ]

  const filtered = search
    ? allItems.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
    : allItems

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filtered.length)
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
      }
      if (e.key === "Enter") {
        const item = filtered[selectedIndex]
        if (item) {
          onNavigate(item.href)
          onClose()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [filtered, selectedIndex, onClose, onNavigate])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-2xl bg-black border border-white/20 rounded-lg shadow-2xl overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Search posts, projects, or navigate..."
            className="w-full bg-transparent outline-none text-white/90 font-mono placeholder-white/40"
            style={{ fontSize: "16px" }}
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-white/50 text-sm">No results found</div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={`${item.type}-${item.slug || item.id || item.title}`}
                onClick={() => {
                  onNavigate(item.href)
                  onClose()
                }}
                className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${
                  idx === selectedIndex ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <div className="text-xs text-white/40 font-mono uppercase mb-1">
                  {item.type === "blog" ? "Blog Post" : item.type === "project" ? "Project" : "Navigation"}
                </div>
                <div className="text-white/90 font-mono">{item.title}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
