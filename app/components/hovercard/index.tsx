import { ReactNode, useState } from 'react'
import styles from './hovercard.module.css'

const Hovercard = ({
  children,
  card,
  ...otherProps
}: {
  card: ReactNode
  children: ReactNode | ReactNode[]
}) => {
  const [isHovering, setIsHovering] = useState(false)
  const handleMouseOver = () => {
    setIsHovering(true)
  }

  const handleMouseOut = () => {
    setTimeout(() => {
      setIsHovering(false)
    }, 1000)
  }

  return (
    <div
      style={{ width: 'min-content', display: 'inline', height: '100%' }}
      {...otherProps}
      onMouseEnter={handleMouseOver}
      onMouseLeave={handleMouseOut}
    >
      {isHovering && (
        <span>
          <div className={styles.card} {...otherProps}>
            {card}
          </div>
        </span>
      )}
      {children}
    </div>
  )
}

export default Hovercard
