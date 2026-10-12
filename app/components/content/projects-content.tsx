import { Row, Rows } from '@components/blades/blade-page'
import type { ProjectCard } from '@lib/types'

interface ProjectsContentProps {
  projects: ProjectCard[]
}

/** `blog/MSHW0184` is relative in the project list; a row's href is rooted. */
const rooted = (href: string) =>
  /^https?:/.test(href) || href.startsWith('/') ? href : `/${href}`

export function ProjectsContent({ projects }: ProjectsContentProps) {
  return (
    <Rows>
      {projects.map((project) => {
        const href = rooted(project.link)
        return (
          <Row
            key={project.id}
            href={href}
            title={project.name}
            desc={project.description}
            tags={project.tech}
            icon="project"
            external={/^https?:/.test(href)}
          />
        )
      })}
    </Rows>
  )
}
