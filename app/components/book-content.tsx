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
                className="w-32 h-auto rounded border border-white/10 shadow-lg m-0!"
              />
            </div>
          )}
          <div className="flex-1">
            {series && (
              <p className="text-white/40 font-mono text-sm mb-1">
                {series.name}
              </p>
            )}
            <h1 className="text-3xl font-mono font-bold text-white/90 mb-1 leading-tight">
              {title}
            </h1>
            <p className="text-lg text-white/70 font-mono mb-3">{author}</p>
            <span className="text-white/50 font-mono text-sm">
              Read {date}
            </span>
            {description && (
              <p className="text-gray-400 font-mono text-sm">{description}</p>
            )}
          </div>
        </div>

        {series && (
          <div className="mb-6 p-4 rounded-lg border border-white/10 bg-white/5">
            <h2 className="text-sm font-mono font-semibold text-white/70 mb-3 !pt-0">
              Books in this series
            </h2>
            <ol className="space-y-1">
              {series.books.map((book, index) => (
                <li
                  key={book.title}
                  className="text-sm font-mono text-white/60"
                >
                  {index + 1}. {book.title}
                </li>
              ))}
            </ol>
          </div>
        )}

        {body && (
          <div
            className="prose prose-invert prose-sm max-w-none
                        prose-headings:font-mono prose-headings:text-white/90
                        prose-p:text-white/80 prose-p:leading-relaxed
                        prose-a:text-blue-400 prose-a:no-underline hover:prose-a:text-blue-300
                        prose-code:text-white/90 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                        prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10
                        prose-img:rounded-lg prose-img:border prose-img:border-white/10
                        prose-blockquote:border-l-white/20 prose-blockquote:text-white/70
                        prose-strong:text-white/90 prose-strong:font-semibold
                        prose-ul:text-white/80 prose-ol:text-white/80
                        prose-li:text-white/80"
          >
            <PostBody>{body}</PostBody>
          </div>
        )}
      </article>
    </ViewTransitionWrapper>
  )
}
