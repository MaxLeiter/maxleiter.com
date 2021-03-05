import Link from '@components/link'
import { Star } from '@components/icons'
import styles from './entry.module.css'

const Entry = ({ href, title, description, role, stars = -1 }) => (
  <li className={styles.wrapper}>
      <Link underline href={href} external={true}>
          {title}
      </Link> &mdash; {role} {stars > 0 && <span className={styles.stars}>({stars} GitHub <Star size={12} />)</span>}
      <div>
          {description}
      </div>
  </li>
)

export default Entry
