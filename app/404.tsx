import Error from '@components/error'
import getPosts from '@lib/get-posts'
import { experimental_use as use } from 'react'

async function fetchPosts() {
  const posts = await getPosts()
  return posts
}

const NotFound = () => {
  const posts = use(fetchPosts())
  return <Error status={404} posts={posts} />
}

export default NotFound
