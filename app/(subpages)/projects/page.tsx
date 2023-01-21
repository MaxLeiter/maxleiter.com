import ProjectList from '@components/projects'
import { getProjects } from '@lib/projects'

const fetchProjects = () => {
  const projects = getProjects()
  return projects
}

const Projects = async () => {
  const projects = fetchProjects()
  return (
    <ProjectList showYears={true} count={projects.length} projects={projects} />
  )
}

export default Projects
