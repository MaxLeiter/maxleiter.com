import Link from '@components/link'
import { Post } from '@lib/types'

import styles from './navigation.module.css'

const Previous = ({ previous, next }: { previous?: Post; next?: Post }) => {
  return (
    <div className={styles.navigation}>
      <div className={styles.previous}>
        {previous && (
          <Link href={`/blog/${previous.slug}`}>
            <div className={styles.title}>← Older</div>
            {previous.title}
          </Link>
        )}
      </div>

      <div className={styles.next}>
        {next && (
          <Link href={`/blog/${next.slug}`}>
            <div className={styles.title}>Newer →</div>
            {next.title}
          </Link>
        )}
      </div>
    </div>
  )
}

export default Previous
