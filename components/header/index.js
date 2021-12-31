import { memo } from 'react'
import Link from 'next/link'

import styles from './header.module.css'
import { ArrowLeft } from '@components/icons'

const Header = ({ render, title, content }) => {
  if (render) {
    return (
      <nav className={styles.nav}>
        <div className={styles.header}>
          <Link href="/">
            <a aria-label="Navigate Home" className={styles.icon}>
              <ArrowLeft />
            </a>
          </Link>
          {title && <div className={styles.content}>{title}</div>}
        </div>
      </nav>
    )
  } else {
    return (
      <nav className={styles.fakeNav} aria-hidden={true}>
        <div className={styles.header}>
          {title && <div className={styles.content}>{title}</div>}
        </div>
      </nav>
    )
  }
}

Header.displayName = 'Header'
export default memo(Header)
