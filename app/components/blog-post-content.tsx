import { PostBody } from '@mdx/post-body'
import { ViewTransitionWrapper } from './view-transition-wrapper'

interface BlogPostContentProps {
  slug: string
  title: string
  date: string
  description?: string
  body: string
  lastModified?: number
}

export function BlogPostContent({
  slug,
  title,
  date,
  description,
  body,
  lastModified,
}: BlogPostContentProps) {
  const lastModifiedDate = lastModified
    ? new Date(lastModified).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <ViewTransitionWrapper name={`blog-post-${slug}`}>
      <article className="max-w-3xl mx-auto">
        <div className="mb-1">
          <span className="font-mono text-sm" style={{ color: 'var(--gray)' }}>{date}</span>
          {lastModifiedDate && (
            <span className="font-mono text-xs ml-4" style={{ color: 'var(--gray)' }}>
              Last modified {lastModifiedDate}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-mono font-bold mb-2! mt-2! leading-10" style={{ color: 'var(--article-color)' }}>
          {title}
        </h1>
        {description && (
          <p className="font-mono text-base mb-4 mt-0!" style={{ color: 'var(--article-color)' }}>
            {description}
          </p>
        )}

        <div
          className="prose prose-sm max-w-none dark:prose-invert
                        prose-headings:font-mono
                        prose-p:leading-relaxed
                        prose-a:no-underline
                        prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                        prose-pre:border
                        prose-img:rounded-lg prose-img:border
                        prose-strong:font-semibold"
          style={{
            '--prose-headings': 'var(--article-color)',
            '--prose-body': 'var(--article-color)',
            '--prose-links': 'var(--link)',
            '--prose-code': 'var(--article-color)',
            '--prose-pre-bg': 'var(--lighter-gray)',
            '--prose-pre-border': 'var(--border-color)',
            '--prose-blockquote-border': 'var(--light-gray)',
            '--prose-blockquote-text': 'var(--gray)',
            '--prose-img-border': 'var(--border-color)',
          } as React.CSSProperties}
        >
          <PostBody>{body}</PostBody>
        </div>
      </article>
    </ViewTransitionWrapper>
  )
}
