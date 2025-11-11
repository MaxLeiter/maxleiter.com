import { ListCard } from '@components/desktop/list-card'
import { getProjectsData } from '@lib/portfolio-data'
import { WindowToolbar } from '@components/desktop/window-toolbar'
import { ViewTransitionWrapper } from '@components/view-transition-wrapper'

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
          <div className="max-w-3xl">
          <h1 className="text-3xl font-mono font-bold mb-8 text-white/90">projects/</h1>

          <div className="space-y-2">
            {projects.map((project) => (
              <ListCard
                key={project.id}
                href={project.link}
                title={project.name}
                description={project.description}
                tags={project.tech}
                external
                icon="folder"
              />
            ))}
          </div>
          </div>
        </ViewTransitionWrapper>
      </div>
    </div>
  )
}
