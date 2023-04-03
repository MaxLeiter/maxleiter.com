import getPosts, { getPost } from '@lib/get-posts'
import { PostBody } from '@mdx/post-body'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export default async function PostPage({
  params,
}: {
  params: {
    slug: string
  }
}) {
  const post = await getPost(params.slug)
  if (!post) return notFound()
  return <PostBody>{post?.body}</PostBody>
}
