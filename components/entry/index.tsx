import Badge from '@components/badge'
import Link from '@components/link'
import styles from './entry.module.css'

type Props = {
  href: string
  title: string
  description: string
  role: string
  years: string[]
  showYears: boolean
}

const Entry = ({
  href,
  title,
  description,
  role,
  years,
  showYears = true,
}: Props) => (
  <li className={styles.wrapper}>
    <div className={styles.split}>
      <Link href={href} external={true}>
        {title}
      </Link>
      <Badge className={styles.badge}>{role}</Badge>
      {showYears && (
        <Badge>
          {years[0]} {years[1] ? '-' : ''} {years[1]}
        </Badge>
      )}
    </div>
    <div>{description}</div>
  </li>
)

export default Entry
