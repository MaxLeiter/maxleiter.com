import Post from '@components/post'
import getPosts from '@lib/get-posts'
// import renderMarkdown from '@lib/render-markdown'
import { experimental_use as use } from 'react'

export const config = {
  dynamic: 'error',
  dynamicParams: false, // default
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
    html: body,
  }
}

const PostPage = ({
  params,
}: {
  params: {
    slug: string
  }
}) => {
  const post = use(getData(params))
  return <Post {...post} />
}

export async function generateStaticParams() {
  const params = (await getPosts()).map((p) => {
    return {
      ...p,
      slug: p.slug,
    }
  })

  return params
}

// export const getStaticProps = async ({ params: { slug } }: Props) => {
//   const posts = await getPosts()
//   const postIndex = posts.findIndex((p) => p?.slug === slug)
//   const post = posts[postIndex]
//   if (!post) return { props: { post: null } }
//   const { body, ...rest } = post

//   return {
//     props: {
//       previous: posts[postIndex + 1] || null,
//       next: posts[postIndex - 1] || null,
//       ...rest,
//       html: renderMarkdown(body),
//     } as PostProps,
//   }
// }

// export const getStaticPaths = async () => {
//   return {
//     paths: (await getPosts()).map((p) => `/blog/${p?.slug}`),
//     fallback: false,
//   }
// }

export default PostPage

// export const config = {
//   unstable_JsPreload: false,
//   unstable_runtimeJS: false,
// }
