import { memo } from 'react'
import NextLink from 'next/link'

import styles from './link.module.css'

type Props = {
  external?: boolean
  href: string
  as?: string
  title?: string
  children: React.ReactNode
  className?: string
  transition?: boolean
}
const Link = ({
  external,
  href,
  as,
  children,
  className,
  title,
  transition = true,
  ...props
}: Props) => {
  const style = transition ? styles.transition + ` ${className}` : className

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={style}
        title={title}
        {...props}
      >
        {children}
      </a>
    )
  }

  return (
    <>
      <NextLink href={href} as={as}>
        <a className={style} title={title} {...props}>
          {children}
        </a>
      </NextLink>
    </>
  )
}

Link.displayName = 'Link'
export default memo(Link)
