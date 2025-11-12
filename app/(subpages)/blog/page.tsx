import { getBlogPosts } from '@lib/portfolio-data'
import { WindowToolbar } from '@components/desktop/window-toolbar'
import { ViewTransitionWrapper } from '@components/view-transition-wrapper'
import { BlogListContent } from '@components/content/blog-list-content'

export default async function BlogPage() {
  const posts = await getBlogPosts({ includeContent: false })

  return (
    <div className="min-h-screen bg-black text-white/90 flex flex-col">
      <WindowToolbar
        title="blog"
        segments={[{ name: 'blog', href: '/blog' }]}
      />

      <div className="flex-1 overflow-auto p-6">
        <ViewTransitionWrapper name="page-blog">
          <BlogListContent posts={posts} />
        </ViewTransitionWrapper>
      </div>
    </div>
  )
}
