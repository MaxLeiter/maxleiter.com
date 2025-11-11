"use client"

import { useRouter } from 'next/navigation'
import { startTransition } from 'react'
import Link from 'next/link'

interface BreadcrumbSegment {
  name: string
  href: string
}

interface WindowToolbarProps {
  title: string
  segments?: BreadcrumbSegment[]
}

export function WindowToolbar({ title, segments = [] }: WindowToolbarProps) {
  const router = useRouter()

  const handleClose = () => {
    startTransition(() => {
      router.push('/')
    })
  }

  return (
    <div className="h-10 bg-white/5 border-b border-white/10 flex items-center justify-between px-4 select-none sticky top-0 z-10">
      <div className="flex items-center gap-2 text-sm font-mono text-white/60">
        <Link href="/" className="hover:text-white/90 transition-colors">
          ~
        </Link>
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-2">
            <span>/</span>
            <Link
              href={segment.href}
              className="hover:text-white/90 transition-colors"
            >
              {segment.name}
            </Link>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleClose}
          className="text-white/50 hover:text-white/80 hover:bg-white/10 w-5 h-5 rounded flex items-center justify-center text-xs transition-colors"
          aria-label={`Close ${title}`}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
