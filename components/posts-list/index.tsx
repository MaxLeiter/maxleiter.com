import { useState } from 'react'

import BlockEntry from '@components/entry/block'
import styles from './posts-list.module.css'
import type { Post } from '@lib/types'
import FadeIn from '@components/fade-in'

type Props = {
  posts: Post[]
  paginate?: boolean
}

const Posts = ({ posts, paginate }: Props) => {
  const [showMore, setShowMore] = useState(4)

  return (
    <ul className={styles.container}>
      {posts.slice(0, paginate ? showMore : undefined).map((post) => {
        const date = new Date(post.date).toLocaleDateString('default', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
        })

        return (
          <FadeIn key={`post-item-${post.slug}`}>
            <BlockEntry
              href={`/blog/${post.slug}`}
              title={post.title}
              type={date}
              as={`/blog/${post.slug}`}
              description={post.description}
            /></FadeIn>
        )
      })}
      {paginate && showMore < posts.length && (
        <button
          onClick={() => {
            setShowMore(showMore + 4)
          }}
          className={styles.button}
        >
          Show More
        </button>
      )}
    </ul>
  )
}

export default Posts
