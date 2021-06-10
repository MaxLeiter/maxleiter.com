import Error from '@components/error'
import getPosts from '@lib/get-posts'

const NotFound = ({ posts }) => {
  return <Error status={404} posts={posts} />
}

export async function getStaticProps() {
  const posts = getPosts()

  return {
    props: {
      posts,
    },
  }
}

export default NotFound
