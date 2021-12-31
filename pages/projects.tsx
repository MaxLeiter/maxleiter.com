import Page from '@components/page'
import ProjectList from '@components/projects'
import getProjects from '@lib/projects'
import { Project } from '@lib/types'

type Props = {
  projects: Project[]
}

const Projects = ({ projects }: Props) => {
  return (
    <Page title="Projects" description="Most of my projects">
      <ProjectList projects={projects} />
    </Page>
  )
}

export const getStaticProps = async () => {
  const projects = await getProjects()
  return {
    props: {
      projects,
    },
  }
}

export default Projects
