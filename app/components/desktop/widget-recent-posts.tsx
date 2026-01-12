'use client'

import Link from 'next/link'
import { track } from '@vercel/analytics'
import type { BlogPost } from '@lib/portfolio-data'
import { POPULAR_SLUGS } from '@lib/popular-posts'

interface WidgetRecentPostsProps {
  posts: BlogPost[]
  recentLimit?: number
  onPostClick?: (slug: string) => void
  onPostHover?: (slug: string) => void
  onPostHoverEnd?: () => void
}

export function WidgetRecentPosts({
  posts,
  recentLimit = 3,
  onPostClick,
  onPostHover,
  onPostHoverEnd,
}: WidgetRecentPostsProps) {
  const popularPosts = POPULAR_SLUGS.map((slug) =>
    posts.find((p) => p.slug === slug),
  ).filter((p): p is BlogPost => p !== undefined)

  const recentPosts = posts
    .filter((p) => !POPULAR_SLUGS.includes(p.slug))
    .slice(0, recentLimit)

  const renderPost = (post: BlogPost) => {
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
            prefetch
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
          prefetch
        >
          {content}
        </Link>
      </li>
    )
  }

  return (
    <div
      className="border border-[var(--border-color)] rounded-lg overflow-hidden backdrop-blur-sm"
      style={{ backgroundColor: 'var(--bg-widget)' }}
    >
      {/* Main title */}
      <div className="border-b border-[var(--border-color)] px-4 3xl:px-5 py-3 3xl:py-4">
        <h2 className="text-xs 3xl:text-sm font-mono font-semibold text-[var(--fg)] uppercase">
          Recent Posts
        </h2>
      </div>

      {/* Popular section */}
      <div className="px-4 3xl:px-5 pt-3 3xl:pt-4 pb-1">
        <h3 className="text-xs font-mono text-[var(--gray)]">popular/</h3>
      </div>
      <ul className="divide-y divide-[var(--border-color)]">
        {popularPosts.map(renderPost)}
      </ul>

      {/* Recent section */}
      <div className="px-4 3xl:px-5 pt-3 3xl:pt-4 pb-1 border-t border-[var(--border-color)]">
        <h3 className="text-xs font-mono text-[var(--gray)]">recent/</h3>
      </div>
      <ul className="divide-y divide-[var(--border-color)]">
        {recentPosts.map(renderPost)}
      </ul>

      <Link
        href="/blog"
        onClick={() =>
          track('nav_click', { section: 'blog', source: 'widget' })
        }
        className="block px-4 3xl:px-5 py-2 3xl:py-3 text-center text-xs 3xl:text-sm font-mono text-[var(--gray)] hover:text-[var(--fg)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-t border-[var(--border-color)]"
      >
        View all posts →
      </Link>
    </div>
  )
}
