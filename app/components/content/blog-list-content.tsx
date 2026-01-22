'use client'

import { ListCard } from '@components/desktop/list-card'
import type { BlogPost } from '@lib/portfolio-data'
import { POPULAR_SLUGS } from '@lib/popular-posts'

interface BlogListContentProps {
  posts: BlogPost[]
  onPostClick?: (slug: string) => void
  onPostHover?: (slug: string) => void
  onPostHoverEnd?: () => void
}

export function BlogListContent({
  posts,
  onPostClick,
  onPostHover,
  onPostHoverEnd,
}: BlogListContentProps) {
  const popularPosts = POPULAR_SLUGS.map((slug) =>
    posts.find((p) => p.slug === slug),
  ).filter((p): p is BlogPost => p !== undefined)

  const renderPost = (post: BlogPost) => {
    const isExternal = post.isThirdParty
    const href = isExternal && post.href ? post.href : `/blog/${post.slug}`

    return (
      <ListCard
        key={post.slug}
        href={href}
        title={post.title}
        description={post.excerpt}
        meta={isExternal ? `${post.date} · external` : post.date}
        icon
        external={isExternal}
        onClick={
          !isExternal && onPostClick
            ? (e) => {
                e.preventDefault()
                onPostClick(post.slug)
              }
            : undefined
        }
        onMouseEnter={!isExternal ? () => onPostHover?.(post.slug) : undefined}
        onMouseLeave={!isExternal ? onPostHoverEnd : undefined}
      />
    )
  }

  return (
    <div className="max-w-3xl">
      <h1
        className="text-3xl font-mono font-bold mb-8"
        style={{ color: 'var(--article-color)' }}
      >
        blog/
      </h1>

      {popularPosts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-mono text-(--gray) mb-3">popular</h2>
          <ul className="space-y-2">{popularPosts.map(renderPost)}</ul>
        </section>
      )}

      <section>
        <h2 className="text-sm font-mono text-(--gray) mb-3">all posts</h2>
        <ul className="space-y-2">{posts.map(renderPost)}</ul>
      </section>
    </div>
  )
}
