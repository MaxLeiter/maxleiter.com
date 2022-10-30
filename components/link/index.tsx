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
  transition?: boolean
  tabIndex?: number
}

const Link = ({
  external,
  href,
  as,
  children,
  className = 'link',
  title,
  transition = true,
  tabIndex = 0,
  ...props
}: Props) => {
  const style = transition ? styles.transition + ` ${className}` : className

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
