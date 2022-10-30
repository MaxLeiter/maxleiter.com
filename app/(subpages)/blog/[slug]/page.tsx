import Post from 'app/(subpages)/blog/[slug]/post'
import getPosts from '@lib/get-posts'
import renderMarkdown from '@lib/render-markdown'
import FadeIn from '@components/fade-in'

export const dynamicParams = true;

async function getData({ slug }: { slug: string }) {
  const posts = await getPosts()
  const postIndex = posts.findIndex((p) => p?.slug === slug)
  const post = posts[postIndex]
  const { body, ...rest } = post

  return {
    previous: posts[postIndex + 1] || null,
    next: posts[postIndex - 1] || null,
    ...rest,
    html: renderMarkdown(body),
  }
}

export async function generateStaticParams() { 
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }))
}

const PostPage = async ({
  params,
}: {
  params: {
    slug: string
  }
}) => {
  const post = await getData(params)
  return (
    <FadeIn>
      <Post {...post} />
    </FadeIn>
  )
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
