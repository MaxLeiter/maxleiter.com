import getNotes, { getNote } from '@lib/get-notes'
import { PostBody } from '@mdx/post-body'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const posts = await getNotes()
  return posts.map((post) => ({ slug: post.slug }))
}

export default async function NotePage(
  props: {
    params: Promise<{
      slug: string
    }>
  }
) {
  const params = await props.params;
  const post = await getNote(params.slug)
  if (!post) return notFound()
  return <PostBody>{post?.body}</PostBody>
}
