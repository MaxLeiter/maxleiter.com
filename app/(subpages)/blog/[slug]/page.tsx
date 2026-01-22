import getPosts, { getPost } from '@lib/get-posts'
import { notFound } from 'next/navigation'
import { BlogPostPageClient } from './blog-post-page-client'
import { BlogPostContent } from '@components/blog-post-content'

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

function EmbedInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(${(() => {
          // Check if we're in embed mode
          const urlParams = new URLSearchParams(window.location.search)
          const isEmbed = urlParams.get('embed') !== null

          // Store in global for React to read on hydration
          window.__IS_EMBED__ = isEmbed

          // If embed mode, remove the toolbar from DOM immediately
          // This ensures the DOM matches what React will render on hydration
          if (isEmbed) {
            const toolbar = document.getElementById('blog-toolbar')
            if (toolbar) {
              toolbar.remove()
            }
          }
        }).toString()})()`,
      }}
    />
  )
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
    <>
      <BlogPostPageClient slug={params.slug} title={post.title}>
        <BlogPostContent
          slug={params.slug}
          title={post.title}
          date={post.date}
          description={post.description}
          body={post.body}
          lastModified={post.lastModified}
        />
      </BlogPostPageClient>
      <EmbedInitScript />
    </>
  )
}
