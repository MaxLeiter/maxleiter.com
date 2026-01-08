'use client'

import { useRouter } from 'next/navigation'
import { WindowToolbar } from '@components/desktop/window-toolbar'
import type { ReactNode } from 'react'

interface NotePageClientProps {
  slug: string
  title: string
  children: ReactNode
}

export function NotePageClient({
  slug,
  title,
  children,
}: NotePageClientProps) {
  const router = useRouter()

  const handleMinimize = () => {
    router.push(`/?openNote=${slug}`)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col">
      <WindowToolbar
        title={title}
        segments={[
          { name: 'notes', href: '/notes' },
          { name: slug, href: `/notes/${slug}` },
        ]}
        showMinimize={true}
        onMinimize={handleMinimize}
      />

      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}