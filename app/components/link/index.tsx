import NextLink from 'next/link'

import { cn } from '@lib/utils'

// Inherit default link props from NextLink or <a>
type LinkProps = React.ComponentProps<typeof NextLink>
type Props = LinkProps & {
  external?: boolean
  href: string
  title?: string
  children: React.ReactNode
  className?: string
  underline?: boolean
  tabIndex?: number
}

const Link = ({
  external,
  href,
  children,
  className: classNameProp = '',
  title,
  underline = true,
  tabIndex = 0,
  ...props
}: Props) => {
  const className = cn(
    "text-blue-500 ",
    underline && "underline decoration-current",
    classNameProp
  )

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={title}
        tabIndex={tabIndex}
        {...props}
      >
        {children}
      </a>
    )
  }

  return (
    <NextLink
      href={href}
      title={title}
      className={className}
      {...props}
      tabIndex={tabIndex}
    >
      {children}
    </NextLink>
  )
}

export default Link
