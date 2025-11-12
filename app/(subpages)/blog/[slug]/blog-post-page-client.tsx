'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { WindowToolbar } from '@components/desktop/window-toolbar'
import type { ReactNode } from 'react'

interface BlogPostPageClientProps {
  slug: string
  title: string
  children: ReactNode
}

export function BlogPostPageClient({
  slug,
  title,
  children,
}: BlogPostPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isEmbed =
    searchParams.get('embed') !== null &&
    searchParams.get('embed') !== undefined

  const handleMinimize = () => {
    router.push(`/?openPost=${slug}`)
  }

  return (
    <div className="min-h-screen bg-black text-white/90 flex flex-col">
      {!isEmbed && (
        <WindowToolbar
          title={title}
          segments={[
            { name: 'blog', href: '/blog' },
            { name: slug, href: `/blog/${slug}` },
          ]}
          showMinimize={true}
          onMinimize={handleMinimize}
        />
      )}

      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
