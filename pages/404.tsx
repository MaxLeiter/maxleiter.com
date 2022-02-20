import Error from '@components/error'
import getPosts from '@lib/get-posts'
import { Post } from '@lib/types'

type Props = {
  posts: Post[]
}

const NotFound = ({ posts }: Props) => {
  return <Error status={404} posts={posts} />
}

export async function getStaticProps() {
  const posts = await getPosts()

  return {
    props: {
      posts,
    },
  }
}


export default NotFound
