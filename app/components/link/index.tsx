import clsx from 'clsx'

// Class names from ./link.css, which is a pre-scoped plain sheet rather than a
// CSS module: the file-tree island needs `link` as a literal too.

type Props = React.ComponentProps<'a'> & {
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
  const className = clsx('link', underline && 'link-underline', classNameProp)

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
    <a
      href={href}
      title={title}
      className={className}
      {...props}
      tabIndex={tabIndex}
    >
      {children}
    </a>
  )
}

export default Link
