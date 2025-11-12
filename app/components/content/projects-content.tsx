import { ListCard } from '@components/desktop/list-card'
import type { Project } from '@lib/portfolio-data'

interface ProjectsContentProps {
  projects: Project[]
}

export function ProjectsContent({ projects }: ProjectsContentProps) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-mono font-bold mb-8 text-white/90">
        projects/
      </h1>

      <ul className="space-y-2">
        {projects.map((project) => (
          <ListCard
            key={project.id}
            href={project.link}
            title={project.name}
            description={project.description}
            tags={project.tech}
            external
            icon={false}
          />
        ))}
      </ul>
    </div>
  )
}
