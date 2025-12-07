import { PostBody } from '@mdx/post-body'
import { ViewTransitionWrapper } from './view-transition-wrapper'
import type { Book } from '@lib/types'

type BookContentProps = Omit<Book, 'type'>

export function BookContent({
  slug,
  title,
  author,
  date,
  description,
  body,
  coverUrl,
  series,
}: BookContentProps) {
  return (
    <ViewTransitionWrapper name={`book-${slug}`}>
      <article className="max-w-3xl mx-auto">
        <div className="flex items-start gap-6 mb-6">
          {coverUrl && (
            <div className="flex-shrink-0">
              <img
                src={coverUrl}
                alt={`Cover of ${title}`}
                className="w-32 h-auto rounded border shadow-lg m-0!"
                style={{
                  borderColor: 'var(--border-color)',
                }}
              />
            </div>
          )}
          <div className="flex-1">
            {series && (
              <p className="font-mono text-sm mb-1" style={{ color: 'var(--fg)', opacity: 0.4 }}>
                {series.name}
              </p>
            )}
            <h1 className="text-3xl font-mono font-bold mb-1 leading-tight" style={{ color: 'var(--fg)', opacity: 0.9 }}>
              {title}
            </h1>
            <p className="text-lg font-mono mb-3" style={{ color: 'var(--fg)', opacity: 0.7 }}>{author}</p>
            <span className="font-mono text-sm" style={{ color: 'var(--fg)', opacity: 0.5 }}>
              Read {date}
            </span>
            {description && (
              <p className="font-mono text-sm" style={{ color: 'var(--fg)', opacity: 0.5 }}>{description}</p>
            )}
          </div>
        </div>

        {series && (
          <div
            className="mb-6 p-4 rounded-lg border"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'rgba(229, 229, 229, 0.05)',
            }}
          >
            <h2 className="text-sm font-mono font-semibold mb-3 !pt-0" style={{ color: 'var(--fg)', opacity: 0.7 }}>
              Books in this series
            </h2>
            <ol className="space-y-1">
              {series.books.map((book, index) => (
                <li
                  key={book.title}
                  className="text-sm font-mono"
                  style={{ color: 'var(--fg)', opacity: 0.6 }}
                >
                  {index + 1}. {book.title}
                </li>
              ))}
            </ol>
          </div>
        )}

        {body && (
          <div
            className="prose prose-sm max-w-none
                        prose-headings:font-mono prose-headings:leading-tight
                        prose-p:leading-relaxed
                        prose-a:no-underline
                        prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                        prose-pre:border
                        prose-img:rounded-lg prose-img:border
                        prose-strong:font-semibold"
            style={{
              '--tw-prose-body': 'var(--fg)',
              '--tw-prose-headings': 'var(--fg)',
              '--tw-prose-lead': 'var(--fg)',
              '--tw-prose-links': 'var(--link)',
              '--tw-prose-bold': 'var(--fg)',
              '--tw-prose-counters': 'var(--fg)',
              '--tw-prose-bullets': 'var(--fg)',
              '--tw-prose-hr': 'var(--border-color)',
              '--tw-prose-quotes': 'var(--fg)',
              '--tw-prose-quote-borders': 'var(--border-color)',
              '--tw-prose-captions': 'var(--fg)',
              '--tw-prose-code': 'var(--fg)',
              '--tw-prose-pre-code': 'var(--fg)',
              '--tw-prose-pre-bg': 'rgba(229, 229, 229, 0.05)',
              '--tw-prose-pre-border': 'var(--border-color)',
              '--tw-prose-th-borders': 'var(--border-color)',
              '--tw-prose-td-borders': 'var(--border-color)',
            } as any}
          >
            <PostBody>{body}</PostBody>
          </div>
        )}
      </article>
    </ViewTransitionWrapper>
  )
}
