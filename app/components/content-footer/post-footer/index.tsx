import Link from '@components/link'
import React from 'react'
import styles from './footer.module.css'

const PostFooter = () => {
  return (
    <footer className={styles.footer}>
      <hr />
      <p>
        Thanks for reading! If you want to see future content, you can follow me{' '}
        <Link external href="https://twitter.com/max_leiter">
          on Twitter
        </Link>{' '}
        or subscribe to my
        <Link href="/feed.xml"> RSS feed</Link>.
      </p>
    </footer>
  )
}

export default PostFooter
