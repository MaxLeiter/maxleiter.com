import { Row, Rows } from '@components/blades/blade-page'
import { transitionName } from '@framework/shared/transitions'
import { entryHref, type ListEntry, POPULAR_SLUGS } from '@lib/types'

interface BlogListContentProps {
  posts: ListEntry[]
}

function EntryRow({ post }: { post: ListEntry }) {
  const isNote = post.type === 'note'
  const external = Boolean(post.isThirdParty)
  return (
    <Row
      href={entryHref(post)}
      title={post.title}
      desc={post.excerpt}
      meta={external ? `${post.date} · vercel.com` : post.date}
      icon={external ? 'work' : isNote ? 'note' : 'post'}
      external={external}
      {...(external
        ? {}
        : { vt: transitionName(isNote ? 'note' : 'blog', post.slug) })}
    />
  )
}

export function BlogListContent({ posts }: BlogListContentProps) {
  const popularPosts = POPULAR_SLUGS.map((slug) =>
    posts.find((p) => p.slug === slug),
  ).filter((p): p is ListEntry => p !== undefined)

  return (
    <>
      {popularPosts.length > 0 && (
        <Rows heading="popular">
          {popularPosts.map((post) => (
            <EntryRow key={`popular-${post.slug}`} post={post} />
          ))}
        </Rows>
      )}
      <Rows heading="all posts">
        {posts.map((post) => (
          <EntryRow key={post.slug} post={post} />
        ))}
      </Rows>
    </>
  )
}
