import Badge from '@components/badge'
import { Star } from '@components/icons'
import Link from '@components/link'
import styles from './entry.module.css'

type Props = {
  href: string
  title: string
  description: string
  role: string
  years: string[]
  showYears: boolean
  stars?: number
}

export const Entry = ({
  href,
  title,
  description,
  role,
  years,
  showYears = true,
  stars,
}: Props) => (
  <li className={styles.wrapper}>
    <div className={styles.split}>
      <h4 className={styles.title}>
        <Link href={href} external={true}>
          {title}
        </Link>
      </h4>
      <div className={styles.badges}>
        <Badge className={styles.badge}>{role}</Badge>
        {showYears && (
          <Badge>
            {years[0]} {years[1] ? '-' : ''} {years[1]}
          </Badge>
        )}
        {stars && (
          <Link
            href={href}
            external
            underline
            style={{
              // TODO: why is this needed?
              textDecoration: 'none',
            }}
          >
            <Badge className={styles.starBadge}>
              <Star size={14} /> <span style={{ marginLeft: 4 }}>{stars}</span>
            </Badge>
          </Link>
        )}
      </div>
    </div>
    <div>{description}</div>
  </li>
)
