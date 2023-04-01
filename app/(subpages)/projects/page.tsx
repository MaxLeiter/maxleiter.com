import ProjectList from '@components/projects'
import { getProjects } from '@lib/projects'

export const metadata = {
  title: 'Projects',
  description: 'Most of my projects',
  alternates: {
    canonical: 'https://maxleiter.com/projects',
  },
}

const Projects = async () => {
  const projects = await getProjects()
  return (
    <ProjectList showYears={true} count={projects.length} projects={projects} />
  )
}

export default Projects
