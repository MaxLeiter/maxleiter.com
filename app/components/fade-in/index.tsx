// https://www.joshwcomeau.com/snippets/react-components/fade-in/

import { ReactNode } from 'react'
import styles from './fade.module.css'

type Props = {
  children: ReactNode
  duration?: number
  delay?: number
  className?: string
}

const FadeIn = ({ duration = 300, delay = 0, children, className }: Props) => {
  return (
    <div
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`,
      }}
      className={`${className} ${styles.fadeIn}`}
    >
      {children}
    </div>
  )
}

export default FadeIn
