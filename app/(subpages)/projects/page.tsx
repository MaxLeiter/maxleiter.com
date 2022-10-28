import ProjectList from '@components/projects'
import getProjects from '@lib/projects'

export const fetchProjects = async () => {
  const projects = await getProjects()
  return projects
}

const Projects = async () => {
  const projects = await fetchProjects()
  return (
    <ProjectList showYears={true} count={projects.length} projects={projects} />
  )
}

export default Projects
export const config = { runtime: 'experimental-edge' }
