import styles from './button.module.css'
import { forwardRef } from 'react'

// eslint-disable-next-line react/display-name
const Button = forwardRef(({ onClick, children, disabled }, ref) => {
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
