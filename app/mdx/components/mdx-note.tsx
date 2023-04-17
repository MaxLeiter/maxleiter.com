import Info from '@components/icons/info'
import styles from './mdx-note.module.css'
export function MDXNote({
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <aside {...props} className={styles.note}>
      <div className={styles.icon}>
        <Info />
      </div>
      <div className={styles.content}>
        <b>Note: </b>
        {children}
      </div>
    </aside>
  )
}
