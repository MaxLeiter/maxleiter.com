import Head from 'next/head'
import Link from 'next/link'

import Navigation from './navigation'
import Page from '@components/page'
import styles from './post.module.css'
import type types from '@lib/types'
import PostFooter from '@components/post-footer'
import socialStyles from '@components/socials/socials.module.css'
import Home from '@components/icons/home'
import ThemeSwitcher from '@components/theme-switcher'
import Tooltip from '@components/tooltip'

export type PostProps = types.Post & {
  previous?: types.Post
  next?: types.Post
  html: string
  hidden: boolean
}

const Post = ({
  title,
  html,
  hidden,
  description,
  date,
  previous,
  lastModified,
  next,
}: // slug,
  PostProps) => {
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
  // const [updatedViews, setViews] = useState<number>()
  // const [id, setId] = useState<number>()

  // Subscribe to view updates
  // useEffect(() => {
  //   const sub = supabase
  //     .from('analytics')
  //     .on('UPDATE', (payload) => {
  //       if (payload.new.id === id) {
  //         const newViews = payload.new.view_count
  //         setViews(newViews)
  //       }
  //     })
  //     .subscribe()

  //   return () => {
  //     sub.unsubscribe()
  //   }
  // }, [id])

  // Update view count, as the post view count from props is from the last time the page was built
  // useEffect(() => {
  //   supabase.from('analytics').select('view_count, id').filter('slug', 'eq', `/blog/${slug}`).then((res) => {
  //     if (res.body?.length) {
  //       setId(res.data[0].id)
  //       setViews(res.body[0].view_count)
  //     }
  //   })
  // }, [slug])

  return (
    <Page
      title={title}
      description={description}
      showHeaderTitle={false}
      header={false}
      image={
        !hidden
          ? `/api/og?title=${encodeURIComponent(title)}&date=${encodeURIComponent(
            postDate
              .toLocaleDateString('default', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
              .replace(',', '')
          )}`
          : undefined
      }
    >
      <Head>
        {hidden && <meta name="robots" content="noindex" />}
        {date && <meta name="date" content={date} />}
      </Head>

      <div className={styles.header}>
        <Tooltip text={'Navigate home'}>
          <Link href="/">
            <a className={`${socialStyles.icon} ${styles.icon}`}>
              <Home />
            </a>
          </Link>
        </Tooltip>
        <ThemeSwitcher className={styles.icon} />
      </div>

      <article>
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
        <h1 className={styles.title}>{title}</h1>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>
      <PostFooter />
      <Navigation previous={previous} next={next} />
    </Page>
  )
}

export default Post
