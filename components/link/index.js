import { memo } from 'react'
import NextLink from 'next/link'

import styles from './link.module.css'

const Link = ({
  external,
  href,
  as,
  children,
  className,
  transition = true,
  ...props
}) => {
  const style = transition ? styles.transition + ` ${className}` : className

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
      <NextLink href={href} as={as}>
        <a className={style} {...props}>
          {children}
        </a>
      </NextLink>
    </>
  )
}

Link.displayName = 'Link'
export default memo(Link)
