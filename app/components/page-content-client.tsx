'use client'

import { ViewTransitionWrapper } from './view-transition-wrapper'
import { AboutContent } from './content/about-content'
import { ProjectsContent } from './content/projects-content'
import { BlogListContent } from './content/blog-list-content'
import { LabsContent } from './content/labs-content'
import { BooksContent } from './content/books-content'
import type { BlogPost, Project } from '@lib/portfolio-data'
import type { Book } from '@lib/types'

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
  onPostHover?: (slug: string) => void
  onPostHoverEnd?: () => void
}

export function BlogListContentClient({
  posts,
  onPostClick,
  onPostHover,
  onPostHoverEnd,
}: BlogListContentClientProps) {
  return (
    <ViewTransitionWrapper name="page-blog">
      <BlogListContent
        posts={posts}
        onPostClick={onPostClick}
        onPostHover={onPostHover}
        onPostHoverEnd={onPostHoverEnd}
      />
    </ViewTransitionWrapper>
  )
}

export function LabsContentClient() {
  return (
    <ViewTransitionWrapper name="page-labs">
      <LabsContent />
    </ViewTransitionWrapper>
  )
}

interface BooksContentClientProps {
  books: Book[]
  onBookClick?: (slug: string) => void
}

export function BooksContentClient({
  books,
  onBookClick,
}: BooksContentClientProps) {
  return (
    <ViewTransitionWrapper name="page-books">
      <BooksContent books={books} onBookClick={onBookClick} />
    </ViewTransitionWrapper>
  )
}
