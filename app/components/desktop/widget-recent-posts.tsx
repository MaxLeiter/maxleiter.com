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
    <div className="border border-[var(--border-color)] rounded-lg overflow-hidden backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-widget)' }}>
      <div className="border-b border-[var(--border-color)] px-4 3xl:px-5 py-3 3xl:py-4">
        <h2 className="text-xs 3xl:text-sm font-mono font-semibold text-[var(--fg)] uppercase">
          Recent Posts
        </h2>
      </div>
      <ul className="divide-y divide-[var(--border-color)]">
        {recentPosts.map((post) => {
          const content = (
            <>
              <h3 className="text-sm 3xl:text-base font-mono text-[var(--fg)] group-hover:text-[var(--gray)] transition-colors mb-1">
                {post.title}
              </h3>
              <p className="text-xs 3xl:text-sm text-[var(--gray)]">{post.date}</p>
            </>
          )

          if (onPostClick) {
            return (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  onClick={(e) => {
                    e.preventDefault()
                    onPostClick(post.slug)
                  }}
                  onMouseEnter={() => onPostHover?.(post.slug)}
                  onMouseLeave={onPostHoverEnd}
                  className="block px-4 3xl:px-5 py-3 3xl:py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                >
                  {content}
                </Link>
              </li>
            )
          }

          return (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="block px-4 3xl:px-5 py-3 3xl:py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
              >
                {content}
              </Link>
            </li>
          )
        })}
      </ul>
      <Link
        href="/blog"
        className="block px-4 3xl:px-5 py-2 3xl:py-3 text-center text-xs 3xl:text-sm font-mono text-[var(--gray)] hover:text-[var(--fg)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-t border-[var(--border-color)]"
      >
        View all posts →
      </Link>
    </div>
  )
}
