import { AboutContent } from '@components/content/about-content'
import { LabsContent } from '@components/content/labs-content'
import { TalksContent } from '@components/content/talks-content'
import { ProjectsContent } from '@components/content/projects-content'
import { BlogListContent } from '@components/content/blog-list-content'
import { NotesContent } from '@components/content/notes-content'
import type { ListEntry, ProjectCard } from '@lib/types'
import type { ComponentType } from 'react'
import type { Note } from '@framework/shared/types'
import { PageShell, type Section } from './shell'
import { transitionName } from '@framework/shared/transitions'

/**
 * The six list-and-prose routes, each a section of the homepage's channels
 * opened into the reader panel. Back returns to that section's row.
 *
 * All six take `toolbar` so the build can emit an `/embed` variant with no
 * chrome.
 */

export interface ContentPageProps {
  toolbar?: boolean
}

interface SectionSpec {
  section: Section
  name: string
  path: string
  /** The homepage row this page belongs to. */
  row: string
}

function sectionShell(spec: SectionSpec, toolbar: boolean | undefined) {
  return {
    toolbar,
    section: spec.section,
    crumbs: [{ name: spec.name, href: spec.path, current: true }],
    back: `/#ch-${spec.row}`,
    vtName: transitionName('page', spec.path.slice(1)),
  }
}

/**
 * `/about`, `/labs` and `/talks` take no data. One function applied three
 * times rather than three copies of the same eleven lines.
 */
function sectionPage(spec: SectionSpec, Content: ComponentType) {
  return function SectionPage({ toolbar }: ContentPageProps) {
    return (
      <PageShell {...sectionShell(spec, toolbar)}>
        <Content />
      </PageShell>
    )
  }
}

export const AboutPage = sectionPage(
  { section: 'about', name: 'About', path: '/about', row: 'about' },
  AboutContent,
)
export const LabsPage = sectionPage(
  { section: 'labs', name: 'Labs', path: '/labs', row: 'projects' },
  LabsContent,
)
export const TalksPage = sectionPage(
  { section: 'talks', name: 'Talks', path: '/talks', row: 'about' },
  TalksContent,
)

export function ProjectsPage({
  projects,
  toolbar,
}: ContentPageProps & { projects: ProjectCard[] }) {
  const spec = {
    section: 'projects',
    name: 'Projects',
    path: '/projects',
    row: 'projects',
  } as const
  return (
    <PageShell {...sectionShell(spec, toolbar)}>
      <ProjectsContent projects={projects} />
    </PageShell>
  )
}

export function BlogIndexPage({
  posts,
  toolbar,
}: ContentPageProps & { posts: ListEntry[] }) {
  const spec = {
    section: 'blog',
    name: 'Blog',
    path: '/blog',
    row: 'blog',
  } as const
  return (
    <PageShell {...sectionShell(spec, toolbar)}>
      <BlogListContent posts={posts} />
    </PageShell>
  )
}

export function NotesIndexPage({
  notes,
  toolbar,
}: ContentPageProps & { notes: Note[] }) {
  const spec = {
    section: 'notes',
    name: 'Notes',
    path: '/notes',
    row: 'notes',
  } as const
  return (
    <PageShell {...sectionShell(spec, toolbar)}>
      <NotesContent notes={notes} />
    </PageShell>
  )
}

export function NotFoundPage() {
  return (
    <PageShell
      section="home"
      crumbs={[{ name: '404', href: '/404', current: true }]}
      back="/"
      vtName={transitionName('page', '404')}
    >
      <h1 className="ui-title">404</h1>
      <p className="ui-lede">
        That page does not exist. <a href="/">Go home</a>.
      </p>
    </PageShell>
  )
}
