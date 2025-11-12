'use client'

import { useSearchParams } from 'next/navigation'
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
  console.log('searchParams', searchParams)
  const isEmbed =
    searchParams.get('embed') !== null &&
    searchParams.get('embed') !== undefined

  return (
    <div className="min-h-screen bg-black text-white/90 flex flex-col">
      {!isEmbed && (
        <WindowToolbar
          title={title}
          segments={[
            { name: 'blog', href: '/blog' },
            { name: slug, href: `/blog/${slug}` },
          ]}
        />
      )}

      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  )
}
