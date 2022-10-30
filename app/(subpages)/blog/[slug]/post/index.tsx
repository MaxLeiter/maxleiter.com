import PostFooter from './post-footer'
import type types from '@lib/types'
import Navigation from './navigation'
import styles from './post.module.css'

export type PostProps = Omit<types.Post, 'body'> & {
  previous?: types.Post
  next?: types.Post
  html: string
  hidden?: boolean
}

const Post = ({
  title,
  html,
  date,
  previous,
  lastModified,
  next,
}: PostProps) => {
  const postDate = new Date(date)
  const lastModifiedDate = lastModified ? new Date(lastModified) : undefined
  const isDateDifferent =
    lastModifiedDate && lastModifiedDate.getDate() !== postDate.getDate()
  const formattedLastModifiedDate = lastModifiedDate?.toLocaleDateString(
    'default',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )

  return (
    <>
      <div className={styles.wrapper}>
        <span className={styles.date}>
          {date}{' '}
          {isDateDifferent && (
            <span className={styles.modified}>
              last modified {formattedLastModifiedDate}
            </span>
          )}
        </span>
        {/* {updatedViews && <FadeIn>{updatedViews} views</FadeIn>} */}
      </div>
      {/* <div className={styles.header}>
        <Tooltip text={'Navigate home'}>
          <Link href="/">
            <a className={`${socialStyles.icon} ${styles.icon}`}>
              <Home size={28} />
            </a>
          </Link>
        </Tooltip>
        <ThemeSwitcher className={styles.icon} iconSize={28} />
      </div> */}
      <h1 className={styles.title}>{title}</h1>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <PostFooter />
      <Navigation previous={previous} next={next} />
    </>
  )
}

export default Post