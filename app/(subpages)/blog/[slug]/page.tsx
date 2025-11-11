import Link from 'next/link'
import { BreadcrumbNav } from '@components/desktop/breadcrumb-nav'
import getPosts, { getPost } from '@lib/get-posts'
import { PostBody } from '@mdx/post-body'
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

  const lastModifiedDate = post.lastModified
    ? new Date(post.lastModified).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-black text-white/90 flex flex-col">
      <BreadcrumbNav
        segments={[
          { name: 'blog', href: '/blog' },
          { name: params.slug, href: `/blog/${params.slug}` },
        ]}
      />

      <div className="flex-1 overflow-auto p-6">
        <article className="max-w-3xl mx-auto">
          <div className="mb-1">
            <span className="text-white/50 font-mono text-sm">{post.date}</span>
            {lastModifiedDate && (
              <span className="text-white/40 font-mono text-xs ml-4">
                Last modified {lastModifiedDate}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-mono font-bold text-white/90 mb-2! mt-2! leading-10">
            {post.title}
          </h1>
          {post.description && (
            <p className="text-gray-400 font-mono text-base mb-4 mt-0!">
              {post.description}
            </p>
          )}

          <div
            className="prose prose-invert prose-sm max-w-none
                          prose-headings:font-mono prose-headings:text-white/90
                          prose-p:text-white/80 prose-p:leading-relaxed
                          prose-a:text-blue-400 prose-a:no-underline hover:prose-a:text-blue-300
                          prose-code:text-white/90 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                          prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10
                          prose-img:rounded-lg prose-img:border prose-img:border-white/10
                          prose-blockquote:border-l-white/20 prose-blockquote:text-white/70
                          prose-strong:text-white/90 prose-strong:font-semibold
                          prose-ul:text-white/80 prose-ol:text-white/80
                          prose-li:text-white/80"
          >
            <PostBody>{post.body}</PostBody>
          </div>
        </article>
      </div>
    </div>
  )
}
