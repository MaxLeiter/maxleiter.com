
import type types from '@lib/types'
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
  // hidden,
  // description,
  date,
  // previous,
  lastModified,
  // next,
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
    // <Page
    //   title={title}
    //   description={description}
    //   showHeaderTitle={false}
    //   header={false}
    //   image={
    //     !hidden
    //       ? `https://💻➡📸.vercel.app/${encodeURIComponent(
    //         title
    //       )}.png?theme=light&md=1&fontSize=75px&date=${encodeURIComponent(
    //         date
    //       )}`
    //       : undefined
    //   }
    // >
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
      <h1 className={styles.title}>{title}</h1>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
    // </Page>
  )
}

export default Post
