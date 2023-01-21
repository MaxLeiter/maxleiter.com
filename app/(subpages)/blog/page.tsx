import { PostListRSC } from '@components/posts-list/rsc'
import { Suspense } from 'react'

const Blog = async () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* @ts-expect-error async rsc support */}
      <PostListRSC paginate={true} />
    </Suspense>
  )
}

export default Blog

export const config = { runtime: 'experimental-edge' }

