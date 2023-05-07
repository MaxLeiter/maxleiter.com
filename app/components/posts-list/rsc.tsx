import getPosts from '@lib/get-posts'
import PostsList from '.'

export async function PostListRSC({ paginate }: { paginate?: boolean }) {
  const posts = await getPosts()
  return <PostsList posts={posts} paginate={paginate} />
}
