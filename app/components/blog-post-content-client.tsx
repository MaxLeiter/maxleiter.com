import { ViewTransitionWrapper } from './view-transition-wrapper'

interface BlogPostContentClientProps {
  slug: string
  title: string
  date: string
  description?: string
  children: React.ReactNode
}

export function BlogPostContentClient({
  slug,
  title,
  date,
  description,
  children,
}: BlogPostContentClientProps) {
  return (
    <ViewTransitionWrapper name={`blog-post-${slug}`}>
      <article className="max-w-3xl mx-auto">
        <div className="mb-1">
          <span className="text-white/50 font-mono text-sm">{date}</span>
        </div>

        <h1 className="text-3xl font-mono font-bold text-white/90 mb-2! mt-2! leading-10">
          {title}
        </h1>
        {description && (
          <p className="text-gray-400 font-mono text-base mb-4 mt-0!">
            {description}
          </p>
        )}

        <div
          className="prose prose-invert prose-sm max-w-none mt-6
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
          {children}
        </div>
      </article>
    </ViewTransitionWrapper>
  )
}
