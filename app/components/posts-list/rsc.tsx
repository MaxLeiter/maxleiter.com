import getPosts from '@lib/get-posts'
import PostsList from '.'

const fetchPosts = async () => {
  const posts = await getPosts()
  return posts
}

export async function PostListRSC({ paginate }: { paginate?: boolean }) {
  const posts = await fetchPosts()
  return <PostsList posts={posts} paginate={paginate} />
}
