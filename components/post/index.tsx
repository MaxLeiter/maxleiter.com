import Head from 'next/head'
import { useEffect, useState } from 'react'

import Navigation from './navigation'
import Page from '@components/page'
import styles from './post.module.css'
import type types from '@lib/types'
import PostFooter from '@components/post-footer'
import supabase from '@lib/supabase/public'
import FadeIn from '@components/fade-in'

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
  slug,
  views
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
  const [updatedViews, setViews] = useState<number>()
  const [id, setId] = useState<number>()

  // Subscribe to view updates
  useEffect(() => {
    const sub = supabase
      .from('analytics')
      .on('UPDATE', (payload) => {
        if (payload.new.id === id) {
          const newViews = payload.new.view_count
          setViews(newViews)
        }
      })
      .subscribe()

    return () => {
      sub.unsubscribe()
    }
  }, [id])

  useEffect(() => {
    if (views && !updatedViews) {
      setViews(views)
    }
  }, [views, updatedViews])

  // Update view count, as the post view count from props is from the last time the page was built
  useEffect(() => {
    supabase.from('analytics').select('view_count, id').filter('slug', 'eq', `/blog/${slug}`).then((res) => {
      if (res.body?.length) {
        setId(res.data[0].id)
        setViews(res.body[0].view_count)
      }
    })
  }, [slug])

  return (
    <Page
      title={title}
      description={description}
      showHeaderTitle={false}
      image={
        !hidden
          ? `https://💻➡📸.vercel.app/${encodeURIComponent(
            title
          )}.png?theme=light&md=1&fontSize=75px&date=${encodeURIComponent(
            date
          )}`
          : undefined
      }
    >
      <Head>
        {hidden && <meta name="robots" content="noindex" />}
        {date && <meta name="date" content={date} />}
      </Head>

      <article>
        <div className={styles.wrapper}>
          <span className={styles.date}>
            {date} {isDateDifferent && (
              <span className={styles.modified}>
                last modified {formattedLastModifiedDate}
              </span>
            )}
          </span>
          <FadeIn>{updatedViews} views</FadeIn>
        </div>
        <h1 className={styles.title}>{title}</h1>
        <div
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
      <PostFooter />
      <Navigation previous={previous} next={next} />
    </Page>
  )
}

export default Post
