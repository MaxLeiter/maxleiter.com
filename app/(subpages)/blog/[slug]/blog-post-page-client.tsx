'use client'

import { useRouter } from 'next/navigation'
import { WindowToolbar } from '@components/desktop/window-toolbar'
import type { ReactNode } from 'react'
import { useState } from 'react'

interface BlogPostPageClientProps {
  slug: string
  title: string
  children: ReactNode
}

declare global {
  interface Window {
    __IS_EMBED__?: boolean
  }
}

export function BlogPostPageClient({
  slug,
  title,
  children,
}: BlogPostPageClientProps) {
  const router = useRouter()

  // Initialize from inline script to avoid hydration mismatch
  const [isEmbed] = useState(() => {
    if (typeof window !== 'undefined' && window.__IS_EMBED__ !== undefined) {
      return window.__IS_EMBED__
    }
    // Default to false (show toolbar) on server
    return false
  })

  const handleMinimize = () => {
    router.push(`/?openPost=${slug}`)
  }

  return (
    <div className="min-h-screen bg-black text-white/90 flex flex-col">
      {!isEmbed && (
        <div id="blog-toolbar">
          <WindowToolbar
            title={title}
            segments={[
              { name: 'blog', href: '/blog' },
              { name: slug, href: `/blog/${slug}` },
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
