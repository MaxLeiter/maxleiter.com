import Link from '@components/link'
import styles from './block.module.css'

type Props =
  | {
      title: string
      description?: string
      type?: string
      href: string
      date?: Date
      views?: number
      isThirdParty?: boolean
    }
  | {
      skeleton: true
    }

const BlockEntry = (props: Props) => {
  if ('skeleton' in props) {
    return <li className={styles.skeleton} />
  }

  const { title, description, type, href, date, views, isThirdParty } = props
  return (
    <li className={styles.item}>
      <Link
        href={href}
        title={description || title}
        className={styles.link}
        underline={false}
        external={isThirdParty}
      >
        {type && <div className={styles.type}>{type}</div>}
        {date && (
          <div className={styles.wrapper}>
            {date && (
              <span className={styles.date}>
                {date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
            {views ? (
              <span className={styles.views}>
                {views.toLocaleString()} {views === 1 ? 'view' : 'views'}
              </span>
            ) : null}
          </div>
        )}
        <h4 className={`${styles.title}`}>{title}</h4>
        {description && <p className={styles.description}>{description}</p>}
        {isThirdParty && (
            <span className={styles.thirdParty}>{new URL(href).hostname}</span>
        )}
      </Link>
    </li>
  )
}

export default BlockEntry
