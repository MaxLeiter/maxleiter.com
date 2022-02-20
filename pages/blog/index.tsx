import Page from '@components/page'
import PostsList from '@components/posts-list'
import getPosts from '@lib/get-posts'
import { Post } from '@lib/types'

type Props = {
  posts: Post[]
}

const Blog = ({ posts }: Props) => {
  return (
    <Page title="Blog" description="Writing about design and code.">
      <article>
        <ul>
          <PostsList posts={posts} />
        </ul>
      </article>
    </Page>
  )
}

export const getStaticProps = async () => {
  const posts = await getPosts()

  return {
    props: {
      posts,
    },
  }
}

export default Blog

export const config = {
  unstable_JsPreload: false,
  unstable_runtimeJS: false,
};
