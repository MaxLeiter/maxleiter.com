import {
  getBlogPosts,
  getProjectsData,
  getBlogPostHref,
} from '@lib/portfolio-data'

// Prerendered at build time into a static JSON file. The command palette
// fetches this on first open instead of every page carrying the full post and
// project list in its RSC payload.
export const dynamic = 'force-static'

export interface SearchIndexItem {
  type: 'blog' | 'note' | 'project'
  title: string
  href: string
  external: boolean
}

export async function GET() {
  const [posts, projects] = await Promise.all([
    getBlogPosts(),
    getProjectsData(),
  ])

  const items: SearchIndexItem[] = [
    ...posts.map((post) => {
      const href = getBlogPostHref(post)
      return {
        type: post.type === 'note' ? ('note' as const) : ('blog' as const),
        title: post.title,
        href,
        external: href.startsWith('http'),
      }
    }),
    ...projects.map((project) => ({
      type: 'project' as const,
      title: project.name,
      href: project.link && project.link !== '#' ? project.link : '/projects',
      external: Boolean(project.link && project.link.startsWith('http')),
    })),
  ]

  return Response.json(items)
}
