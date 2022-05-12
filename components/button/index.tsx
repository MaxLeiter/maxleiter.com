import styles from './button.module.css'
import { forwardRef, Ref } from 'react'

type Props = React.HTMLProps<HTMLButtonElement> & {
  onClick?: () => void
  children: React.ReactNode
  disabled?: boolean
  width?: number
  height?: number
}

// eslint-disable-next-line react/display-name
const Button = forwardRef(
  (
    { onClick, children, disabled, width, height, ...props }: Props,
    ref: Ref<HTMLButtonElement>
  ) => {
    return (
      <button
        onClick={onClick}
        className={styles.button}
        disabled={disabled}
        ref={ref}
        style={{
          width: width ? `${width}px` : 'auto',
          height: height ? `${height}px` : 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        {...props}
        type={(props.type as any) || 'button'}
      >
        {children}
      </button>
    )
  }
)

export default Button
