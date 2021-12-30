import { memo } from 'react'

import Link from '@components/link'
import styles from './text.module.css'

const TextEntry = ({ title, description, type, comment, href, as, date }) => {
  return (
    <li className={styles.item}>
      <Link
        href={href}
        as={as}
        external={!as}
        title={`${title}`}
        className={styles.link}
        transition={false}
      >
        {type && <div className={styles.type}>{type}</div>}
        {date && (
          <div className={styles.date}>{date.toLocaleDateString('en-US')}</div>
        )}
        <div>
          <p className={`${styles.title}`}>{title}</p>
          {/* {description && (
            <p className={`${styles.description}`}>{description}</p>
          )} */}
        </div>
      </Link>
    </li>
  )
}

export default memo(TextEntry)
