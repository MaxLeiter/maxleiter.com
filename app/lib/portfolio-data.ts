import { getPosts } from './get-posts'
import getNotes from './get-notes'
import { getProjects } from './projects'
import type { Post, Note, Project as ProjectType } from './types'

export type { BlogPost, Project } from './blog-post'
export { getBlogPostHref } from './blog-post'

import type { BlogPost, Project } from './blog-post'

function convertToBlogPost(
  post: Post,
  includeContent: boolean = false,
): BlogPost | null {
  // For third-party posts, use the href as a pseudo-slug for identification
  const slug = post.slug || (post.isThirdParty && post.href ? post.href : '')
  if (!slug) return null

  return {
    slug,
    title: post.title,
    date: post.date,
    excerpt: post.description,
    content: includeContent ? post.body : '',
    href: post.href,
    isThirdParty: post.isThirdParty,
    type: 'post',
  }
}

function convertNoteToBlogPost(
  note: Note,
  includeContent: boolean = false,
): BlogPost {
  return {
    slug: note.slug,
    title: note.title,
    date: note.date,
    excerpt: note.description,
    content: includeContent ? note.body : '',
    type: 'note',
  }
}

function convertToProject(project: ProjectType): Project {
  return {
    id: project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: project.title,
    description: project.description,
    link: project.href || '#',
    tech: project.years || [],
    content: `${project.title}\n\n${project.description}\n\nRole: ${project.role}\nYears: ${project.years.join(', ')}`,
  }
}

export async function getBlogPosts(opts?: {
  includeContent?: boolean
}): Promise<BlogPost[]> {
  const includeContent = opts?.includeContent ?? false
  const [posts, notes] = await Promise.all([getPosts(true), getNotes()])

  const blogPosts = posts
    .map((post) => convertToBlogPost(post, includeContent))
    .filter((post): post is BlogPost => post !== null)

  const notePosts = notes.map((note) =>
    convertNoteToBlogPost(note, includeContent),
  )

  return [...blogPosts, ...notePosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}

export async function getProjectsData(): Promise<Project[]> {
  const projects = await getProjects()
  return projects.map(convertToProject).sort((a, b) => {
    // Get the most recent year from each project
    const getLatestYear = (tech: string[]) => {
      if (tech.includes('present')) return Infinity
      const years = tech.map((y) => parseInt(y)).filter((y) => !isNaN(y))
      return years.length > 0 ? Math.max(...years) : 0
    }

    const yearA = getLatestYear(a.tech)
    const yearB = getLatestYear(b.tech)

    // Sort descending (newest first)
    return yearB - yearA
  })
}

export { ABOUT_CONTENT } from './about-content'
