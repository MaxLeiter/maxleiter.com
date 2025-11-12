import { BlogPostContentClient } from './blog-post-content-client'

interface BlogPostPreviewProps {
  slug: string
  title: string
  date: string
  description?: string
  content: string
}

function extractPreview(content: string, maxChars: number = 600): string {
  // Extract first few paragraphs for preview, removing markdown syntax
  const paragraphs = content
    .split('\n\n')
    .filter(p => p.trim().length > 0)
    .map(p => p.replace(/[#*`_[\]()]/g, '').trim()) // Remove markdown syntax
    .filter(p => p.length > 0)

  let preview = ''

  for (const p of paragraphs) {
    if (preview.length + p.length > maxChars) break
    preview += p + '\n\n'
  }

  return preview.trim()
}

export function BlogPostPreview({
  slug,
  title,
  date,
  description,
  content,
}: BlogPostPreviewProps) {
  const preview = extractPreview(content)

  return (
    <BlogPostContentClient
      slug={slug}
      title={title}
      date={date}
      description={description}
    >
      <>
        {preview.split('\n\n').map((paragraph, i) => (
          <p key={i} className="mb-4 last:mb-0">
            {paragraph}
          </p>
        ))}
      </>
    </BlogPostContentClient>
  )
}
