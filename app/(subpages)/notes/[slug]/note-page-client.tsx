'use client'

import { useRouter } from 'next/navigation'
import { WindowToolbar } from '@components/desktop/window-toolbar'
import type { ReactNode } from 'react'
import { useState } from 'react'

interface NotePageClientProps {
  slug: string
  title: string
  children: ReactNode
}

declare global {
  interface Window {
    __IS_EMBED__?: boolean
  }
}

export function NotePageClient({
  slug,
  title,
  children,
}: NotePageClientProps) {
  const router = useRouter()

  const [isEmbed] = useState(() => {
    if (typeof window !== 'undefined' && window.__IS_EMBED__ !== undefined) {
      return window.__IS_EMBED__
    }
    return false
  })

  const handleMinimize = () => {
    router.push(`/?openPost=${slug}`)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col">
      {!isEmbed && (
        <div id="blog-toolbar">
          <WindowToolbar
            title={title}
            segments={[
              { name: 'notes', href: '/notes' },
              { name: slug, href: `/notes/${slug}` },
            ]}
            showMinimize={true}
            onMinimize={handleMinimize}
          />
        </div>
      )}

      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}