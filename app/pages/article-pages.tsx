import type { CSSProperties, ReactNode } from 'react'
import { Cover } from '@components/cover'
import { transitionName } from '@framework/shared/transitions'
import { PageShell } from './shell'

/**
 * Post and note pages: the glass reader panel with the cover the homepage tile
 * wears, then the full MDX body.
 *
 * MDX is compiled once at build and the resulting element is passed in as
 * `content`. The cover carries the view-transition name, so a tile on the
 * homepage or a card on `/blog` morphs into it across a navigation: they are
 * the same picture at the same aspect ratio.
 */

interface ArticleProps {
  seed: string
  section: 'Blog' | 'Note'
  title: string
  date: string
  dateISO: string
  description?: string
  content: ReactNode
  /** `note` pages show the note kind next to the date. */
  kind?: string
  vtName: string
}

function Article({
  seed,
  section,
  title,
  date,
  dateISO,
  description,
  content,
  kind,
  vtName,
}: ArticleProps) {
  return (
    <div className="ui-col">
      <header className="ui-head">
        <div
          className="ui-head-art"
          style={{ viewTransitionName: vtName } as CSSProperties}
        >
          <Cover
            seed={seed}
            title={title}
            meta={`${section}  ·  ${date}`.toUpperCase()}
            chip={section}
            eager
          />
        </div>
        <div className="ui-head-text">
          <p className="ui-kicker">
            <time dateTime={dateISO}>{date}</time>
            {kind && <span className="ui-kicker-tag">{kind}</span>}
          </p>
          <h1 className="ui-title">{title}</h1>
          {description && <p className="ui-lede">{description}</p>}
        </div>
      </header>

      <article className="ui-prose">{content}</article>

      <footer className="ui-foot">
        <p>
          Thanks for reading! If you want to see future content, you can follow
          me{' '}
          <a
            href="https://twitter.com/maxleiter"
            target="_blank"
            rel="noopener noreferrer"
          >
            on X
          </a>{' '}
          or subscribe to my <a href="/feed.xml">RSS feed</a>.
        </p>
      </footer>
    </div>
  )
}

export interface PostPageProps {
  slug: string
  title: string
  date: string
  dateISO: string
  description?: string
  content: ReactNode
  toolbar?: boolean
}

export function BlogPostPage({
  slug,
  title,
  date,
  dateISO,
  description,
  content,
  toolbar = true,
}: PostPageProps) {
  return (
    <PageShell
      section="blog"
      crumbs={[{ name: 'Blog', href: '/blog' }]}
      back={`/#t-blog-${slug}`}
      toolbar={toolbar}
    >
      <Article
        seed={`blog:${slug}`}
        section="Blog"
        title={title}
        date={date}
        dateISO={dateISO}
        description={description}
        content={content}
        vtName={transitionName('blog', slug)}
      />
    </PageShell>
  )
}

export interface NotePageProps extends PostPageProps {
  kind: string
}

export function NotePage({
  slug,
  title,
  date,
  dateISO,
  description,
  content,
  kind,
  toolbar = true,
}: NotePageProps) {
  return (
    <PageShell
      section="notes"
      crumbs={[{ name: 'Notes', href: '/notes' }]}
      back={`/#t-note-${slug}`}
      toolbar={toolbar}
    >
      <Article
        seed={`note:${slug}`}
        section="Note"
        title={title}
        date={date}
        dateISO={dateISO}
        description={description}
        content={content}
        kind={kind}
        vtName={transitionName('note', slug)}
      />
    </PageShell>
  )
}
