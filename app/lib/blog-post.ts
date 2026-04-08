export interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
  href?: string
  isThirdParty?: boolean
  type: 'post' | 'note'
}

export interface Project {
  id: string
  name: string
  description: string
  link: string
  tech: string[]
  content: string
}

export function getBlogPostHref(post: BlogPost): string {
  if (post.isThirdParty && post.href) return post.href
  return post.type === 'note' ? `/notes/${post.slug}` : `/blog/${post.slug}`
}
