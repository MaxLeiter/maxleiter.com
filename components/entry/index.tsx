import Badge from '@components/badge'
import Hovercard from '@components/hovercard'
import Link from '@components/link'
import { ReactNode } from 'react'
import styles from './entry.module.css'

type Props = {
  href: string
  title: string
  description: string
  role: string
  // stars?: number
  years: string[]
  showYears: boolean
  hovercard?: ReactNode
}

const Entry = ({
  href,
  title,
  description,
  role,
  // stars = -1,
  years,
  showYears = true,
  hovercard
}: Props) => (
  <li className={styles.wrapper}>
    <div className={styles.split}>
      {hovercard && <Hovercard card={hovercard}>
        <Link href={href} external={true}>
          {title}
        </Link>{' '}
      </Hovercard>}
      {!hovercard && <Link href={href} external={true}>
        {title}
      </Link>}
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
