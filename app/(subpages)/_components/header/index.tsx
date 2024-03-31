import { memo } from 'react'

import styles from './header.module.css'
import ThemeSwitcher from '@components/theme-switcher'

type Props = {
  render: boolean
  title: string | React.ReactNode
}

const Header = ({ render, title }: Props) => {
  if (render) {
    return (
      <div className={styles.nav}>
        <div className={styles.header}>
          {title ? title : null}
        </div>
        <div>
          <ThemeSwitcher hideTooltip />
        </div>
      </div>
    )
  }
  return (
    <div aria-hidden={true}>
      <div className={styles.header}>
        {title ? title : null}
      </div>
    </div>
  )
}

export default memo(Header)
