import getPosts, { getPost } from '@lib/get-posts'
import { notFound } from 'next/navigation'
import { BlogPostPageClient } from './blog-post-page-client'
import { BlogPostContent } from '@components/blog-post-content'

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
  )
}
