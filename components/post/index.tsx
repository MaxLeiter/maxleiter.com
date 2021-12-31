import Head from 'next/head'

import Navigation from './navigation'
import Page from '@components/page'
import styles from './post.module.css'
import type types from '@lib/types'

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
  next,
}: Props) => {
  return (
    <Page
      title={title}
      description={description}
      showHeaderTitle={false}
      image={!hidden ? `https://xn--hgi2158mjfa.vercel.app/${encodeURIComponent(title)}.png?theme=light&md=1&fontSize=80px&date=${encodeURIComponent(date)}` : undefined}
    >
      <Head>
        {hidden && <meta name="robots" content="noindex" />}
        {date && <meta name="date" content={date} />}
      </Head>

      <article
        dangerouslySetInnerHTML={{
          __html: `<span class="${styles.date}">${date}</span><h1 class="${
            styles.title
          }">${escapeHtml(title)}</h1>${html}`,
        }}
      />

      <Navigation previous={previous} next={next} />
    </Page>
  )
}

export default Post
