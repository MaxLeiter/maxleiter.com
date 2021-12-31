import Head from 'next/head'

import Page from '@components/page'
import PostsList from '@components/posts-list'
import styles from './error.module.css'
import { Post } from '@lib/types'

type Props = {
  status: number
  posts: Post[]
}

const Error = ({ status, posts }: Props) => {
  return (
    <Page description={`Error`} title={status.toString() || 'Error'}>
      <Head>
        <title>404 — Max Leiter</title>
      </Head>

      {status === 404 ? (
        <>
          <h1 className={styles.first}>
            This is not the page you are looking for.
          </h1>
          <h2 className={styles.second}>Maybe it was one of these?</h2>
          <span className={styles.third}>
            <PostsList posts={posts} />
          </span>
        </>
      ) : (
        <section className={styles.section}>
          <span>{status || '?'}</span>
          <p>An error occurred.</p>
        </section>
      )}
    </Page>
  )
}

export default Error
