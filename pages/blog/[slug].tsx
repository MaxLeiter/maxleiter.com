import FadeIn from '@components/fade-in'
import Post, { PostProps } from '@components/post'
import getPosts from '@lib/get-posts'
import renderMarkdown from '@lib/render-markdown'

const PostPage = (props: PostProps) => {
  return <FadeIn><Post {...props} /></FadeIn>
}

type Props = {
  params: {
    slug: string
  }
}

export const getStaticProps = async ({ params: { slug } }: Props) => {
  const posts = await getPosts()
  const postIndex = posts.findIndex((p) => p?.slug === slug)
  const post = posts[postIndex]
  if (!post) return { props: { post: null } }
  const { body, ...rest } = post

  return {
    props: {
      previous: posts[postIndex + 1] || null,
      next: posts[postIndex - 1] || null,
      ...rest,
      html: renderMarkdown(body),
    } as PostProps,
  }
}

export const getStaticPaths = async () => {
  return {
    paths: (await getPosts()).map((p) => `/blog/${p?.slug}`),
    fallback: false,
  }
}

export default PostPage

// export const config = {
//   unstable_JsPreload: false,
//   unstable_runtimeJS: false,
// }
