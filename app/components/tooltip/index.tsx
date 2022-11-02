'use client'

import type { ReactNode } from 'react'
import React from 'react'
import styles from './tooltip.module.css'

const Tooltip = ({
  children,
  text,
  ...otherProps
}: {
  text: string
  children: ReactNode | ReactNode[]
}) => {
  return (
    <span className={styles.tooltip} data-label={text} {...otherProps}>
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
