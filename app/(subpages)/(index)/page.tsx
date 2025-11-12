import { DesktopClient } from '@components/desktop/desktop-client'
import {
  getBlogPosts,
  getProjectsData,
  ABOUT_CONTENT,
} from '@lib/portfolio-data'
import { PostBody } from '@mdx/post-body'

function extractPreview(content: string, maxChars: number = 1000): string {
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0)
  let preview = ''

  for (const p of paragraphs) {
    if (preview.length + p.length > maxChars) break
    preview += p + '\n\n'
  }

  return preview.trim()
}

export default async function Desktop() {
  const [blogPosts, projects] = await Promise.all([
    getBlogPosts(),
    getProjectsData(),
  ])

  // Pre-render MDX previews at build time
  const blogPostPreviews: Record<string, React.ReactNode> = {}
  for (const post of blogPosts) {
    const preview = extractPreview(post.content)
    blogPostPreviews[post.slug] = <PostBody>{preview}</PostBody>
  }

  return (
    <DesktopClient
      blogPosts={blogPosts}
      projects={projects}
      aboutContent={ABOUT_CONTENT}
      blogPostPreviews={blogPostPreviews}
    />
  )
}
