import getPosts from '@lib/get-posts'
import { PostBody } from '@mdx/lib'

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

async function getData({ slug }: { slug: string }) {
  const posts = await getPosts()
  const postIndex = posts.findIndex((p) => p?.slug === slug)
  const post = posts[postIndex]
  const { body, ...rest } = post

  return {
    previous: posts[postIndex + 1] || null,
    next: posts[postIndex - 1] || null,
    ...rest,
    body,
  }
}

const PostPage = async ({
  params,
}: {
  params: {
    slug: string
  }
}) => {
  const post = await getData(params)
  return <PostBody body={post.body} />
}

export default PostPage
