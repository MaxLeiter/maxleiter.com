import { memo } from 'react'

import Link from '@components/link'
import styles from './block.module.css'

type Props = {
  title: string
  description?: string
  type?: string
  href: string
  as?: string
  date?: Date
}

const BlockEntry = ({ title, description, type, href, as, date }: Props) => {
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
          {description && (
            <p className={`${styles.description}`}>{description}</p>
          )}
        </div>
      </Link>
    </li>
  )
}

export default memo(BlockEntry)
