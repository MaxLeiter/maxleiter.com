import { BlogPostContentClient } from './blog-post-content-client'
import { PostBody } from '@mdx/post-body'

interface BlogPostPreviewProps {
  slug: string
  title: string
  date: string
  description?: string
  content: string
}

export function BlogPostPreview({
  slug,
  title,
  date,
  description,
  content,
}: BlogPostPreviewProps) {
  return (
    <BlogPostContentClient
      slug={slug}
      title={title}
      date={date}
      description={description}
    >
      <PostBody>{content}</PostBody>
    </BlogPostContentClient>
  )
}
