'use client'

import { ListCard } from '@components/desktop/list-card'
import type { BlogPost } from '@lib/portfolio-data'

interface BlogListContentProps {
  posts: BlogPost[]
  onPostClick?: (slug: string) => void
}

export function BlogListContent({ posts, onPostClick }: BlogListContentProps) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-mono font-bold mb-8 text-white/90">
        blog/
      </h1>

      <div className="space-y-2">
        {posts.map((post) => (
          <ListCard
            key={post.slug}
            href={`/blog/${post.slug}`}
            title={post.title}
            description={post.excerpt}
            meta={post.date}
            icon="file"
            onClick={onPostClick ? (e) => {
              e.preventDefault()
              onPostClick(post.slug)
            } : undefined}
          />
        ))}
      </div>
    </div>
  )
}
