'use client'

import { useState } from 'react'

import BlockEntry from '@components/entry/block'
import styles from './posts-list.module.css'
import type { Post } from '@lib/types'

type Props =
  | {
    posts: Post[]
    paginate?: boolean
  }
  | {
    skeleton: true
  }

const Posts = (props: Props) => {
  const [showMore, setShowMore] = useState(4)

  if ('skeleton' in props) {
    return (
      <ul className={styles.container}>
        {[...Array(4)].map((_, i) => (
          <BlockEntry key={i} skeleton />
        ))}
      </ul>
    )
  }

  const { posts, paginate } = props

  return (
    <ul className={styles.container}>
      {posts.slice(0, paginate ? showMore : undefined).map((post) => {
        const date = new Date(post.date).toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
        })

        return (
          <BlockEntry
            // TODO: Math.random is a bad hack.
            key={`post-item-${post.slug || Math.random()}`}
            href={post.isThirdParty ? post.href! : `/blog/${post.slug}`}
            title={post.title}
            date={new Date(date)}
            views={post.views}
            isThirdParty={post.isThirdParty}
          />
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
