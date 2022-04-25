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
        title={description || title}
        className={styles.link}
        transition={false}
      >
        {type && <div className={styles.type}>{type}</div>}
        {date && (
          <span className={styles.date}>
            {date.toLocaleDateString('en-US')}
          </span>
        )}
        <h4 className={`${styles.title}`}>{title}</h4>
        {description && (
          <sub className={`${styles.description}`}>{description}</sub>
        )}
      </Link>
    </li>
  )
}

export default BlockEntry
