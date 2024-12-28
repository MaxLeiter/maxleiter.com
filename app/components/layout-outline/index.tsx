import React from 'react'
import styles from './layout-outline.module.css'
import { clsx } from 'clsx'

type Props = {
  name: string
  children: React.ReactNode
  type: 'page' | 'layout'
}

const RENDER = false

function Outline({ name, children, type }: Props) {
  if (!RENDER) return <>{children}</>

  return (
    <div className={clsx(styles['layout-outline'], styles[type])}>
      <div className={styles['label-container']}>
        <div className={styles.label}>{name}</div>
      </div>
      {children}
    </div>
  )
}

export default Outline
