import type { ReactNode } from 'react'
import { transitionName } from '@framework/shared/transitions'
import { Reader } from '@components/blades/reader'
import { bladeById } from '@lib/blades/theme'

/**
 * Post and note pages: the dashboard's glass reader, in the blog blade's green
 * or the notes blade's blue.
 *
 * MDX is compiled once at build and the resulting element is passed in as
 * `content`. The article carries the view-transition name, so the homepage
 * preview or a section row morphs into it.
 */

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
    <Reader
      blade={bladeById('blog')}
      slug={slug}
      title={title}
      date={date}
      dateISO={dateISO}
      description={description}
      content={content}
      vtName={transitionName('blog', slug)}
      backHref={`/?item=${encodeURIComponent(slug)}`}
      url={`maxleiter.com/blog/${slug}`}
      chrome={toolbar}
    />
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
    <Reader
      blade={bladeById('notes')}
      slug={slug}
      title={title}
      date={date}
      dateISO={dateISO}
      description={description}
      kind={kind}
      content={content}
      vtName={transitionName('note', slug)}
      backHref={`/?blade=notes&item=${encodeURIComponent(slug)}`}
      url={`maxleiter.com/notes/${slug}`}
      chrome={toolbar}
    />
  )
}
