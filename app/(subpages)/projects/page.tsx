import ProjectList from '@components/projects'
import { ProjectsTimeline } from '@components/timeline/timeline'
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
  projects.sort((a, b) => parseInt(b.years[0]) - parseInt(a.years[0]))

  return (
    <ProjectsTimeline  projects={projects}  />
  )
}

export default Projects
