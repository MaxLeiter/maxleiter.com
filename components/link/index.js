import { memo } from 'react'
import NextLink from 'next/link'

import styles from './link.module.css'

const Link = ({
  external,
  href,
  as,
  children,
  className,
  underline = true,
  ...props
}) => {
  const style = underline ? className + ` ${styles.underline}` : className + ` ${styles.reset}`

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={style}
        {...props}
      >
        {children}
      </a>
    )
  }

  return (
    <>
      <NextLink
        href={href}
        as={as}
      >
        <a className={style} {...props}>
          {children}
        </a>
      </NextLink>
    </>
  )
}

Link.displayName = 'Link'
export default memo(Link)
