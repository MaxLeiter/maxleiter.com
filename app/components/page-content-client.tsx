'use client'

import { ViewTransitionWrapper } from './view-transition-wrapper'
import { AboutContent } from './content/about-content'
import { ProjectsContent } from './content/projects-content'
import { BlogListContent } from './content/blog-list-content'
import { LabsContent } from './content/labs-content'
import { TalksContent } from './content/talks-content'
import { NotesContent } from './content/notes-content'
import type { BlogPost, Project } from '@lib/portfolio-data'
import type { Note } from '@lib/types'

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

export function TalksContentClient() {
  return (
    <ViewTransitionWrapper name="page-talks">
      <TalksContent />
    </ViewTransitionWrapper>
  )
}

interface NotesContentClientProps {
  notes: Note[]
  onNoteClick?: (slug: string) => void
}

export function NotesContentClient({
  notes,
  onNoteClick,
}: NotesContentClientProps) {
  return (
    <ViewTransitionWrapper name="page-notes">
      <NotesContent notes={notes} onNoteClick={onNoteClick} />
    </ViewTransitionWrapper>
  )
}
