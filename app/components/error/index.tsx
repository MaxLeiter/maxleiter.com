import PostsList from '@components/posts-list'
import styles from './error.module.css'

import { Post } from '@lib/types'

type Props = {
  status: number
  posts: Promise<Post[]>
}

const Error = ({ status, posts }: Props) => {
  return (
    <>
      {status === 404 ? (
        <section>
          <h1 className={styles.first}>
            This is not the page you are looking for.
          </h1>
          <h2 className={styles.second}>Maybe it was one of these?</h2>
          <span className={styles.third}>
            <PostsList paginate={true} posts={posts} />
          </span>
        </section>
      ) : (
        <section className={styles.section}>
          <span>{status || '?'}</span>
          <p>An error occurred.</p>
        </section>
      )}
    </>
  )
}

export default Error
