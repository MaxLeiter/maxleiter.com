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
    <span className='block max-w-3xl'>
      <ProjectList showYears={true} projects={projects} seeMore={false} />
    </span>
  )
}

export default Projects
