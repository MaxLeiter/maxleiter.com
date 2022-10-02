import ProjectList from '@components/projects'
import getProjects from '@lib/projects'
import { experimental_use as use } from 'react'

export const fetchProjects = async () => {
  const projects = await getProjects()
  return projects
}

const Projects = () => {
  const projects = use(fetchProjects())
  return (
    <ProjectList showYears={true} count={projects.length} projects={projects} />
  )
}

export default Projects
