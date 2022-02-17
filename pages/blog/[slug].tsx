import Post from '@components/post'
import getPosts from '@lib/get-posts'
import renderMarkdown from '@lib/render-markdown'

//@ts-ignore
const PostPage = (props) => {
  return <Post {...props} />
}

type Props = {
  params: {
    slug: string
  }
}

export const getStaticProps = ({ params: { slug } }: Props) => {
  const posts = getPosts()
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
    },
  }
}

export const getStaticPaths = () => {
  return {
    paths: getPosts().map((p) => `/blog/${p?.slug}`),
    fallback: false,
  }
}

export default PostPage

export const config = {
  unstable_JsPreload: false,
  unstable_runtimeJS: false,
};
