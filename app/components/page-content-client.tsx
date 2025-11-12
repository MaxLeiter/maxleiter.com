'use client'

import { ViewTransitionWrapper } from './view-transition-wrapper'
import { AboutContent } from './content/about-content'
import { ProjectsContent } from './content/projects-content'
import { BlogListContent } from './content/blog-list-content'
import type { BlogPost, Project } from '@lib/portfolio-data'

export function AboutContentClient() {
  return (
    <ViewTransitionWrapper name="page-about">
      <AboutContent />
    </ViewTransitionWrapper>
  )
}

interface ProjectsContentClientProps {
  projects: Project[]
}

export function ProjectsContentClient({
  projects,
}: ProjectsContentClientProps) {
  return (
    <ViewTransitionWrapper name="page-projects">
      <ProjectsContent projects={projects} />
    </ViewTransitionWrapper>
  )
}

interface BlogListContentClientProps {
  posts: BlogPost[]
  onPostClick?: (slug: string) => void
}

export function BlogListContentClient({
  posts,
  onPostClick,
}: BlogListContentClientProps) {
  return (
    <ViewTransitionWrapper name="page-blog">
      <BlogListContent posts={posts} onPostClick={onPostClick} />
    </ViewTransitionWrapper>
  )
}
