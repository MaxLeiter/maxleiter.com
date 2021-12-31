import Badge from '@components/badge'
import Link from '@components/link'
import styles from './entry.module.css'

const Entry = ({
  href,
  title,
  description,
  role,
  stars = -1,
  years,
  showYears = true,
}) => (
  <li className={styles.wrapper}>
    <div className={styles.split}>
      <Link href={href} external={true}>
        {title}
      </Link>{' '}
      <Badge>{role}</Badge>
      {showYears && (
        <Badge>
          {years[0]} {years[1] ? '-' : ''} {years[1]}
        </Badge>
      )}
    </div>
    {/* {stars > 0 && <span className={styles.stars}>({stars} GitHub <Star size={12} />)</span>} */}
    <div>{description}</div>
  </li>
)

export default Entry
