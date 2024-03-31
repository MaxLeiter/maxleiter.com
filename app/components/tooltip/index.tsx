'use client'

import type { ReactNode } from 'react'
import React from 'react'
import styles from './tooltip.module.css'

const Tooltip = ({
  children,
  text,
  direction = 'top',
  ...otherProps
}: {
  text: string
  children: ReactNode | ReactNode[]
  direction?: 'top' | 'right' | 'bottom' | 'left'
}) => {
  return (
    <span className={styles.tooltip} data-label={text} data-direction={direction}{...otherProps}>
      {React.Children.map(
        children,
        (child) =>
          React.isValidElement(child) &&
          React.cloneElement(child, {
            // @ts-ignore
            'aria-label': text,
          })
      )}
    </span>
  )
}

export default Tooltip
