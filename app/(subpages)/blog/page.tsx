import PostsList from '@components/posts-list'
import getPosts from '@lib/get-posts'
import { experimental_use as use } from 'react'

async function fetchPosts() {
  const posts = await getPosts()
  return posts
}

const Blog = () => {
  const posts = use(fetchPosts())

  return (
    <article>
      <ul>
        <PostsList posts={posts} />
      </ul>
    </article>
  )
}

export default Blog
