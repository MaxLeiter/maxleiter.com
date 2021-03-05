import Link from 'next/link'

import styles from './socials.module.css'
import { GitHub, Twitter, LinkedIn, Mail } from '@components/icons'

const Socials = () => {
  return (
    <div className={styles.socials}>
      <Link external href="https://github.com/maxleiter">
        <a aria-label="Visit my GitHub" className={styles.icon} target="_blank" rel="noopener noreferrer">
          <GitHub />
        </a>
      </Link>
      <Link external href="https://twitter.com/max_leiter">
        <a aria-label="Visit my Twitter" className={styles.icon}  target="_blank" rel="noopener noreferrer">
          <Twitter />
        </a>
      </Link>
      <Link external href="https://linkedin.com/in/maxleiter">
        <a aria-label="Visit my LinkedIn" className={styles.icon} target="_blank" rel="noopener noreferrer">
          <LinkedIn />
        </a>
      </Link>
      <Link external href="mailto:maxwell.leiter@gmail.com">
        <a aria-label="Email me" className={styles.icon} target="_blank" rel="noopener noreferrer">
          <Mail />
        </a>
      </Link>
    </div>
  )
}

Socials.displayName = 'Socials'
export default Socials
