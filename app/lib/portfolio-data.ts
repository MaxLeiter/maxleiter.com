// Unified data structure for blog posts and projects
// Used by terminal, blog page, projects page, and desktop

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

function convertToBlogPost(post: Post): BlogPost | null {
  if (!post.slug) return null

  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    excerpt: post.description,
    content: post.body,
  }
}

// Convert your Project type to desktop OS Project format
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

export async function getBlogPosts(): Promise<BlogPost[]> {
  const posts = await getPosts(false)
  return posts
    .map(convertToBlogPost)
    .filter((post): post is BlogPost => post !== null)
}

export async function getProjectsData(): Promise<Project[]> {
  const projects = await getProjects()
  return projects.map(convertToProject)
}

export const ABOUT_CONTENT = {
  bio: {
    content: `I'm currently building v0 at Vercel. I'm interested in politics, tech, and building a fast, accessible web.`,
    title: 'About',
    links: [
      { text: 'v0.app', url: 'https://v0.app' },
      { text: 'vercel.com', url: 'https://vercel.com' },
    ],
  },
}
