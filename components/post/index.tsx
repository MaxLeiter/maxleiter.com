import Head from 'next/head'

import Navigation from './navigation'
import Page from '@components/page'
import styles from './post.module.css'
import type types from '@lib/types'
import PostFooter from '@components/post-footer'

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

type Props = types.Post & {
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
}: Props) => {
  const postDate = new Date(date)
  const lastModifiedDate = lastModified ? new Date(lastModified) : undefined
  const isDateDifferent = lastModifiedDate && lastModifiedDate.getDate() !== postDate.getDate()
  const formattedLastModifiedDate = lastModifiedDate?.toLocaleDateString('default', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Page
      title={title}
      description={description}
      showHeaderTitle={false}
      image={!hidden ? `https://💻➡📸.vercel.app/${encodeURIComponent(title)}.png?theme=light&md=1&fontSize=75px&date=${encodeURIComponent(date)}` : undefined}
    >
      <Head>
        {hidden && <meta name="robots" content="noindex" />}
        {date && <meta name="date" content={date} />}
      </Head>

      <article
        dangerouslySetInnerHTML={{
          __html: `<span class="${styles.date}">${date} ${isDateDifferent ? `<span class="${styles.modified}">last modified ${formattedLastModifiedDate}` : ""}</span></span><h1 class="${
            styles.title
          }">${escapeHtml(title)}</h1>${html}`,
        }}
      />
      <PostFooter />
      <Navigation previous={previous} next={next} />
    </Page>
  )
}

export default Post
