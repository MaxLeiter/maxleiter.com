import { TileGrid } from '@components/lists'
import type { ProjectCard } from '@lib/types'

interface ProjectsContentProps {
  projects: ProjectCard[]
}

export function ProjectsContent({ projects }: ProjectsContentProps) {
  return (
    <>
      <h1 className="ui-title">Projects</h1>
      <p className="ui-lede">Things I made, maintain, or helped start.</p>
      <TileGrid
        items={projects.map((project) => ({
          href: project.link,
          title: project.name,
          seed: `project:${project.id}`,
          meta: `Project  ·  ${project.tech.join(' – ')}`.toUpperCase(),
          chip: 'Project',
          desc: project.description,
          tags: project.tech,
          external: /^https?:/.test(project.link),
        }))}
      />
    </>
  )
}
