import type { CSSProperties, ReactNode } from 'react'
import { transitionName } from '@framework/shared/transitions'
import { PageShell } from './shell'

/**
 * Post and note pages.
 *
 * `PostBody` is gone: MDX is compiled once at build and the resulting element
 * is passed in as `content`. The article carries the view-transition name that
 * React's `<ViewTransition>` used to apply, so a card on `/blog` can still morph
 * into the article across a cross-document navigation.
 */

const PROSE_CLASS = `prose prose-sm max-w-none dark:prose-invert
                        prose-headings:font-mono
                        prose-p:leading-relaxed
                        prose-a:no-underline
                        prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                        prose-pre:border
                        prose-img:rounded-lg prose-img:border
                        prose-strong:font-semibold`

const PROSE_VARS = {
  '--prose-headings': 'var(--article-color)',
  '--prose-body': 'var(--article-color)',
  '--prose-links': 'var(--link)',
  '--prose-code': 'var(--article-color)',
  '--prose-pre-bg': 'var(--lighter-gray)',
  '--prose-pre-border': 'var(--border-color)',
  '--prose-blockquote-border': 'var(--light-gray)',
  '--prose-blockquote-text': 'var(--gray)',
  '--prose-img-border': 'var(--border-color)',
} as CSSProperties

interface ArticleProps {
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
  title,
  date,
  dateISO,
  description,
  content,
  kind,
  vtName,
}: ArticleProps) {
  return (
    <article
      className="max-w-3xl mx-auto"
      style={{ viewTransitionName: vtName } as CSSProperties}
    >
      <div className="mb-1">
        <time
          className="font-mono text-sm"
          style={{ color: 'var(--gray)' }}
          dateTime={dateISO}
        >
          {date}
        </time>
        {kind && (
          <span
            className="font-mono text-xs ml-4 capitalize"
            style={{ color: 'var(--gray)' }}
          >
            {kind}
          </span>
        )}
      </div>

      <h1
        className="text-3xl font-mono font-bold mb-2! mt-2! leading-10"
        style={{ color: 'var(--article-color)' }}
      >
        {title}
      </h1>
      {description && (
        <p
          className="font-mono text-base mb-4 mt-0!"
          style={{ color: 'var(--article-color)' }}
        >
          {description}
        </p>
      )}

      <div className={PROSE_CLASS} style={PROSE_VARS}>
        {content}
      </div>
    </article>
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
      title={title}
      segments={[
        { name: 'blog', href: '/blog' },
        { name: slug, href: `/blog/${slug}` },
      ]}
      minimizeHref={`/?openPost=${slug}`}
      toolbar={toolbar}
    >
      <Article
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
      title={title}
      segments={[
        { name: 'notes', href: '/notes' },
        { name: slug, href: `/notes/${slug}` },
      ]}
      minimizeHref={`/?openPost=${slug}`}
      toolbar={toolbar}
    >
      <Article
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
