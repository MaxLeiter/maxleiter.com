import Link from 'next/link'
import getPosts, { getPost } from '@lib/get-posts'
import { BlogPostContent } from '@components/blog-post-content'
import { WindowToolbar } from '@components/desktop/window-toolbar'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export default async function PostPage(props: {
  params: Promise<{
    slug: string
  }>
}) {
  const params = await props.params
  const post = await getPost(params.slug)

  if (!post) return notFound()

  return (
    <div className="min-h-screen bg-black text-white/90 flex flex-col">
      <WindowToolbar
        title={post.title}
        segments={[
          { name: 'blog', href: '/blog' },
          { name: params.slug, href: `/blog/${params.slug}` },
        ]}
      />

      <div className="flex-1 overflow-auto p-6">
        <BlogPostContent
          slug={params.slug}
          title={post.title}
          date={post.date}
          description={post.description}
          body={post.body}
          lastModified={post.lastModified}
        />
      </div>
    </div>
  )
}
