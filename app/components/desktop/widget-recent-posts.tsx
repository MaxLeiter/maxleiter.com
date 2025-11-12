'use client'

import Link from 'next/link'
import type { BlogPost } from '@lib/portfolio-data'

interface WidgetRecentPostsProps {
  posts: BlogPost[]
  limit?: number
  onPostClick?: (slug: string) => void
  onPostHover?: (slug: string) => void
  onPostHoverEnd?: () => void
}

export function WidgetRecentPosts({
  posts,
  limit = 5,
  onPostClick,
  onPostHover,
  onPostHoverEnd,
}: WidgetRecentPostsProps) {
  const recentPosts = posts.slice(0, limit)

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
      <div className="border-b border-white/10 px-4 3xl:px-5 py-3 3xl:py-4">
        <h2 className="text-xs 3xl:text-sm font-mono font-semibold text-white/90 uppercase">
          Recent Posts
        </h2>
      </div>
      <div className="divide-y divide-white/5">
        {recentPosts.map((post) => {
          const content = (
            <>
              <h3 className="text-sm 3xl:text-base font-mono text-white/90 group-hover:text-white/80 transition-colors mb-1">
                {post.title}
              </h3>
              <p className="text-xs 3xl:text-sm text-white/50">{post.date}</p>
            </>
          )

          if (onPostClick) {
            return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                onClick={(e) => {
                  e.preventDefault()
                  onPostClick(post.slug)
                }}
                onMouseEnter={() => onPostHover?.(post.slug)}
                onMouseLeave={onPostHoverEnd}
                className="block px-4 3xl:px-5 py-3 3xl:py-4 hover:bg-white/5 transition-colors group"
              >
                {content}
              </Link>
            )
          }

          return (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block px-4 3xl:px-5 py-3 3xl:py-4 hover:bg-white/5 transition-colors group"
            >
              {content}
            </Link>
          )
        })}
      </div>
      <Link
        href="/blog"
        className="block px-4 3xl:px-5 py-2 3xl:py-3 text-center text-xs 3xl:text-sm font-mono text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors border-t border-white/10"
      >
        View all posts →
      </Link>
    </div>
  )
}
