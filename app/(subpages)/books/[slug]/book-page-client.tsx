'use client'

import { WindowToolbar } from '@components/desktop/window-toolbar'
import type { ReactNode } from 'react'

interface BookPageClientProps {
  slug: string
  title: string
  children: ReactNode
}

export function BookPageClient({ slug, title, children }: BookPageClientProps) {
  return (
    <div className="min-h-screen bg-black text-white/90 flex flex-col">
      <WindowToolbar
        title={title}
        segments={[
          { name: 'books', href: '/books' },
          { name: slug, href: `/books/${slug}` },
        ]}
      />

      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
