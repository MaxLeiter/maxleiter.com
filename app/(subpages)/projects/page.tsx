import { getProjectsData } from '@lib/portfolio-data'
import { WindowToolbar } from '@components/desktop/window-toolbar'
import { ViewTransitionWrapper } from '@components/view-transition-wrapper'
import { ProjectsContent } from '@components/content/projects-content'

export const metadata = {
  title: 'Projects',
  description: 'Most of my projects',
  alternates: {
    canonical: 'https://maxleiter.com/projects',
  },
}

export default async function ProjectsPage() {
  const projects = await getProjectsData()

  return (
    <div className="min-h-screen bg-black text-white/90 flex flex-col">
      <WindowToolbar
        title="projects"
        segments={[{ name: 'projects', href: '/projects' }]}
      />

      <div className="flex-1 overflow-auto p-6">
        <ViewTransitionWrapper name="page-projects">
          <ProjectsContent projects={projects} />
        </ViewTransitionWrapper>
      </div>
    </div>
  )
}
