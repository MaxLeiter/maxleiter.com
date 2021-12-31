import styles from './button.module.css'
import { forwardRef, Ref } from 'react'

type Props = {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}

// eslint-disable-next-line react/display-name
const Button = forwardRef(({ onClick, children, disabled }: Props, ref: Ref<HTMLButtonElement>) => {
  return (
    <button
      onClick={onClick}
      className={styles.button}
      disabled={disabled}
      ref={ref}
    >
      {children}
    </button>
  )
})

export default Button
