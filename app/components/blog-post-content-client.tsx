"use client"

import { ViewTransitionWrapper } from './view-transition-wrapper'
import { useRouter } from 'next/navigation'
import { startTransition } from 'react'

interface BlogPostContentClientProps {
  slug: string
  title: string
  date: string
  description?: string
  content: string
}

function extractPreview(content: string, maxChars: number = 800): string {
  // Simple text extraction - get first few paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0)
  let preview = ''

  for (const p of paragraphs) {
    if (preview.length + p.length > maxChars) break
    preview += p + '\n\n'
  }

  return preview.trim()
}

export function BlogPostContentClient({
  slug,
  title,
  date,
  description,
  content,
}: BlogPostContentClientProps) {
  const router = useRouter()
  const preview = extractPreview(content)

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

        <div className="prose prose-invert prose-sm max-w-none mt-6 prose-headings:font-mono prose-headings:text-white/90 prose-p:text-white/80 prose-p:leading-relaxed">
          <div className="whitespace-pre-wrap text-white/80 leading-relaxed">
            {preview}
          </div>
        </div>

        <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-lg">
          <p className="text-white/70 font-mono text-sm mb-4">
            Continue reading the full article...
          </p>
          <button
            onClick={() => {
              startTransition(() => {
                router.push(`/blog/${slug}`)
              })
            }}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white/90 px-4 py-2 rounded-lg font-mono text-sm transition-colors"
          >
            Read Full Article →
          </button>
        </div>
      </article>
    </ViewTransitionWrapper>
  )
}
