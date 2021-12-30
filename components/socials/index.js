import Link from 'next/link'

import styles from './socials.module.css'
import { GitHub, Twitter, LinkedIn, Mail } from '@components/icons'
import Tooltip from '@components/tooltip'
const Socials = () => {
  return (
    <div className={styles.socials}>
      <Link external href="https://github.com/maxleiter">
        <a
          aria-label="Visit my GitHub"
          className={styles.icon}
          target="_blank"
          rel="noopener noreferrer"
          tagIndex={0}
        >
          <Tooltip text={'GitHub'}>
            <GitHub />
          </Tooltip>
        </a>
      </Link>
      <Link external href="https://twitter.com/max_leiter">
        <a
          aria-label="Visit my Twitter"
          className={styles.icon}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Tooltip text={'Twitter'}>
            <Twitter />
          </Tooltip>
        </a>
      </Link>
      <Link external href="https://linkedin.com/in/maxleiter">
        <a
          aria-label="Visit my LinkedIn"
          className={styles.icon}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Tooltip text={'LinkedIn'}>
            <LinkedIn />
          </Tooltip>
        </a>
      </Link>
      <Link external href="mailto:maxwell.leiter@gmail.com">
        <a
          aria-label="Email me"
          className={styles.icon}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Tooltip text={'Email'}>
            <Mail />
          </Tooltip>
        </a>
      </Link>
    </div>
  )
}

Socials.displayName = 'Socials'
export default Socials
