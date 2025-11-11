"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Window } from "@components/desktop/window"
import { TerminalContent } from "@components/desktop/terminal-content"
import { WidgetRecentPosts } from "@components/desktop/widget-recent-posts"
import { WidgetTopProjects } from "@components/desktop/widget-top-projects"
import { useRouter } from "next/navigation"
import type { BlogPost, Project } from "@lib/portfolio-data"

interface DesktopItem {
  id: string
  name: string
  type: "folder" | "app"
  icon: React.ReactNode
  href?: string
  onClick?: () => void
}

function FolderIconDefault() {
  return (
    <svg height="48" strokeLinejoin="round" viewBox="0 0 16 16" width="48" className="text-foreground">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.5 7.5V12.5C14.5 13.0523 14.0523 13.5 13.5 13.5H2.5C1.94772 13.5 1.5 13.0523 1.5 12.5V7.5H14.5ZM14.5 6V4H8.83333C8.29241 4 7.76607 3.82456 7.33333 3.5L6 2.5H1.5V6H14.5ZM0 1H1.5H6.16667C6.38304 1 6.59357 1.07018 6.76667 1.2L8.23333 2.3C8.40643 2.42982 8.61696 2.5 8.83333 2.5H14.5H16V4V12.5C16 13.8807 14.8807 15 13.5 15H2.5C1.11929 15 0 13.8807 0 12.5V2.5V1Z"
        fill="currentColor"
      />
    </svg>
  )
}

function TerminalIconDefault() {
  return (
    <svg height="48" strokeLinejoin="round" viewBox="0 0 16 16" width="48" className="text-foreground">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.53035 12.7804L1.00002 13.3108L-0.0606384 12.2501L0.469692 11.7198L4.18936 8.00011L0.469692 4.28044L-0.0606384 3.75011L1.00002 2.68945L1.53035 3.21978L5.60358 7.29301C5.9941 7.68353 5.9941 8.3167 5.60357 8.70722L1.53035 12.7804ZM8.75002 12.5001H8.00002V14.0001H8.75002H15.25H16V12.5001H15.25H8.75002Z"
        fill="currentColor"
      />
    </svg>
  )
}

interface DesktopClientProps {
  blogPosts: BlogPost[]
  projects: Project[]
  aboutContent: any
}

export function DesktopClient({ blogPosts, projects, aboutContent }: DesktopClientProps) {
  const [openTerminal, setOpenTerminal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "t") {
        e.preventDefault()
        setOpenTerminal(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const desktopItems: DesktopItem[] = [
    {
      id: "blog",
      name: "blog",
      type: "folder",
      icon: <FolderIconDefault />,
      href: "/blog",
    },
    {
      id: "projects",
      name: "projects",
      type: "folder",
      icon: <FolderIconDefault />,
      href: "/projects",
    },
    {
      id: "about",
      name: "about",
      type: "folder",
      icon: <FolderIconDefault />,
      href: "/about",
    },
    {
      id: "terminal",
      name: "terminal",
      type: "app",
      icon: <TerminalIconDefault />,
      onClick: () => setOpenTerminal(true),
    },
  ]

  return (
    <div className="h-screen bg-black text-white/90 overflow-hidden flex flex-col">
      <div className="h-10 bg-white/5 border-b border-white/10 flex items-center px-4 gap-4 text-xs font-mono">
        <span className="text-white/50">~/</span>
        <span className="ml-auto text-white/40">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-shrink-0">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 gap-8 w-fit">
              {desktopItems.map((item) => (
                <DesktopIcon key={item.id} item={item} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-6xl items-start">
            <WidgetRecentPosts posts={blogPosts} limit={5} />
            <WidgetTopProjects projects={projects} limit={5} />
          </div>
        </div>
      </div>

      {openTerminal && (
        <Window title="terminal" onClose={() => setOpenTerminal(false)} defaultWidth={600} defaultHeight={400}>
          <TerminalContent blogPosts={blogPosts} projects={projects} aboutContent={aboutContent} />
        </Window>
      )}
    </div>
  )
}

function DesktopIcon({ item }: { item: DesktopItem }) {
  const content = (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/5 transition-colors duration-200 cursor-pointer">
      <div className="text-white/80 hover:text-white/90 transition-colors">{item.icon}</div>
      <span className="text-xs font-mono text-white/80 text-center truncate w-16">{item.name}</span>
    </div>
  )

  if (item.href) {
    return <Link href={item.href}>{content}</Link>
  }

  return (
    <button onClick={item.onClick} aria-label={`Open ${item.name}`}>
      {content}
    </button>
  )
}
