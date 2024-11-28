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
    <div className="space-y-16">
      <h2 className="text-2xl font-semibold tracking-tight">Posts and other half-baked thoughts</h2>
      <ul className="space-y-16">

        {posts.slice(0, paginate ? showMore : undefined).map((post, i) => {
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
              index={i}
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
    </div>
  )
}

export default Posts
