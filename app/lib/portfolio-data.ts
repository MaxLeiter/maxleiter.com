import { getPosts } from './get-posts'
import { getProjects } from './projects'
import type { Post, Project as ProjectType } from './types'

export interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
}

export interface Project {
  id: string
  name: string
  description: string
  link: string
  tech: string[]
  content: string
}

function convertToBlogPost(post: Post, includeContent: boolean = false): BlogPost | null {
  if (!post.slug) return null

  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    excerpt: post.description,
    content: includeContent ? post.body : '',
  }
}

function convertToProject(project: ProjectType, index: number): Project {
  return {
    id: project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: project.title,
    description: project.description,
    link: project.href || '#',
    tech: project.years || [],
    content: `${project.title}\n\n${project.description}\n\nRole: ${project.role}\nYears: ${project.years.join(', ')}`,
  }
}

export async function getBlogPosts(opts?: { includeContent?: boolean }): Promise<BlogPost[]> {
  const posts = await getPosts(false)
  const includeContent = opts?.includeContent ?? false
  return posts
    .map(post => convertToBlogPost(post, includeContent))
    .filter((post): post is BlogPost => post !== null)
}

export async function getProjectsData(): Promise<Project[]> {
  const projects = await getProjects()
  return projects
    .map(convertToProject)
    .sort((a, b) => {
      // Get the most recent year from each project
      const getLatestYear = (tech: string[]) => {
        if (tech.includes('present')) return Infinity
        const years = tech.map(y => parseInt(y)).filter(y => !isNaN(y))
        return years.length > 0 ? Math.max(...years) : 0
      }

      const yearA = getLatestYear(a.tech)
      const yearB = getLatestYear(b.tech)

      // Sort descending (newest first)
      return yearB - yearA
    })
}

export { ABOUT_CONTENT } from './about-content'
