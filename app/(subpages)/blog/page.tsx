import PostsList from '@components/posts-list'
import getPosts from '@lib/get-posts'

async function fetchPosts() {
  const posts = await getPosts()
  return posts
}

const Blog = async () => {
  const posts = await fetchPosts()

  return (
    <article>
      <ul>
        <PostsList posts={posts} />
      </ul>
    </article>
  )
}

export default Blog
