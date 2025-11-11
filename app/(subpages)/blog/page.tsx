import { BreadcrumbNav } from '@components/desktop/breadcrumb-nav'
import { ListCard } from '@components/desktop/list-card'
import { getBlogPosts } from '@lib/portfolio-data'

export default async function BlogPage() {
  const posts = await getBlogPosts()

  return (
    <div className="min-h-screen bg-black text-white/90 flex flex-col">
      <BreadcrumbNav segments={[{ name: 'blog', href: '/blog' }]} />

      <div className="flex-1 overflow-auto p-6">
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
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
