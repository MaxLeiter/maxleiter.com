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
  tabIndex?: number
}
const Link = ({
  external,
  href,
  as,
  children,
  className,
  title,
  transition = true,
  tabIndex = 0,
  ...props
}: Props) => {
  const style = transition ? styles.transition + ` ${className}` : className

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className ? `${style} ${className}` : style}
        title={title}
        tabIndex={tabIndex}
        {...props}
      >
        {children}
      </a>
    )
  }

  return (
    <>
      <NextLink href={href} as={as}>
        <a className={className ? `${style} ${className}` : style} title={title} {...props} tabIndex={tabIndex}>
          {children}
        </a>
      </NextLink>
    </>
  )
}

export default memo(Link)
