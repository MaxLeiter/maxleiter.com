import { memo } from 'react'

import Link from '@components/link'
import styles from './text.module.css'

const TextEntry = ({ title, description, type, comment, href, as }) => {
  return (
    <li className={styles.item}>
      <Link
        href={href}
        as={as}
        external={!as}
        title={`${title} (${description})`}
        className={styles.link}
        underline={false}
      >
        <div className={styles.type}>{type}</div>
        <div>
          <p className={`${styles.title} clamp`}>{title}</p>
          {description && (
            <p className={`${styles.description} clamp`}>{description}</p>
          )}
        </div>
      </Link>
    </li>
  )
}

export default memo(TextEntry)
