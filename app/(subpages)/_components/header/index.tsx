import { memo } from 'react'
import Link from 'next/link'

import styles from './header.module.css'
import Home from '@components/icons/home'
import socialStyles from '@components/socials/socials.module.css'
import ThemeSwitcher from '@components/theme-switcher'

type Props = {
  render: boolean
  title: string
}

const Header = ({ render, title }: Props) => {
  if (render) {
    return (
      <nav className={styles.nav}>
        <div className={styles.header}>
          <Link href="/" className={`${socialStyles.icon} ${styles.icon}`}>
            <Home size={28} />
          </Link>
          <ThemeSwitcher hideTooltip />
          {title && <div className={styles.content}>{title}</div>}
        </div>
      </nav>
    )
  }
  return (
    <nav aria-hidden={true}>
      <div className={styles.header}>
        {title && <div className={styles.content}>{title}</div>}
      </div>
    </nav>
  )
}

export default memo(Header)
