import { AboutContent } from '@components/content/about-content'
import { LabsContent } from '@components/content/labs-content'
import { TalksContent } from '@components/content/talks-content'
import { ProjectsContent } from '@components/content/projects-content'
import { BlogListContent } from '@components/content/blog-list-content'
import { NotesContent } from '@components/content/notes-content'
import type { BlogPost, Project } from '@lib/blog-post'
import type { Note } from '../../framework/types'
import { PageShell } from './shell'

/**
 * The six list-and-prose routes.
 *
 * Each reuses the existing component under `app/components/content/`, so the
 * markup matches what the Next build produced. The one difference is where the
 * view-transition name lands: React's `<ViewTransition>` put it on the content
 * component's own root element, and these put it on `<main>`, because the
 * content components do not take a style prop.
 *
 * All six take `toolbar` so the build can emit an `/embed` variant with no
 * chrome. The desktop's folder windows iframe those, which keeps the window
 * content byte-identical to the real page at zero client-JS cost.
 */

export interface ContentPageProps {
  toolbar?: boolean
}

export function AboutPage({ toolbar }: ContentPageProps) {
  return (
    <PageShell
      toolbar={toolbar}
      title="about"
      segments={[{ name: 'about', href: '/about' }]}
      vtName="page-about"
    >
      <AboutContent />
    </PageShell>
  )
}

export function LabsPage({ toolbar }: ContentPageProps) {
  return (
    <PageShell
      toolbar={toolbar}
      title="labs"
      segments={[{ name: 'labs', href: '/labs' }]}
      vtName="page-labs"
    >
      <LabsContent />
    </PageShell>
  )
}

export function TalksPage({ toolbar }: ContentPageProps) {
  return (
    <PageShell
      toolbar={toolbar}
      title="talks"
      segments={[{ name: 'talks', href: '/talks' }]}
      vtName="page-talks"
    >
      <TalksContent />
    </PageShell>
  )
}

export function ProjectsPage({
  projects,
  toolbar,
}: ContentPageProps & { projects: Project[] }) {
  return (
    <PageShell
      toolbar={toolbar}
      title="projects"
      segments={[{ name: 'projects', href: '/projects' }]}
      vtName="page-projects"
    >
      <ProjectsContent projects={projects} />
    </PageShell>
  )
}

export function BlogIndexPage({
  posts,
  toolbar,
}: ContentPageProps & { posts: BlogPost[] }) {
  return (
    <PageShell
      toolbar={toolbar}
      title="blog"
      segments={[{ name: 'blog', href: '/blog' }]}
      vtName="page-blog"
    >
      <BlogListContent posts={posts} />
    </PageShell>
  )
}

export function NotesIndexPage({
  notes,
  toolbar,
}: ContentPageProps & { notes: Note[] }) {
  return (
    <PageShell
      toolbar={toolbar}
      title="notes"
      segments={[{ name: 'notes', href: '/notes' }]}
      vtName="page-notes"
    >
      <NotesContent notes={notes} />
    </PageShell>
  )
}

export function NotFoundPage() {
  return (
    <PageShell title="404" vtName="page-404">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-mono font-bold mb-8 text-[var(--fg)]">
          404
        </h1>
        <p className="text-[var(--gray)]">
          That page does not exist.{' '}
          <a
            href="/"
            className="text-[var(--link)] hover:opacity-80 underline transition-opacity"
          >
            Go home
          </a>
          .
        </p>
      </div>
    </PageShell>
  )
}
