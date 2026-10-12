import { EntryList, TileGrid, type ListItem } from '@components/lists'
import { transitionName } from '@framework/shared/transitions'
import { entryHref, type ListEntry, POPULAR_SLUGS } from '@lib/types'

interface BlogListContentProps {
  posts: ListEntry[]
}

/** Seeds match the homepage's, so a post wears one cover everywhere. */
function toItem(post: ListEntry): ListItem {
  const href = entryHref(post)
  const kind = post.isThirdParty
    ? 'Work'
    : post.type === 'note'
      ? 'Note'
      : 'Blog'
  const seed = post.isThirdParty
    ? `work:${post.href}`
    : `${post.type === 'note' ? 'note' : 'blog'}:${post.slug}`
  return {
    href,
    title: post.title,
    seed,
    meta: `${kind}  ·  ${post.date}`.toUpperCase(),
    chip: kind,
    desc: post.excerpt,
    external: post.isThirdParty,
    vtName:
      post.isThirdParty || post.type === 'note'
        ? undefined
        : transitionName('blog', post.slug),
  }
}

export function BlogListContent({ posts }: BlogListContentProps) {
  const popular = POPULAR_SLUGS.map((slug) =>
    posts.find((p) => p.slug === slug),
  ).filter((p): p is ListEntry => p !== undefined)

  return (
    <>
      <h1 className="ui-title">Blog</h1>
      <p className="ui-lede">
        Posts, notes, and the things I wrote for other people&apos;s blogs.
      </p>

      {popular.length > 0 && (
        <section className="ui-section" aria-labelledby="popular">
          <h2 className="ui-h2" id="popular">
            Popular
          </h2>
          <TileGrid items={popular.map(toItem)} />
        </section>
      )}

      <section className="ui-section" aria-labelledby="all-posts">
        <h2 className="ui-h2" id="all-posts">
          All posts
        </h2>
        <EntryList
          items={posts.map((post) => ({ ...toItem(post), vtName: undefined }))}
        />
      </section>
    </>
  )
}
