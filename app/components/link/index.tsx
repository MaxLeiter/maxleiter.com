import { memo } from 'react'
import NextLink from 'next/link'

import styles from './link.module.css'

// Inherit default link props from NextLink or <a>
type LinkProps = React.ComponentProps<typeof NextLink>
type Props = LinkProps & {
  external?: boolean
  href: string
  as?: string
  title?: string
  children: React.ReactNode
  className?: string
  noLinkClass?: boolean
  tabIndex?: number
}

const Link = ({
  external,
  href,
  as,
  children,
  className = 'link',
  title,
  noLinkClass = false,
  tabIndex = 0,
  ...props
}: Props) => {
  const style = noLinkClass ? className : `${styles.link} ${className}`

  if (external) {
    return (
      <NextLink
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={style}
        title={title}
        tabIndex={tabIndex}
        {...props}
      >
        {children}
      </NextLink>
    )
  }

  return (
    <NextLink
      href={href}
      as={as}
      title={title}
      className={style}
      {...props}
      tabIndex={tabIndex}
    >
      {children}
    </NextLink>
  )
}

export default memo(Link)
