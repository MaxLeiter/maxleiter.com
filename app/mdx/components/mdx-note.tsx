import Info from '@components/icons/info'
export function MDXNote({
  children,
  title,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <aside {...props} className="mdx-note">
      <div className="mdx-note-icon">
        <Info />
      </div>
      <div className="mdx-note-content">
        <b>{title ? title : 'Note:'}</b>
        {children}
      </div>
    </aside>
  )
}
